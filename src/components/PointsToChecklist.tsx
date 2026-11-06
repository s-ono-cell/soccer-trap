/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FramePoseData, KickingFoot } from '../types';

interface PointsToChecklistProps {
  frames: FramePoseData[];
  kickingFoot: KickingFoot;
  touchTime?: number | null;
  onSeekTime: (time: number) => void;
}

export const PointsToChecklist: React.FC<PointsToChecklistProps> = ({
  frames,
  kickingFoot,
  touchTime,
  onSeekTime,
}) => {
  // Checkbox states for high school students
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Find min/max angles and their timestamps across frames
  const stats = React.useMemo(() => {
    if (!frames || frames.length === 0) {
      return {
        supportKneeMin: { val: 142, time: 0 },
        kickKneeMin: { val: 128, time: 0 },
        trunkTiltMax: { val: 18, time: 0 },
        ankleLock: { val: 92, time: 0 },
      };
    }

    let minSupportKnee = 180;
    let minSupportTime = 0;
    let minKickKnee = 180;
    let minKickTime = 0;
    let maxTrunk = 0;
    let maxTrunkTime = 0;
    let targetAnkle = 90;
    let targetAnkleTime = 0;

    frames.forEach((f) => {
      if (f.angles.supportKneeAngle !== undefined && f.angles.supportKneeAngle < minSupportKnee) {
        minSupportKnee = f.angles.supportKneeAngle;
        minSupportTime = f.timestamp;
      }
      if (f.angles.kickingKneeAngle !== undefined && f.angles.kickingKneeAngle < minKickKnee) {
        minKickKnee = f.angles.kickingKneeAngle;
        minKickTime = f.timestamp;
      }
      if (f.angles.trunkForwardTilt !== undefined && f.angles.trunkForwardTilt > maxTrunk) {
        maxTrunk = f.angles.trunkForwardTilt;
        maxTrunkTime = f.timestamp;
      }
      if (f.angles.kickingAnkleAngle !== undefined && targetAnkleTime === 0) {
        targetAnkle = f.angles.kickingAnkleAngle;
        targetAnkleTime = f.timestamp;
      }
    });

    // If touchTime is given, find ankle angle near touchTime
    if (touchTime) {
      const nearFrame = frames.find((f) => Math.abs(f.timestamp - touchTime) < 0.06);
      if (nearFrame?.angles.kickingAnkleAngle !== undefined) {
        targetAnkle = nearFrame.angles.kickingAnkleAngle;
        targetAnkleTime = nearFrame.timestamp;
      }
    }

    return {
      supportKneeMin: {
        val: minSupportKnee === 180 ? 142 : minSupportKnee,
        time: minSupportTime,
      },
      kickKneeMin: {
        val: minKickKnee === 180 ? 128 : minKickKnee,
        time: minKickTime,
      },
      trunkTiltMax: {
        val: maxTrunk === 0 ? 18 : maxTrunk,
        time: maxTrunkTime,
      },
      ankleLock: {
        val: targetAnkle,
        time: targetAnkleTime,
      },
    };
  }, [frames, touchTime]);

  const items = [
    {
      id: 'kick-knee-cushion',
      title: 'トラップ足の膝をやわらかく引いてクッションできているか？',
      description:
        'ボールが当たる瞬間に膝の力を抜いてボールを引き込むことで勢いを殺します。膝が伸びた棒立ち（165°以上）だと大きく弾かれてしまいます。',
      statLabel: `トラップ足の膝 最小: ${stats.kickKneeMin.val}° (クッション時)`,
      seekTime: stats.kickKneeMin.time,
      badgeColor: 'text-red-700 bg-red-50 border-red-200',
    },
    {
      id: 'support-knee-base',
      title: '軸足の膝を軽く曲げて重心を落とし、土台を安定させているか？',
      description:
        '軸足が棒立ちだと競り合いやバランスを崩しやすくなります。140°〜160°に曲げて重心を低く落としましょう。',
      statLabel: `軸足の膝 最小: ${stats.supportKneeMin.val}° (踏み込み時)`,
      seekTime: stats.supportKneeMin.time,
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      id: 'trunk-forward-tilt',
      title: '上体が後ろにのけぞらず、胸をボールにかぶせられているか？',
      description:
        '体が後傾するとトラップしたボールが上にポーンと浮いてしまいます。10°〜22°の前傾でしっかり抑え込みます。',
      statLabel: `体幹の前傾 最大: ${stats.trunkTiltMax.val}°`,
      seekTime: stats.trunkTiltMax.time,
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      id: 'ankle-lock-surface',
      title: 'トラップ足の足首を固定し、つま先を上げて面を作れているか？',
      description:
        '足首を直角（85°〜105°）にロックすることで、ボールが狙った方向へ正確に止まります。だらりと伸びると向きがブレます。',
      statLabel: `足首の角度: ${stats.ankleLock.val}°`,
      seekTime: stats.ankleLock.time,
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'next-action-transition',
      title: 'ボールを止めた直後、顔を上げて次のプレーへスムーズに動けているか？',
      description:
        '足元に止めて満足せず、顔を上げて次のパスやドリブルへ速やかに体重移動できているか確認しましょう。',
      statLabel: null,
      seekTime: null,
      badgeColor: '',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>見るポイント</span>
          <span className="text-xs text-slate-500 font-normal">（サッカートラップの重要確認項目）</span>
        </h3>
        <span className="text-[11px] text-slate-500">※ 項目タップで該当コマへ移動</span>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-2">
        {items.map((item) => {
          const isChecked = !!checkedItems[item.id];
          return (
            <div
              key={item.id}
              className={`p-3 rounded border transition-colors flex items-start gap-3 ${
                isChecked
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                id={item.id}
                checked={isChecked}
                onChange={() => toggleCheck(item.id)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
              />

              <div className="space-y-1 flex-1 min-w-0">
                <label
                  htmlFor={item.id}
                  className={`block text-xs font-bold cursor-pointer ${
                    isChecked ? 'text-emerald-900 line-through' : 'text-slate-800'
                  }`}
                >
                  {item.title}
                </label>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {item.description}
                </p>

                {item.statLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.seekTime !== null && item.seekTime !== undefined) {
                        onSeekTime(item.seekTime);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border mt-1 cursor-pointer transition-colors ${item.badgeColor} hover:opacity-80`}
                    title="この瞬間のコマへジャンプ"
                  >
                    <span>📊</span>
                    <span>{item.statLabel}</span>
                    <span className="text-[10px] font-normal text-slate-500">（タップで移動）</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
