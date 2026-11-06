/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface FilmingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilmingGuide: React.FC<FilmingGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-sm text-slate-800 shadow-xl p-6 sm:p-8 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 border border-blue-200 rounded flex items-center justify-center text-blue-600">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                動画撮影のコツ & ガイド
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer text-sm font-bold"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
          {/* Section 1: 撮影のポイント */}
          <section className="space-y-2.5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              きれいに解析するための撮影ポイント
            </h3>
            <ul className="space-y-2 pl-1 font-sans text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">1.</span>
                <span>
                  <strong>全身とボールが画面に入るように撮る：</strong>
                  頭のてっぺんから足先、飛んでくるボールがしっかり映るように少し離れた位置から撮影します。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">2.</span>
                <span>
                  <strong>カメラは三脚などで固定：</strong>
                  手ブレがあると骨格が揺れてしまいます。三脚やベンチなどにスマホを置いて固定するのがおすすめです。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">3.</span>
                <span>
                  <strong>真横90度から撮影（メイン動画）：</strong>
                  選手の真横から撮影すると、膝や股関節のクッション動作、前傾姿勢がもっとも正確に推定できます。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">4.</span>
                <span>
                  <strong>5〜10秒前後の短い動画にトリミング：</strong>
                  トラップの前後の数秒間だけを残しておくと、スマホやiPadでも数秒でサクサク解析が完了します。
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: 注意事項 */}
          <section className="p-3.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>数値についての注意事項</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-sans">
              本アプリの角度や速度は、スマホの一般的な単眼カメラ映像から推定した目安の数値です。3次元モーションキャプチャ等の精密計測とは異なりますので、選手個々の体格やプレースタイルに応じた参考としてご利用ください。
            </p>
          </section>

          {/* Section 3: プライバシーとセキュリティ */}
          <section className="p-3 bg-blue-50/60 border border-blue-200 rounded flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-0.5">プライバシー・安心設計</span>
              <span>
                動画はすべてお使いの端末（ブラウザ）内でのみ処理されます。動画データが外部サーバーへアップロードされることはありません。
              </span>
            </div>
          </section>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded border border-slate-300 transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
