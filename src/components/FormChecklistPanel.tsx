/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  JointAngles,
  KickingFoot,
  TrapPhaseKey,
  TRAP_PHASES,
  VideoAnalysisResult,
} from '../types';
import { evaluatePhaseAngles } from '../utils/poseCalculations';
import { formatTime } from '../utils/videoUtils';

interface FormChecklistPanelProps {
  sideResult: VideoAnalysisResult;
  rearResult: VideoAnalysisResult | null;
  kickingFoot: KickingFoot;
  selectedPhase: TrapPhaseKey;
  onSelectPhase: (phaseKey: TrapPhaseKey) => void;
  onJumpToPhaseTime: (source: 'side' | 'rear', time: number) => void;
}

export const FormChecklistPanel: React.FC<FormChecklistPanelProps> = ({
  sideResult,
  rearResult,
  kickingFoot,
  selectedPhase,
  onSelectPhase,
  onJumpToPhaseTime,
}) => {
  const currentPhaseInfo = TRAP_PHASES.find((p) => p.key === selectedPhase) || TRAP_PHASES[0];

  // 真横動画のピン止め時刻と該当フレーム
  const sidePinTime = sideResult.pinnedPhases[selectedPhase];
  const sideFrame = sidePinTime !== null ? findClosestFrame(sideResult.frames, sidePinTime) : null;

  // 後ろ動画のピン止め時刻と該当フレーム
  const rearPinTime = rearResult?.pinnedPhases[selectedPhase] ?? null;
  const rearFrame = rearPinTime !== null && rearResult ? findClosestFrame(rearResult.frames, rearPinTime) : null;

  // 評価リスト生成
  const sideEvaluations = sideFrame
    ? evaluatePhaseAngles(selectedPhase, sideFrame.angles, 'side')
    : [];
  const rearEvaluations = rearFrame
    ? evaluatePhaseAngles(selectedPhase, rearFrame.angles, 'rear')
    : [];

  return (
    <div className="tech-card p-5 space-y-5">
      {/* ヘッダー & 免責 */}
      <div className="space-y-2 pb-3 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="label-mono block">[ 診断レポート // 角度解析シート ]</span>
            <div className="flex items-center gap-2 mt-0.5">
              <ClipboardCheck className="w-5 h-5 text-[#00ff88]" />
              <h3 className="font-syne font-bold text-[#f2f2f2] text-base sm:text-lg">
                局面別 フォームチェックシート & 数値診断
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono-tech bg-zinc-900 border border-white/10 text-zinc-300 px-2.5 py-1">
            トラップ足: {kickingFoot === 'right' ? '右足 (右利き)' : '左足 (レフティ)'}
          </span>
        </div>

        {/* 免責メッセージ */}
        <p className="text-xs text-zinc-400 font-mono-tech leading-relaxed bg-black/60 p-2.5 border border-white/10">
          【ご注意】表示される角度・判定は単眼動画からの2次元推定骨格に基づく参考目安です。3D精密計測とは異なります。
        </p>
      </div>

      {/* 4局面切り替えタブ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-tech">
        {TRAP_PHASES.map((p) => {
          const isSelected = p.key === selectedPhase;
          const isSidePinned = sideResult.pinnedPhases[p.key] !== null;

          return (
            <button
              key={p.key}
              onClick={() => onSelectPhase(p.key)}
              className={`min-h-[50px] p-2.5 text-left border transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-[#00ff88] bg-[#00ff88]/10 text-white'
                  : 'border-white/10 bg-zinc-950 hover:bg-zinc-900 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 ${
                    isSelected ? 'bg-[#00ff88] text-[#111113]' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  局面 0{p.stepNumber}
                </span>
                {isSidePinned && (
                  <span className="w-1.5 h-1.5 bg-[#00ff88] shadow-[0_0_6px_#00ff88]" title="ピン止め済み" />
                )}
              </div>
              <span className="font-syne font-bold text-xs truncate mt-1 text-[#f2f2f2]">
                {p.shortName}
              </span>
            </button>
          );
        })}
      </div>

      {/* 選択中の局面説明 */}
      <div className="p-4 bg-black/60 border border-white/10 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-syne font-bold text-sm text-[#f2f2f2] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#00ff88]" />
            {currentPhaseInfo.name}
          </h4>
          {sidePinTime !== null && (
            <button
              onClick={() => onJumpToPhaseTime('side', sidePinTime)}
              className="text-xs font-mono-tech text-[#00ff88] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              動画をこの瞬間に合わせる ({formatTime(sidePinTime)})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-300">{currentPhaseInfo.description}</p>
        <div className="text-xs font-mono-tech text-[#00ff88]">
          着目ポイント: {currentPhaseInfo.focusPoint}
        </div>
      </div>

      {/* 診断メトリクスグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 真横動画のチェック項目 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono-tech">
            <h5 className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-none bg-[#00ff88]" />
              カメラ01 // 真横視点（膝・股関節・前傾）
            </h5>
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {sidePinTime !== null ? `ピン: ${formatTime(sidePinTime)}` : '未ピン留め'}
            </span>
          </div>

          {sideFrame ? (
            <div className="space-y-2.5">
              {sideEvaluations.map((item, idx) => (
                <MetricCard key={idx} item={item} />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-zinc-950 border border-dashed border-white/15 text-center space-y-2">
              <Info className="w-5 h-5 text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-400 font-mono-tech">
                [未ピン留め] この局面のフレームが未ピン留めです。
              </p>
              <p className="text-[11px] text-zinc-500">
                上のプレイヤーでコマ送りし、「このコマをピン留め」を押すと角度やアドバイスが表示されます。
              </p>
            </div>
          )}
        </div>

        {/* 後ろ動画のチェック項目 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono-tech">
            <h5 className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-none bg-cyan-400" />
              カメラ02 // 後ろ視点（体幹左右バランス・頭）
            </h5>
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {rearResult
                ? rearPinTime !== null
                  ? `ピン: ${formatTime(rearPinTime)}`
                  : '未ピン留め'
                : '動画なし'}
            </span>
          </div>

          {rearResult ? (
            rearFrame ? (
              <div className="space-y-2.5">
                {rearEvaluations.map((item, idx) => (
                  <MetricCard key={idx} item={item} />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-zinc-950 border border-dashed border-white/15 text-center space-y-2 font-mono-tech">
                <Info className="w-5 h-5 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-400">
                  [未ピン留め] 後ろ動画でこの局面が未ピン留めです。
                </p>
                <p className="text-[11px] text-zinc-500">
                  後ろ動画をコマ送りしてピン留めすると、左右のブレや肩の水平度が自動計算されます。
                </p>
              </div>
            )
          ) : (
            <div className="p-6 bg-zinc-950 border border-dashed border-white/10 text-center space-y-2">
              <Info className="w-5 h-5 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-mono-tech">
                [任意] 後ろ動画を読み込むと、左右の傾きや重心のブレも比較できます。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  item: {
    metricName: string;
    value: number | undefined;
    unit: string;
    referenceRangeText: string;
    status: 'good' | 'check' | 'info';
    advice: string;
    disclaimer?: string;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ item }) => {
  const isInfo = item.status === 'info';
  const isGood = item.status === 'good';

  return (
    <div
      className={`p-3 border text-xs space-y-1.5 transition-colors ${
        isInfo
          ? 'bg-zinc-950 border-white/10 text-zinc-300'
          : isGood
          ? 'bg-black/50 border-[#00ff88]/30 text-zinc-200'
          : 'bg-black/50 border-amber-500/30 text-zinc-200'
      }`}
    >
      <div className="flex items-center justify-between font-mono-tech">
        <span className="font-bold text-[#f2f2f2] text-xs">{item.metricName}</span>
        {item.value !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tabular-nums text-[#00ff88]">
              {item.value}
              {item.unit}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                isGood
                  ? 'border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/10'
                  : 'border-amber-500/50 text-amber-300 bg-amber-950/40'
              }`}
            >
              {isGood ? '良好' : '要確認'}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-500">{item.referenceRangeText}</span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-zinc-300">{item.advice}</p>

      {item.referenceRangeText && item.value !== undefined && (
        <div className="text-[10px] text-zinc-500 font-mono-tech">
          {item.referenceRangeText}
        </div>
      )}

      {item.disclaimer && (
        <div className="text-[10px] text-zinc-500 italic font-mono-tech">
          {item.disclaimer}
        </div>
      )}
    </div>
  );
};

function findClosestFrame(frames: { timestamp: number }[], time: number) {
  if (frames.length === 0) return null;
  let closest = frames[0];
  let minDiff = Math.abs(frames[0].timestamp - time);
  for (let i = 1; i < frames.length; i++) {
    const diff = Math.abs(frames[i].timestamp - time);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frames[i];
    }
  }
  return closest as unknown as import('../types').FramePoseData;
}
