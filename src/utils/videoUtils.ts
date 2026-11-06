/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoMetadataResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  isEstimatedFps: boolean;
}

/**
 * 動画のフレームレートを実測（失敗した場合は妥当な代替値 30fps で続行）
 */
export async function detectVideoFps(video: HTMLVideoElement): Promise<{ fps: number; isEstimated: boolean }> {
  // requestVideoFrameCallback をサポートしているか確認
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    try {
      const prevMuted = video.muted;
      const prevPlaybackRate = video.playbackRate;
      video.muted = true;
      video.playbackRate = 1.0;

      const mediaTimes: number[] = [];
      const MAX_SAMPLES = 8;

      const measurementPromise = new Promise<{ fps: number; isEstimated: boolean }>((resolve) => {
        let callbackHandle: number;
        let timeoutHandle: ReturnType<typeof setTimeout>;

        const cleanup = () => {
          video.pause();
          video.muted = prevMuted;
          video.playbackRate = prevPlaybackRate;
          clearTimeout(timeoutHandle);
        };

        const frameCallback = (_now: number, metadata: VideoFrameCallbackMetadata) => {
          mediaTimes.push(metadata.mediaTime);
          if (mediaTimes.length >= MAX_SAMPLES) {
            cleanup();
            // 計算
            const deltas: number[] = [];
            for (let i = 1; i < mediaTimes.length; i++) {
              const dt = mediaTimes[i] - mediaTimes[i - 1];
              if (dt > 0.001 && dt < 0.2) {
                deltas.push(dt);
              }
            }
            if (deltas.length >= 4) {
              const avgDt = deltas.reduce((a, b) => a + b, 0) / deltas.length;
              let measuredFps = 1 / avgDt;

              // 一般的な規格値にスナップ
              if (Math.abs(measuredFps - 24) < 1.5) measuredFps = 24;
              else if (Math.abs(measuredFps - 30) < 2) measuredFps = 30;
              else if (Math.abs(measuredFps - 60) < 3) measuredFps = 60;
              else if (Math.abs(measuredFps - 120) < 6) measuredFps = 120;
              else if (Math.abs(measuredFps - 240) < 10) measuredFps = 240;

              measuredFps = Math.round(measuredFps * 10) / 10;
              if (measuredFps >= 15 && measuredFps <= 250) {
                return resolve({ fps: measuredFps, isEstimated: false });
              }
            }
            return resolve({ fps: 30.0, isEstimated: true });
          }
          // 次のフレーム待機
          callbackHandle = (video as unknown as { requestVideoFrameCallback: (cb: typeof frameCallback) => number }).requestVideoFrameCallback(frameCallback);
        };

        timeoutHandle = setTimeout(() => {
          cleanup();
          resolve({ fps: 30.0, isEstimated: true });
        }, 1000);

        // 再生開始してフレーム収集
        video.play().then(() => {
          callbackHandle = (video as unknown as { requestVideoFrameCallback: (cb: typeof frameCallback) => number }).requestVideoFrameCallback(frameCallback);
        }).catch(() => {
          cleanup();
          resolve({ fps: 30.0, isEstimated: true });
        });
      });

      return await measurementPromise;
    } catch {
      return { fps: 30.0, isEstimated: true };
    }
  }

  // 代替値
  return { fps: 30.0, isEstimated: true };
}

/**
 * 動画メタデータをロード
 */
export async function loadVideoMetadata(fileOrUrl: File | string): Promise<{
  url: string;
  metadata: VideoMetadataResult;
  videoElement: HTMLVideoElement;
}> {
  const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('動画の読み込みがタイムアウトしました。動画ファイルが対応形式（MP4/WebM/MOV）か確認してください。'));
    }, 15000);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timer);
      reject(new Error('動画の読み込みに失敗しました。ファイルが破損しているか、ブラウザ未対応のコーデックの可能性があります。'));
    };
  });

  const { fps, isEstimated } = await detectVideoFps(video);

  return {
    url,
    videoElement: video,
    metadata: {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      fps,
      isEstimatedFps: isEstimated,
    },
  };
}

/**
 * 時刻（秒）を 分:秒.ミリ秒 または 秒表記にフォーマット
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0.00s';
  const s = Math.floor(seconds);
  const ms = Math.floor((seconds - s) * 100);
  return `${s}.${ms.toString().padStart(2, '0')}s`;
}

/**
 * フレーム番号付き時刻表記
 */
export function formatTimeWithFrame(seconds: number, fps: number): string {
  const frame = Math.round(seconds * fps);
  return `${formatTime(seconds)} (第${frame}F)`;
}
