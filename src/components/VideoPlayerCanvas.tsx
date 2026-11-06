/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  FramePoseData,
  KickingFoot,
  Landmark,
  TrapPhaseKey,
  TRAP_PHASES,
  VideoAngleType,
} from '../types';
import {
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
} from '../utils/poseCalculations';
import { formatTime, formatTimeWithFrame } from '../utils/videoUtils';

interface VideoPlayerCanvasProps {
  videoUrl: string;
  fps: number;
  duration: number;
  frames: FramePoseData[];
  kickingFoot: KickingFoot;
  viewType: VideoAngleType;
  pinnedPhases: Record<TrapPhaseKey, number | null>;
  onTimeUpdate?: (time: number) => void;
  currentTime?: number;
  seekTime?: number | null;
  onSeekHandled?: () => void;
  highlightedPhase?: TrapPhaseKey | null;
  title: string;
}

export const VideoPlayerCanvas: React.FC<VideoPlayerCanvasProps> = ({
  videoUrl,
  fps,
  duration,
  frames,
  kickingFoot,
  viewType,
  pinnedPhases,
  onTimeUpdate,
  seekTime,
  onSeekHandled,
  highlightedPhase,
  title,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngleArcs, setShowAngleArcs] = useState(true);

  // 指定時刻への外部シーク要求を処理
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && videoRef.current) {
      const clamped = Math.max(0, Math.min(duration, seekTime));
      videoRef.current.currentTime = clamped;
      setCurrentTimeState(clamped);
      onSeekHandled?.();
    }
  }, [seekTime, duration, onSeekHandled]);

  // 再生速度の適用
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // 現在時刻に最も近い解析フレームを取得
  const currentFrameData = React.useMemo(() => {
    if (!frames || frames.length === 0) return null;
    let closest = frames[0];
    let minDiff = Math.abs(frames[0].timestamp - currentTimeState);
    for (let i = 1; i < frames.length; i++) {
      const diff = Math.abs(frames[i].timestamp - currentTimeState);
      if (diff < minDiff) {
        minDiff = diff;
        closest = frames[i];
      }
    }
    // 0.25秒以上離れていたらポーズは描画しない（未解析区間）
    return minDiff <= 0.25 ? closest : null;
  }, [frames, currentTimeState]);

  // Canvas描画
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    // 1. 動画フレームを描画
    ctx.drawImage(video, 0, 0, vw, vh);

    // 2. 骨格と関節を描画
    if (showSkeleton && currentFrameData && currentFrameData.landmarks) {
      const lm = currentFrameData.landmarks;
      const isRight = kickingFoot === 'right';

      // 骨格接続線の描画（参考画像に合わせたシアンカラー）
      ctx.lineWidth = Math.max(3, Math.round(vw / 180));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#00e5ff'; // 鮮明なシアン

      for (const [idxA, idxB] of POSE_CONNECTIONS) {
        const pA = lm[idxA];
        const pB = lm[idxB];
        if (!pA || !pB) continue;
        if ((pA.visibility ?? 1) < 0.25 || (pB.visibility ?? 1) < 0.25) continue;

        ctx.beginPath();
        ctx.moveTo(pA.x * vw, pA.y * vh);
        ctx.lineTo(pB.x * vw, pB.y * vh);
        ctx.stroke();
      }

      // 関節ポイントの描画（参考画像に合わせたイエロードット）
      const jointRadius = Math.max(4, Math.round(vw / 120));
      for (let i = 0; i < lm.length; i++) {
        if (i >= 1 && i <= 10) continue; // 目や耳などの細部は省略してシンプルに
        const p = lm[i];
        if (!p || (p.visibility ?? 1) < 0.25) continue;

        ctx.beginPath();
        ctx.arc(p.x * vw, p.y * vh, jointRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047'; // 明るいイエロー
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 3. 角度ラベルと円弧の描画
      if (showAngleArcs) {
        ctx.font = `bold ${Math.max(12, Math.round(vw / 40))}px 'JetBrains Mono', sans-serif`;

        // トラップ足の膝角度（クッション吸収）
        const kickKneeIdx = isRight ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE;
        const kickKnee = lm[kickKneeIdx];
        if (kickKnee && currentFrameData.angles.kickingKneeAngle !== undefined) {
          drawAngleBadge(
            ctx,
            `トラップ膝 ${currentFrameData.angles.kickingKneeAngle}°`,
            kickKnee.x * vw + 10,
            kickKnee.y * vh,
            'rgba(239, 68, 68, 0.9)',
            '#ffffff',
            '#fca5a5'
          );
        }

        // 軸足の膝角度（土台・重心）
        const suppKneeIdx = isRight ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;
        const suppKnee = lm[suppKneeIdx];
        if (suppKnee && currentFrameData.angles.supportKneeAngle !== undefined) {
          drawAngleBadge(
            ctx,
            `軸足膝 ${currentFrameData.angles.supportKneeAngle}°`,
            suppKnee.x * vw - 75,
            suppKnee.y * vh,
            'rgba(245, 158, 11, 0.9)',
            '#ffffff',
            '#fde68a'
          );
        }

        // トラップ足の足首角度（面の固定）
        const kickAnkleIdx = isRight ? POSE_LANDMARKS.RIGHT_ANKLE : POSE_LANDMARKS.LEFT_ANKLE;
        const kickAnkle = lm[kickAnkleIdx];
        if (kickAnkle && currentFrameData.angles.kickingAnkleAngle !== undefined && viewType === 'side') {
          drawAngleBadge(
            ctx,
            `足首 ${currentFrameData.angles.kickingAnkleAngle}°`,
            kickAnkle.x * vw + 10,
            kickAnkle.y * vh + 15,
            'rgba(16, 185, 129, 0.9)',
            '#ffffff',
            '#a7f3d0'
          );
        }

        // 体幹前傾（side視点）
        if (viewType === 'side' && currentFrameData.angles.trunkForwardTilt !== undefined) {
          const midShoulderX =
            ((lm[POSE_LANDMARKS.LEFT_SHOULDER].x + lm[POSE_LANDMARKS.RIGHT_SHOULDER].x) / 2) * vw;
          const midShoulderY =
            ((lm[POSE_LANDMARKS.LEFT_SHOULDER].y + lm[POSE_LANDMARKS.RIGHT_SHOULDER].y) / 2) * vh;
          drawAngleBadge(
            ctx,
            `前傾 ${currentFrameData.angles.trunkForwardTilt}°`,
            midShoulderX - 25,
            midShoulderY - 18,
            'rgba(37, 99, 235, 0.9)',
            '#ffffff',
            '#bfdbfe'
          );
        }

        // 左右傾斜（rear視点）
        if (viewType === 'rear' && currentFrameData.angles.trunkLateralTilt !== undefined) {
          const midShoulderX =
            ((lm[POSE_LANDMARKS.LEFT_SHOULDER].x + lm[POSE_LANDMARKS.RIGHT_SHOULDER].x) / 2) * vw;
          const midShoulderY =
            ((lm[POSE_LANDMARKS.LEFT_SHOULDER].y + lm[POSE_LANDMARKS.RIGHT_SHOULDER].y) / 2) * vh;
          drawAngleBadge(
            ctx,
            `体幹左右 ${Math.abs(currentFrameData.angles.trunkLateralTilt)}°`,
            midShoulderX - 30,
            midShoulderY - 18,
            'rgba(147, 51, 234, 0.9)',
            '#ffffff',
            '#e9d5ff'
          );
        }
      }
    }
  }, [showSkeleton, showAngleArcs, currentFrameData, kickingFoot, viewType]);

  // アニメーションループ（再生中）
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      drawFrame();
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [drawFrame]);

  // ビデオのタイムアップデート処理
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTimeState(t);
    onTimeUpdate?.(t);
  };

  // 再生/一時停止
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  // コマ送り / コマ戻し（1フレーム = 1/fps）
  const stepFrame = (framesDelta: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const dt = framesDelta / fps;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + dt));
    videoRef.current.currentTime = newTime;
    setCurrentTimeState(newTime);
    onTimeUpdate?.(newTime);
  };

  // 微調整（0.05秒単位）
  const stepSeconds = (secondsDelta: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + secondsDelta));
    videoRef.current.currentTime = newTime;
    setCurrentTimeState(newTime);
    onTimeUpdate?.(newTime);
  };

  // スライダー操作
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.currentTime = val;
    setCurrentTimeState(val);
    onTimeUpdate?.(val);
  };

  // 現在時刻がピン止め局面に近いか判定
  const activePinnedPhase = React.useMemo(() => {
    for (const phase of TRAP_PHASES) {
      const pinTime = pinnedPhases[phase.key];
      if (pinTime !== null && Math.abs(pinTime - currentTimeState) <= 0.06) {
        return phase;
      }
    }
    return null;
  }, [pinnedPhases, currentTimeState]);

  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col shadow-xs">
      {/* 動画＋Canvas表示エリア */}
      <div className="relative bg-slate-950 flex items-center justify-center aspect-[4/3] sm:aspect-[16/10] overflow-hidden select-none">
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* 画面中央の再生状態アイコン（一時停止時） */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-14 h-14 bg-black/50 hover:bg-black/70 rounded-full text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95 cursor-pointer shadow-lg"
            aria-label="再生"
          >
            <Play className="w-6 h-6 ml-1 fill-current text-white" />
          </button>
        )}
      </div>

      {/* コントロール操作部（参考画像に準拠） */}
      <div className="p-4 sm:p-5 bg-white space-y-3">
        {/* 操作ボタン列: [ ◀ 1コマ ] [ ▶ 再生 ] [ 1コマ ▶ ] */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepFrame(-1)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded text-slate-800 text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            title="1コマ戻る"
          >
            <span>◀</span>
            <span>1コマ</span>
          </button>

          <button
            onClick={togglePlay}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded text-slate-900 text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            title={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current text-slate-800" />
                <span>停止</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>再生</span>
              </>
            )}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded text-slate-800 text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            title="1コマ進む"
          >
            <span>1コマ</span>
            <span>▶</span>
          </button>

          {/* 最初に戻る */}
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                setCurrentTimeState(0);
                onTimeUpdate?.(0);
              }
            }}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-300 rounded text-xs cursor-pointer ml-auto transition-colors"
            title="最初に戻る"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* シークバースライダー */}
        <div className="relative pt-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTimeState}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
          />
        </div>

        {/* 秒数とコマ数表示: e.g. 0.00 秒 (コマ 1/151) */}
        <div className="text-xs text-slate-600 font-medium tabular-nums">
          {currentTimeState.toFixed(2)} 秒 (コマ{' '}
          {Math.min(frames.length || 1, Math.max(1, Math.round(currentTimeState * fps) + 1))} /{' '}
          {Math.max(1, frames.length || Math.round(duration * fps))})
        </div>

        {/* トラップ重要4局面クイックジャンプボタン */}
        {pinnedPhases && (
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-0.5">
            <span className="text-[11px] text-slate-500 font-semibold shrink-0">重要局面:</span>
            {[
              { key: 'approach', label: '① 構え', tip: '重心・姿勢の準備' },
              { key: 'pre_touch', label: '② 直前', tip: '軸足の踏み込み' },
              { key: 'touch', label: '③ インパクト ⚽', tip: 'クッション吸収と面の固定' },
              { key: 'post_touch', label: '④ 次動作', tip: 'スムーズな体重移動' },
            ].map((phase) => {
              const time = pinnedPhases[phase.key as keyof typeof pinnedPhases];
              const isNear = time !== null && Math.abs(currentTimeState - time) < 0.08;
              return (
                <button
                  key={phase.key}
                  type="button"
                  onClick={() => {
                    if (time !== null && videoRef.current) {
                      videoRef.current.currentTime = time;
                      setCurrentTimeState(time);
                      onTimeUpdate?.(time);
                    }
                  }}
                  disabled={time === null}
                  title={time !== null ? `${phase.tip} (${time.toFixed(2)}秒)` : '未設定'}
                  className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors shrink-0 cursor-pointer ${
                    isNear
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : time !== null
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {phase.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 4つの主要角度カード（サッカートラップ解析特化） */}
        {viewType === 'side' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* 1. トラップ足の膝 (クッション吸収) */}
            <div className="bg-red-50/70 border border-red-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-red-800 font-bold truncate">
                トラップ足の膝 (クッション)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-red-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.kickingKneeAngle !== undefined
                  ? `${currentFrameData.angles.kickingKneeAngle}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-red-700/80 mt-0.5 truncate">
                引いて吸収 (目安: 125°〜150°)
              </span>
            </div>

            {/* 2. 軸足の膝 (重心・土台) */}
            <div className="bg-amber-50/70 border border-amber-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-amber-800 font-bold truncate">
                軸足の膝 (土台・重心)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.supportKneeAngle !== undefined
                  ? `${currentFrameData.angles.supportKneeAngle}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-amber-700/80 mt-0.5 truncate">
                曲げて安定 (目安: 140°〜160°)
              </span>
            </div>

            {/* 3. 体幹の前傾 (ボール抑え込み) */}
            <div className="bg-blue-50/70 border border-blue-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-blue-800 font-bold truncate">
                体幹の前傾 (抑え込み)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-blue-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.trunkForwardTilt !== undefined
                  ? `${currentFrameData.angles.trunkForwardTilt}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-blue-700/80 mt-0.5 truncate">
                胸をかぶせる (目安: 10°〜22°)
              </span>
            </div>

            {/* 4. トラップ足の足首 (面の固定) */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-emerald-800 font-bold truncate">
                トラップ足首 (面の固定)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.kickingAnkleAngle !== undefined
                  ? `${currentFrameData.angles.kickingAnkleAngle}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-emerald-700/80 mt-0.5 truncate">
                つま先上げ固定 (目安: 85°〜105°)
              </span>
            </div>
          </div>
        ) : (
          /* 後ろ動画（補助）の場合の4枚カード */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-purple-50/70 border border-purple-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-purple-800 font-bold truncate">
                体幹左右傾き (ブレ)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-purple-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.trunkLateralTilt !== undefined
                  ? `${Math.abs(currentFrameData.angles.trunkLateralTilt)}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-purple-700/80 mt-0.5 truncate">
                直立を維持 (目安: ±5°以内)
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-blue-800 font-bold truncate">
                骨盤の水平度 (腰)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-blue-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.pelvisTilt !== undefined
                  ? `${Math.abs(currentFrameData.angles.pelvisTilt)}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-blue-700/80 mt-0.5 truncate">
                水平維持 (目安: ±4°以内)
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-emerald-800 font-bold truncate">
                両肩の水平度 (脱力)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.shoulderTilt !== undefined
                  ? `${Math.abs(currentFrameData.angles.shoulderTilt)}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-emerald-700/80 mt-0.5 truncate">
                水平維持 (目安: ±4°以内)
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded p-2.5 sm:p-3 text-center">
              <span className="block text-[11px] sm:text-xs text-amber-800 font-bold truncate">
                軸足の膝 (踏ん張り)
              </span>
              <span className="block text-xl sm:text-2xl font-bold text-amber-600 mt-0.5 tabular-nums">
                {currentFrameData?.angles.supportKneeAngle !== undefined
                  ? `${currentFrameData.angles.supportKneeAngle}°`
                  : '---'}
              </span>
              <span className="block text-[10px] text-amber-700/80 mt-0.5 truncate">
                曲げて耐える (目安: 140°〜160°)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function drawAngleBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string,
  textColor: string,
  borderColor: string = '#ffffff'
) {
  ctx.save();
  const paddingX = 6;
  const paddingY = 3;
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const textH = 14;

  const bx = x - paddingX;
  const by = y - textH - paddingY;
  const bw = textW + paddingX * 2;
  const bh = textH + paddingY * 2;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(bx, by, bw, bh, 3);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - textH / 2);
  ctx.restore();
}
