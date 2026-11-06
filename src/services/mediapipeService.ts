/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { FramePoseData, KickingFoot, Landmark, VideoAngleType } from '../types';
import { extractJointAngles, POSE_LANDMARKS } from '../utils/poseCalculations';

export interface ProgressCallback {
  (progressPercent: number, statusMessage: string): void;
}

export class MediaPipeService {
  private static instance: MediaPipeService | null = null;
  private landmarker: PoseLandmarker | null = null;
  private isLoading = false;
  private initError: string | null = null;

  public static getInstance(): MediaPipeService {
    if (!MediaPipeService.instance) {
      MediaPipeService.instance = new MediaPipeService();
    }
    return MediaPipeService.instance;
  }

  public isReady(): boolean {
    return this.landmarker !== null;
  }

  public getInitError(): string | null {
    return this.initError;
  }

  /**
   * MediaPipe PoseLandmarker を初期化（タイムアウトとフォールバック付き）
   */
  public async initialize(onProgress?: (msg: string) => void): Promise<PoseLandmarker> {
    if (this.landmarker) return this.landmarker;
    if (this.isLoading) {
      // 既存の読み込みを待つ
      let tries = 0;
      while (this.isLoading && tries < 40) {
        await new Promise((r) => setTimeout(r, 250));
        tries++;
      }
      if (this.landmarker) return this.landmarker;
    }

    this.isLoading = true;
    this.initError = null;

    const timeoutMs = 25000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'MediaPipeの初期化がタイムアウト（25秒）しました。ネットワーク接続を確認し、再読込をお試しください。'
          )
        );
      }, timeoutMs);
    });

    try {
      const initTask = (async () => {
        onProgress?.('MediaPipe AIエンジン（WASM）を取得中...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        onProgress?.('ポーズ推定モデルをロード中...');
        // iPadやモバイルSafariのGPUクラッシュを防ぐため、GPUで試行し失敗したらCPUへフォールバック
        let landmarkerInstance: PoseLandmarker;
        try {
          landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuError) {
          console.warn('GPU初期化に失敗したため、CPUモードへ切り替えます:', gpuError);
          onProgress?.('GPUの代わりにCPUモードで初期化中...');
          landmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        return landmarkerInstance;
      })();

      this.landmarker = await Promise.race([initTask, timeoutPromise]);
      onProgress?.('AIエンジンの準備が完了しました');
      return this.landmarker;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'MediaPipeのロード中に予期せぬエラーが発生しました。';
      this.initError = errorMsg;
      console.error('MediaPipe initialization failed:', err);
      throw new Error(errorMsg);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 単一のビデオフレームからランドマークを検出
   */
  public detectFrame(video: HTMLVideoElement, timestampMs: number): Landmark[] | null {
    if (!this.landmarker) return null;
    try {
      const result = this.landmarker.detectForVideo(video, Math.max(0, Math.round(timestampMs)));
      if (result.landmarks && result.landmarks.length > 0 && result.landmarks[0].length >= 33) {
        return result.landmarks[0].map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
        }));
      }
    } catch (e) {
      console.warn('Frame detection failed for timestamp', timestampMs, e);
    }
    return null;
  }

  /**
   * 動画を粗く解析して候補区間を探し、その前後を細かく解析（Coarse-to-fine 解析）
   */
  public async analyzeVideoCoarseToFine(
    videoElement: HTMLVideoElement,
    kickingFoot: KickingFoot,
    viewType: VideoAngleType,
    fps: number,
    onProgress?: ProgressCallback
  ): Promise<{
    frames: FramePoseData[];
    candidateTouchTime: number;
    warningNotice?: string;
  }> {
    const landmarker = await this.initialize((msg) => onProgress?.(5, msg));

    const originalDuration = videoElement.duration;
    if (!originalDuration || isNaN(originalDuration) || originalDuration <= 0) {
      throw new Error('動画の再生時間を取得できませんでした。動画ファイルが破損していないか確認してください。');
    }

    // 動画が長い場合の負荷軽減：上限15秒
    const MAX_ANALYSIS_SECONDS = 15;
    const analyzeDuration = Math.min(originalDuration, MAX_ANALYSIS_SECONDS);
    let warningNotice: string | undefined;
    if (originalDuration > MAX_ANALYSIS_SECONDS) {
      warningNotice = `動画の長さが${originalDuration.toFixed(1)}秒あるため、端末負荷と解析時間を考慮し先頭${MAX_ANALYSIS_SECONDS}秒間を解析対象としました。`;
    }

    onProgress?.(10, 'ステップ1/2: 動作候補区間を探索中（粗解析）...');

    // 粗解析: 0.15秒〜0.20秒間隔でサンプリング
    const coarseStep = 0.18;
    const coarseTimestamps: number[] = [];
    for (let t = 0; t <= analyzeDuration; t += coarseStep) {
      coarseTimestamps.push(t);
    }

    const frameMap = new Map<number, FramePoseData>();

    // 補助関数：指定時刻へシークしランドマークを検出
    const seekAndDetect = async (timeSec: number): Promise<FramePoseData> => {
      const clampedTime = Math.max(0, Math.min(analyzeDuration, timeSec));
      await new Promise<void>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout>;
        const onSeeked = () => {
          clearTimeout(timer);
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          clearTimeout(timer);
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          reject(new Error(`動画のシークに失敗しました（時刻: ${clampedTime.toFixed(2)}秒）`));
        };
        timer = setTimeout(() => {
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          // タイムアウトしても処理を止めずそのまま進める
          resolve();
        }, 1500);

        videoElement.addEventListener('seeked', onSeeked, { once: true });
        videoElement.addEventListener('error', onError, { once: true });
        videoElement.currentTime = clampedTime;
      });

      const timeMs = Math.round(clampedTime * 1000);
      let landmarks: Landmark[] | undefined;
      try {
        const result = landmarker.detectForVideo(videoElement, timeMs);
        if (result.landmarks && result.landmarks.length > 0 && result.landmarks[0].length >= 33) {
          landmarks = result.landmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));
        }
      } catch (e) {
        console.warn('Frame detection skipped at', clampedTime, e);
      }

      const angles = extractJointAngles(landmarks, kickingFoot, viewType);
      const frameIndex = Math.round(clampedTime * fps);

      return {
        timestamp: clampedTime,
        frameIndex,
        landmarks,
        angles,
      };
    };

    // 粗解析実行
    for (let i = 0; i < coarseTimestamps.length; i++) {
      const t = coarseTimestamps[i];
      const frameData = await seekAndDetect(t);
      frameMap.set(Math.round(t * 100) / 100, frameData);

      const percent = 10 + Math.round((i / coarseTimestamps.length) * 40);
      onProgress?.(percent, `探索中 (${(i + 1)}/${coarseTimestamps.length} コマ)...`);
    }

    // 候補区間の探索：蹴り足の足首または膝の動きからトラップのインパクト候補時刻を推定
    // 速度急変点、あるいは最も低位置/前方に達した点を探索
    const sortedCoarse = Array.from(frameMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    let bestCandidateTime = analyzeDuration * 0.45; // デフォルトは前半中盤
    let maxMotionScore = -1;

    const isRight = kickingFoot === 'right';
    const kickAnkleIdx = isRight ? POSE_LANDMARKS.RIGHT_ANKLE : POSE_LANDMARKS.LEFT_ANKLE;
    const kickKneeIdx = isRight ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE;

    for (let i = 1; i < sortedCoarse.length - 1; i++) {
      const prev = sortedCoarse[i - 1].landmarks;
      const curr = sortedCoarse[i].landmarks;
      const next = sortedCoarse[i + 1].landmarks;

      if (!curr || !prev || !next) continue;
      const pAnkle = prev[kickAnkleIdx];
      const cAnkle = curr[kickAnkleIdx];
      const nAnkle = next[kickAnkleIdx];
      const cKnee = curr[kickKneeIdx];

      if (!pAnkle || !cAnkle || !nAnkle || !cKnee) continue;

      // 速度変化（加速度）と膝の屈曲度を組み合わせた候補スコア
      const v1x = cAnkle.x - pAnkle.x;
      const v1y = cAnkle.y - pAnkle.y;
      const v2x = nAnkle.x - cAnkle.x;
      const v2y = nAnkle.y - cAnkle.y;
      const accel = Math.hypot(v2x - v1x, v2y - v1y);

      // トラップの瞬間はボールを迎えに行って止めるため、足首の加速度変化や屈曲が発生しやすい
      const kneeAngle = sortedCoarse[i].angles.kickingKneeAngle ?? 140;
      const flexBonus = kneeAngle >= 120 && kneeAngle <= 165 ? 1.3 : 1.0;

      const score = accel * flexBonus;
      if (score > maxMotionScore) {
        maxMotionScore = score;
        bestCandidateTime = sortedCoarse[i].timestamp;
      }
    }

    // 詳細解析: 候補時刻の前後 ±1.2秒 を細かくサンプリング (フレームレートに応じたステップ)
    onProgress?.(55, `ステップ2/2: インパクト周辺 (${bestCandidateTime.toFixed(2)}秒付近) を精密解析中...`);

    const fineWindowStart = Math.max(0, bestCandidateTime - 1.2);
    const fineWindowEnd = Math.min(analyzeDuration, bestCandidateTime + 1.2);

    // 細かいステップ: 約 0.033〜0.05秒 (20〜30fps相当)
    const fineStep = Math.max(1 / fps, 0.033);
    const fineTimestamps: number[] = [];
    for (let t = fineWindowStart; t <= fineWindowEnd; t += fineStep) {
      fineTimestamps.push(t);
    }

    for (let i = 0; i < fineTimestamps.length; i++) {
      const t = fineTimestamps[i];
      const key = Math.round(t * 100) / 100;
      if (!frameMap.has(key)) {
        const frameData = await seekAndDetect(t);
        frameMap.set(key, frameData);
      }
      const percent = 55 + Math.round((i / fineTimestamps.length) * 40);
      onProgress?.(percent, `精密解析中 (${(i + 1)}/${fineTimestamps.length} コマ)...`);
    }

    // 全フレームをタイムスタンプ順に整列
    const allFrames = Array.from(frameMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    onProgress?.(100, '解析完了');

    return {
      frames: allFrames,
      candidateTouchTime: Math.round(bestCandidateTime * 100) / 100,
      warningNotice,
    };
  }

  /**
   * 解放処理
   */
  public close(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {
        console.warn('Error closing PoseLandmarker:', e);
      }
      this.landmarker = null;
    }
  }
}
