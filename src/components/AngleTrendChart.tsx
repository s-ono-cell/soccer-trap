/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { FramePoseData, KickingFoot } from '../types';

interface AngleTrendChartProps {
  frames: FramePoseData[];
  currentTime: number;
  duration: number;
  kickingFoot: KickingFoot;
  touchTime?: number | null;
  onSeekTime: (time: number) => void;
}

export const AngleTrendChart: React.FC<AngleTrendChartProps> = ({
  frames,
  currentTime,
  duration,
  touchTime,
  onSeekTime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames || frames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Padding (right padding accommodates legend)
    const padL = 36;
    const padR = 125;
    const padT = 18;
    const padB = 22;
    const plotW = Math.max(10, width - padL - padR);
    const plotH = Math.max(10, height - padT - padB);

    ctx.clearRect(0, 0, width, height);

    // Y-axis grid (0, 45, 90, 135, 180)
    const yValues = [0, 45, 90, 135, 180];
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    yValues.forEach((val) => {
      const y = padT + plotH - (val / 180) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      ctx.fillText(`${val}°`, padL - 6, y);
    });

    if (frames.length > 1 && duration > 0) {
      // Helper to map (time, deg) to (x, y)
      const toX = (t: number) => padL + Math.max(0, Math.min(1, t / duration)) * plotW;
      const toY = (deg: number) => padT + plotH - (Math.max(0, Math.min(180, deg)) / 180) * plotH;

      // Soccer trap specific biomechanical series
      const series = [
        {
          name: 'トラップ膝 (クッション)',
          color: '#ef4444', // Red
          getData: (f: FramePoseData) => f.angles.kickingKneeAngle,
        },
        {
          name: '軸足の膝 (土台)',
          color: '#f59e0b', // Amber / Orange
          getData: (f: FramePoseData) => f.angles.supportKneeAngle,
        },
        {
          name: '体幹の前傾 (抑え込み)',
          color: '#2563eb', // Blue
          getData: (f: FramePoseData) => f.angles.trunkForwardTilt,
        },
        {
          name: '足首 (面の固定)',
          color: '#10b981', // Green
          getData: (f: FramePoseData) => f.angles.kickingAnkleAngle,
        },
      ];

      // Draw series lines
      series.forEach((s) => {
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        let started = false;
        for (let i = 0; i < frames.length; i++) {
          const val = s.getData(frames[i]);
          if (val !== undefined && !isNaN(val)) {
            const x = toX(frames[i].timestamp);
            const y = toY(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      });

      // Impact line (dashed amber/yellow line)
      if (touchTime !== undefined && touchTime !== null && touchTime > 0 && touchTime <= duration) {
        const impactX = toX(touchTime);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.moveTo(impactX, padT);
        ctx.lineTo(impactX, padT + plotH);
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚽ インパクト', impactX, padT - 6);
        ctx.restore();
      }

      // Current Frame vertical cursor (red solid line)
      const currX = toX(currentTime);
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.moveTo(currX, padT - 4);
      ctx.lineTo(currX, padT + plotH + 4);
      ctx.stroke();

      // Top dot indicator for current frame
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(currX, padT - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Legend in top-right corner
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      series.forEach((s, idx) => {
        const legY = padT + idx * 18 + 2;
        // Colored indicator line
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padL + plotW + 10, legY);
        ctx.lineTo(padL + plotW + 20, legY);
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.fillText(s.name, padL + plotW + 24, legY + 3);
      });
    }
  }, [frames, currentTime, duration, touchTime]);

  // Click or drag on chart to seek
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const padL = 36;
    const padR = 125;
    const plotW = rect.width - padL - padR;

    const x = e.clientX - rect.left - padL;
    const ratio = Math.max(0, Math.min(1, x / plotW));
    onSeekTime(ratio * duration);
  };

  return (
    <div ref={containerRef} className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
        <span className="font-bold flex items-center gap-1.5">
          <span>角度のグラフ</span>
          <span className="text-slate-500 font-normal">（縦線 ＝ 今のコマ）</span>
        </span>
        <span className="text-[11px] text-slate-500">※ グラフ上をタップしてコマを移動</span>
      </div>

      <div className="w-full h-40 sm:h-48 bg-white border border-slate-200 rounded relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className="w-full h-full cursor-crosshair"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-[11px] text-slate-600 flex items-center gap-1.5">
        <span className="text-blue-600">💡</span>
        <span>
          <strong>トラップのチェック方法:</strong> インパクト前後で<span className="text-red-600 font-semibold">🔴トラップ足の膝</span>が下（谷）へ向かっていれば、ボールの勢いをやわらかく引いてクッション吸収できています。
        </span>
      </div>
    </div>
  );
};
