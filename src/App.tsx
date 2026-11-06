/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  Loader2,
  Camera,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  AppSettings,
  KickingFoot,
  VideoAngleType,
  VideoAnalysisResult,
} from './types';
import { VideoPlayerCanvas } from './components/VideoPlayerCanvas';
import { AngleTrendChart } from './components/AngleTrendChart';
import { PointsToChecklist } from './components/PointsToChecklist';
import { FilmingGuide } from './components/FilmingGuide';
import { exportAnalysisToCsv } from './utils/csvExporter';
import { loadVideoMetadata } from './utils/videoUtils';
import { MediaPipeService } from './services/mediapipeService';

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 基本設定（右足・左足）
  const [settings, setSettings] = useState<AppSettings>({
    kickingFoot: 'right',
    playerHeightCm: 170,
    autoDetectCandidate: true,
  });

  // 解析結果
  const [sideAnalysis, setSideAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [rearAnalysis, setRearAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'side' | 'rear'>('side');

  // プレイヤー操作
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  // 解析中ステート
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ガイドモーダル
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // ユーザー動画の解析処理
  const processVideoFile = async (file: File, viewType: VideoAngleType = 'side') => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgressPercent(10);
      setStatusMessage('動画を読み込み中...');

      const { url, metadata, videoElement } = await loadVideoMetadata(file);

      setProgressPercent(30);
      setStatusMessage('AI骨格推定を実行中（ブラウザ内ローカル処理）...');

      const service = MediaPipeService.getInstance();
      const analysisData = await service.analyzeVideoCoarseToFine(
        videoElement,
        settings.kickingFoot,
        viewType,
        metadata.fps,
        (percent: number, msg: string) => {
          setProgressPercent(30 + Math.round(percent * 0.65));
          if (msg) setStatusMessage(msg);
        }
      );

      const result: VideoAnalysisResult = {
        id: `analysis_${Date.now()}`,
        sourceType: viewType,
        fileName: file.name,
        videoUrl: url,
        duration: metadata.duration,
        fps: metadata.fps,
        isEstimatedFps: metadata.isEstimatedFps,
        totalAnalyzedFrames: analysisData.frames.length,
        frames: analysisData.frames,
        candidateTouchTime: analysisData.candidateTouchTime,
        pinnedPhases: {
          approach: Math.max(0, parseFloat((analysisData.candidateTouchTime - 0.4).toFixed(2))),
          pre_touch: Math.max(0, parseFloat((analysisData.candidateTouchTime - 0.15).toFixed(2))),
          touch: parseFloat(analysisData.candidateTouchTime.toFixed(2)),
          post_touch: Math.min(metadata.duration, parseFloat((analysisData.candidateTouchTime + 0.35).toFixed(2))),
        },
        analyzedAt: new Date().toISOString(),
      };

      if (viewType === 'side') {
        setSideAnalysis(result);
        setActiveTab('side');
      } else {
        setRearAnalysis(result);
        setActiveTab('rear');
      }

      setCurrentTime(0);
      setSeekTime(0);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '動画の解析に失敗しました。';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // ファイル選択ハンドラ
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processVideoFile(file, activeTab);
  };


  // CSVダウンロード
  const handleDownloadCsv = () => {
    if (!sideAnalysis) return;
    exportAnalysisToCsv(sideAnalysis, rearAnalysis, settings);
  };

  // 現在表示中の解析データ
  const currentResult = activeTab === 'side' ? sideAnalysis : rearAnalysis || sideAnalysis;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* トップヘッダー（シンプルで分かりやすいナビ） */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <h1 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              サッカー・トラップ解析
            </h1>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">撮影のコツ</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツエリア（参考画像に合わせたシンプルな縦並びレイアウト） */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* 操作バー：蹴り足選択 & 動画選択ボタン */}
        <div className="bg-white border border-slate-200 rounded p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          {/* 蹴り足（右足 / 左足） */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">トラップ足:</span>
            <div className="inline-flex rounded border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, kickingFoot: 'right' })}
                className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  settings.kickingFoot === 'right'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                右足
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, kickingFoot: 'left' })}
                className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  settings.kickingFoot === 'left'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                左足
              </button>
            </div>
          </div>

          {/* 動画選択ボタン */}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>動画を選ぶ</span>
            </button>
          </div>
        </div>

        {/* 解析中の進行バー */}
        {isProcessing && (
          <div className="bg-white border border-blue-200 rounded p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span>{statusMessage}</span>
              </span>
              <span className="font-bold text-blue-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 動画読み込み済みのメイン表示（参考画像に準拠） */}
        {currentResult ? (
          <div className="space-y-4">
            {/* 後ろ動画もある場合の切り替えタブ */}
            {rearAnalysis && (
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('side')}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    activeTab === 'side'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  真横動画（メイン）
                </button>
                <button
                  onClick={() => setActiveTab('rear')}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    activeTab === 'rear'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  後ろ動画（補助）
                </button>
              </div>
            )}

            {/* 1. 動画プレイヤー ＋ コマ送り操作 ＋ 4つの角度カード */}
            <VideoPlayerCanvas
              videoUrl={currentResult.videoUrl}
              fps={currentResult.fps}
              duration={currentResult.duration}
              frames={currentResult.frames}
              kickingFoot={settings.kickingFoot}
              viewType={currentResult.sourceType}
              pinnedPhases={currentResult.pinnedPhases}
              onTimeUpdate={(t) => setCurrentTime(t)}
              seekTime={seekTime}
              onSeekHandled={() => setSeekTime(null)}
              title={activeTab === 'side' ? '真横動画' : '後ろ動画'}
            />

            {/* 2. 角度のグラフ（縦線 ＝ 今のコマ、破線 ＝ インパクト） */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <AngleTrendChart
                frames={currentResult.frames}
                currentTime={currentTime}
                duration={currentResult.duration}
                kickingFoot={settings.kickingFoot}
                touchTime={currentResult.pinnedPhases?.touch ?? currentResult.candidateTouchTime}
                onSeekTime={(t) => setSeekTime(t)}
              />
            </div>

            {/* 3. 見るポイント（サッカートラップ専用チェックリスト） */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <PointsToChecklist
                frames={currentResult.frames}
                kickingFoot={settings.kickingFoot}
                touchTime={currentResult.pinnedPhases?.touch ?? currentResult.candidateTouchTime}
                onSeekTime={(t) => setSeekTime(t)}
              />
            </div>

            {/* 4. データ(CSV)を保存ボタン（参考画像の最下部配置に準拠） */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded text-slate-800 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <span>💾</span>
                <span>データ(CSV)を保存</span>
              </button>
            </div>
          </div>
        ) : (
          /* 未読み込み時の初期案内カード */
          !isProcessing && (
            <div className="bg-white border border-slate-200 rounded p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                ⚽
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  動画を読み込んでトラップのフォームを確認しましょう
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  iPadやスマートフォンで撮影したトラップ動作の動画を選択してください。端末内で安全に骨格推定と角度解析が行われます。
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded shadow-2xs cursor-pointer flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>端末から動画を選ぶ</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* 画面下部の注意書き（控えめで安心できる注意文） */}
        <div className="text-center pt-4 pb-8">
          <p className="text-[11px] text-slate-600 leading-relaxed max-w-lg mx-auto">
            ※ 角度やグラフの数値は単眼スマートフォン動画からの2D骨格推定による参考の目安です。実際のフォーム指導は専門の指導者とご相談ください。動画は端末内のみで処理され外部送信されません。
          </p>
        </div>
      </main>

      {/* 撮影ガイドモーダル */}
      <FilmingGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
