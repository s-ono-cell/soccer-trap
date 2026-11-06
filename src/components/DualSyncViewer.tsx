/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  FramePoseData,
  KickingFoot,
  TrapPhaseKey,
  TRAP_PHASES,
  VideoAnalysisResult,
} from '../types';
import { VideoPlayerCanvas } from './VideoPlayerCanvas';
import { formatTime } from '../utils/videoUtils';

interface DualSyncViewerProps {
  sideResult: VideoAnalysisResult;
  rearResult: VideoAnalysisResult;
  kickingFoot: KickingFoot;
  highlightedPhase?: TrapPhaseKey | null;
  onSidePinPhase: (phaseKey: TrapPhaseKey, time: number) => void;
  onRearPinPhase: (phaseKey: TrapPhaseKey, time: number) => void;
}

export const DualSyncViewer: React.FC<DualSyncViewerProps> = ({
  sideResult,
  rearResult,
  kickingFoot,
  highlightedPhase,
  onSidePinPhase,
  onRearPinPhase,
}) => {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [masterRelativeTime, setMasterRelativeTime] = useState(0); // インパクトからの相対秒数 (-1.5s 〜 +1.5sなど)
  const [isPlayingSync, setIsPlayingSync] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // インパクト時刻
  const sideTouchTime = sideResult.pinnedPhases.touch;
  const rearTouchTime = rearResult.pinnedPhases.touch;
  const canSync = sideTouchTime !== null && rearTouchTime !== null;

  // 各動画の現在再生時刻
  const sideCurrentTime = canSync && syncEnabled
    ? Math.max(0, Math.min(sideResult.duration, sideTouchTime + masterRelativeTime))
    : sideTouchTime ?? 0;

  const rearCurrentTime = canSync && syncEnabled
    ? Math.max(0, Math.min(rearResult.duration, rearTouchTime + masterRelativeTime))
    : rearTouchTime ?? 0;

  // 同期再生ループ
  const lastTickRef = useRef<number>(0);
  useEffect(() => {
    let animId: number;
    if (isPlayingSync && canSync) {
      lastTickRef.current = performance.now();
      const tick = (now: number) => {
        const dt = ((now - lastTickRef.current) / 1000) * playbackSpeed;
        lastTickRef.current = now;

        setMasterRelativeTime((prev) => {
          const next = prev + dt;
          // 上限チェック
          const nextSideTime = (sideTouchTime ?? 0) + next;
          const nextRearTime = (rearTouchTime ?? 0) + next;
          if (nextSideTime >= sideResult.duration || nextRearTime >= rearResult.duration) {
            setIsPlayingSync(false);
            return prev;
          }
          return next;
        });

        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlayingSync, canSync, playbackSpeed, sideResult.duration, rearResult.duration, sideTouchTime, rearTouchTime]);

  const toggleSyncPlay = () => {
    setIsPlayingSync((prev) => !prev);
  };

  const stepSyncFrame = (deltaFrames: number) => {
    setIsPlayingSync(false);
    const avgFps = (sideResult.fps + rearResult.fps) / 2;
    const dt = deltaFrames / avgFps;
    setMasterRelativeTime((prev) => prev + dt);
  };

  return (
    <div className="tech-card p-5 space-y-5">
      {/* 同期ビューヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <span className="label-mono block">[ 2画面同期 // インパクト基準 ]</span>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="font-syne font-bold text-base sm:text-lg text-[#f2f2f2]">
              真横 × 後ろ インパクト同期比較ビュー
            </h3>
            <span className="font-mono-tech text-[10px] bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">
              2画面同期
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            両方の動画で「③ インパクト（ファーストタッチ）」を基準にして、完全に同一のタイミングで同期再生します。
          </p>
        </div>

        {/* 同期ステータス */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 border border-white/10 transition-colors font-mono-tech">
            <input
              type="checkbox"
              checked={syncEnabled}
              disabled={!canSync}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="w-4 h-4 rounded-none text-[#00ff88] focus:ring-[#00ff88] accent-[#00ff88]"
            />
            <span className="text-xs text-zinc-200">インパクトで同期</span>
          </label>
        </div>
      </div>

      {/* インパクト未設定警告 */}
      {!canSync && (
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-2.5 font-mono-tech">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-amber-300">
              【同期条件】両方の動画で「③ インパクト」のピン留めが必要です。
            </span>
            <p className="text-amber-200 text-xs">
              真横動画: {sideTouchTime !== null ? `✓ 設定済 (${sideTouchTime.toFixed(2)}秒)` : '未設定'} / 後ろ動画:{' '}
              {rearTouchTime !== null ? `✓ 設定済 (${rearTouchTime.toFixed(2)}秒)` : '未設定'}
            </p>
          </div>
        </div>
      )}

      {/* 2画面動画プレイヤーグリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 真横動画 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1 font-mono-tech text-zinc-300">
            <span className="font-bold text-[#00ff88]">カメラ01 // 真横（膝・股関節クッション）</span>
            <span className="text-zinc-400 tabular-nums">
              {formatTime(sideCurrentTime)}
            </span>
          </div>
          <VideoPlayerCanvas
            videoUrl={sideResult.videoUrl}
            fps={sideResult.fps}
            duration={sideResult.duration}
            frames={sideResult.frames}
            kickingFoot={kickingFoot}
            viewType="side"
            pinnedPhases={sideResult.pinnedPhases}
            seekTime={syncEnabled && canSync ? sideCurrentTime : null}
            highlightedPhase={highlightedPhase}
            title="真横動画（Side View）"
          />
        </div>

        {/* 後ろ動画 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1 font-mono-tech text-zinc-300">
            <span className="font-bold text-cyan-400">カメラ02 // 後ろ（体幹左右バランス・傾き）</span>
            <span className="text-zinc-400 tabular-nums">
              {formatTime(rearCurrentTime)}
            </span>
          </div>
          <VideoPlayerCanvas
            videoUrl={rearResult.videoUrl}
            fps={rearResult.fps}
            duration={rearResult.duration}
            frames={rearResult.frames}
            kickingFoot={kickingFoot}
            viewType="rear"
            pinnedPhases={rearResult.pinnedPhases}
            seekTime={syncEnabled && canSync ? rearCurrentTime : null}
            highlightedPhase={highlightedPhase}
            title="後ろ動画（Rear View）"
          />
        </div>
      </div>

      {/* 統合同期コントロールバー */}
      {canSync && syncEnabled && (
        <div className="p-3.5 bg-zinc-950 border border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono-tech">
          {/* 同期再生 & コマ送り */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepSyncFrame(-1)}
              className="min-h-[38px] min-w-[48px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
              title="両方の動画を同時に1フレーム戻す"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              -1F
            </button>

            <button
              onClick={toggleSyncPlay}
              className="min-h-[38px] min-w-[70px] px-4 py-2 bg-[#00ff88] hover:bg-[#00e67a] active:scale-95 text-[#111113] font-bold shadow-md transition-all flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer"
            >
              {isPlayingSync ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>同期停止</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>同期再生</span>
                </>
              )}
            </button>

            <button
              onClick={() => stepSyncFrame(1)}
              className="min-h-[38px] min-w-[48px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
              title="両方の動画を同時に1フレーム進める"
            >
              +1F
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={() => {
                setIsPlayingSync(false);
                setMasterRelativeTime(0);
              }}
              className="min-h-[38px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-[#00ff88] text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="インパクト（0.00s）にジャンプ"
            >
              <Sparkles className="w-3.5 h-3.5" />
              0.00s
            </button>
          </div>

          {/* 相対タイムコードスライダー */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-mono-tech tabular-nums whitespace-nowrap">
              Δt: {masterRelativeTime >= 0 ? `+${masterRelativeTime.toFixed(2)}` : masterRelativeTime.toFixed(2)}s
            </span>
            <input
              type="range"
              min={-1.5}
              max={1.5}
              step={0.02}
              value={masterRelativeTime}
              onChange={(e) => {
                setIsPlayingSync(false);
                setMasterRelativeTime(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-zinc-800 rounded-none appearance-none cursor-pointer accent-[#00ff88]"
            />
          </div>

          {/* 速度切り替え */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 border border-white/10">
            {[0.25, 0.5, 1.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackSpeed(rate)}
                className={`min-h-[30px] px-2 py-0.5 text-xs font-bold transition-colors cursor-pointer ${
                  playbackSpeed === rate
                    ? 'bg-[#00ff88] text-[#111113]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {rate === 1.0 ? '1.0X' : `${rate}X`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
