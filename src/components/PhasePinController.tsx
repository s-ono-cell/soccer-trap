/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bookmark, Check, ArrowRight, RotateCcw, Lightbulb } from 'lucide-react';
import { TrapPhaseKey, TRAP_PHASES } from '../types';
import { formatTimeWithFrame } from '../utils/videoUtils';

interface PhasePinControllerProps {
  currentTime: number;
  fps: number;
  pinnedPhases: Record<TrapPhaseKey, number | null>;
  candidateTouchTime?: number;
  onPinPhase: (phaseKey: TrapPhaseKey, time: number) => void;
  onClearPhase: (phaseKey: TrapPhaseKey) => void;
  onJumpToTime: (time: number) => void;
  title?: string;
}

export const PhasePinController: React.FC<PhasePinControllerProps> = ({
  currentTime,
  fps,
  pinnedPhases,
  candidateTouchTime,
  onPinPhase,
  onClearPhase,
  onJumpToTime,
  title = '4局面のピン止め',
}) => {
  const pinnedCount = Object.values(pinnedPhases).filter((v) => v !== null).length;

  return (
    <div className="tech-card p-5 space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div>
          <span className="label-mono block">[ 4局面ピン留め登録 ]</span>
          <h3 className="font-syne font-bold text-[#f2f2f2] text-base flex items-center gap-2 mt-0.5">
            <Bookmark className="w-4 h-4 text-[#00ff88]" />
            {title}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            動画をコマ送りして各瞬間に合わせ、「このコマをピン留め」を押してください。
          </p>
        </div>

        {/* ピン止め進捗バッジ */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-white/10 text-xs font-mono-tech text-zinc-300">
          <span className="text-zinc-400">ピン留め済:</span>
          <span className="text-[#00ff88] font-bold tabular-nums">{pinnedCount} / 4</span>
        </div>
      </div>

      {/* 4局面カードグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TRAP_PHASES.map((phase) => {
          const pinTime = pinnedPhases[phase.key];
          const isPinned = pinTime !== null && pinTime !== undefined;
          const isAtCurrentTime = isPinned && Math.abs(pinTime - currentTime) <= 0.05;

          return (
            <div
              key={phase.key}
              className={`tech-card p-3.5 transition-all flex flex-col justify-between ${
                isPinned
                  ? 'active border-[#00ff88]/40 bg-zinc-950/80'
                  : 'border-white/10 bg-[#161619] hover:border-white/20'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono-tech text-[10px] font-bold px-1.5 py-0.5 border ${
                        phase.key === 'touch'
                          ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/10'
                          : 'border-white/20 text-zinc-300 bg-zinc-900'
                      }`}
                    >
                      局面 0{phase.stepNumber}
                    </span>
                    <h4 className="font-syne font-bold text-xs sm:text-sm text-[#f2f2f2]">{phase.name}</h4>
                  </div>

                  {isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech font-bold text-[#00ff88] bg-[#00ff88]/15 border border-[#00ff88]/30 px-1.5 py-0.5 rounded-none">
                      <Check className="w-3 h-3" />
                      ピン留め済
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-snug">
                  {phase.description}
                </p>

                {/* ピン止め時刻の表示 */}
                <div className="text-xs font-mono-tech text-zinc-300 bg-black/60 border border-white/10 px-2.5 py-1 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase">記録時刻:</span>
                  <span className="font-bold text-[#f2f2f2] tabular-nums">
                    {isPinned ? formatTimeWithFrame(pinTime, fps) : '未設定'}
                  </span>
                </div>
              </div>

              {/* アクションボタングループ */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2 font-mono-tech">
                {/* 現在フレームをピン止めボタン */}
                <button
                  onClick={() => onPinPhase(phase.key, currentTime)}
                  className={`flex-1 min-h-[38px] px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 tracking-wider uppercase cursor-pointer ${
                    isPinned
                      ? 'bg-[#00ff88] hover:bg-[#00e67a] text-[#111113]'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-white/15 hover:border-[#00ff88]/50'
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  <span>
                    {isPinned ? 'ピン位置を更新' : 'このコマをピン留め'}
                  </span>
                </button>

                {/* ジャンプボタン */}
                {isPinned && !isAtCurrentTime && (
                  <button
                    onClick={() => onJumpToTime(pinTime)}
                    className="min-h-[38px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-300 hover:text-white text-xs transition-colors flex items-center justify-center cursor-pointer"
                    title="このピン位置に動画を移動"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    移動
                  </button>
                )}

                {/* 解除ボタン */}
                {isPinned && (
                  <button
                    onClick={() => onClearPhase(phase.key)}
                    className="min-h-[38px] min-w-[36px] p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition-colors flex items-center justify-center cursor-pointer"
                    title="ピン留めをクリア"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* インパクト局面でAI候補がある場合のヒント */}
              {phase.key === 'touch' && !isPinned && candidateTouchTime !== undefined && (
                <div className="mt-2 flex items-center justify-between p-2 bg-[#00ff88]/10 border border-[#00ff88]/25 text-[11px] font-mono-tech text-zinc-300">
                  <div className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-[#00ff88] shrink-0" />
                    <span>AI推定候補: {candidateTouchTime.toFixed(2)}s</span>
                  </div>
                  <button
                    onClick={() => {
                      onJumpToTime(candidateTouchTime);
                      onPinPhase(phase.key, candidateTouchTime);
                    }}
                    className="text-[#00ff88] font-bold hover:underline cursor-pointer"
                  >
                    この時刻を適用
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
