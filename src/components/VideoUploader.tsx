/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Upload,
  Video,
  PlayCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileVideo,
} from 'lucide-react';
import { AppSettings, VideoAngleType, VideoAnalysisResult } from '../types';
import { MediaPipeService } from '../services/mediapipeService';
import { loadVideoMetadata } from '../utils/videoUtils';
import { generateSampleSoccerVideo } from '../utils/sampleVideoGenerator';

interface VideoUploaderProps {
  viewType: VideoAngleType;
  title: string;
  description: string;
  isRequired?: boolean;
  settings: AppSettings;
  existingResult: VideoAnalysisResult | null;
  onAnalysisComplete: (result: VideoAnalysisResult) => void;
  onClearVideo: () => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  viewType,
  title,
  description,
  isRequired = false,
  settings,
  existingResult,
  onAnalysisComplete,
  onClearVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoFps, setVideoFps] = useState<number>(30);
  const [isEstimatedFps, setIsEstimatedFps] = useState<boolean>(true);
  const [tempVideoEl, setTempVideoEl] = useState<HTMLVideoElement | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // ファイル解放
  const cleanupUrl = (urlToClean: string | null) => {
    if (urlToClean && urlToClean.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(urlToClean);
      } catch (e) {
        console.warn('Revoke error', e);
      }
    }
  };

  // ファイル選択ハンドラ
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processVideoFile(file);
  };

  // サンプル動画生成ハンドラ
  const handleUseSampleVideo = async () => {
    try {
      setErrorMessage(null);
      setProgressMessage('サンプル動画をブラウザ内でレンダリング生成中...');
      setIsAnalyzing(true);
      setProgressPercent(10);
      const sampleFile = await generateSampleSoccerVideo(viewType);
      await processVideoFile(sampleFile);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage('サンプル動画の生成に失敗しました。');
      setIsAnalyzing(false);
    }
  };

  // 動画ファイルのメタデータ取得と解析準備
  const processVideoFile = async (file: File) => {
    cleanupUrl(videoObjectUrl);
    setErrorMessage(null);
    setWarningMessage(null);
    setSelectedFile(file);

    try {
      setProgressMessage('動画のメタデータとフレームレートを確認中...');
      const { url, metadata, videoElement } = await loadVideoMetadata(file);

      setVideoObjectUrl(url);
      setVideoDuration(metadata.duration);
      setVideoFps(metadata.fps);
      setIsEstimatedFps(metadata.isEstimatedFps);
      setTempVideoEl(videoElement);

      if (metadata.duration > 15) {
        setWarningMessage(
          `動画が約${metadata.duration.toFixed(1)}秒あります。iPadやスマホでの解析負荷を抑えるため、先頭15秒を解析対象とします。`
        );
      }

      // 自動解析スタート
      await runAnalysis(videoElement, file.name, url, metadata.duration, metadata.fps, metadata.isEstimatedFps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '動画の処理に失敗しました。';
      setErrorMessage(msg);
      setIsAnalyzing(false);
    }
  };

  // 解析実行
  const runAnalysis = async (
    videoElement: HTMLVideoElement,
    fileName: string,
    url: string,
    duration: number,
    fps: number,
    isEstimated: boolean
  ) => {
    setIsAnalyzing(true);
    setProgressPercent(10);
    setProgressMessage('MediaPipe AIモデルを起動中...');

    try {
      const service = MediaPipeService.getInstance();
      const analysisData = await service.analyzeVideoCoarseToFine(
        videoElement,
        settings.kickingFoot,
        viewType,
        fps,
        (percent, msg) => {
          setProgressPercent(percent);
          setProgressMessage(msg);
        }
      );

      const candidateTouch = analysisData.candidateTouchTime;

      // 結果オブジェクト作成
      const result: VideoAnalysisResult = {
        id: `${viewType}_${Date.now()}`,
        sourceType: viewType,
        fileName,
        videoUrl: url,
        duration,
        fps,
        isEstimatedFps: isEstimated,
        totalAnalyzedFrames: analysisData.frames.length,
        frames: analysisData.frames,
        candidateTouchTime: candidateTouch,
        pinnedPhases: {
          approach: null,
          pre_touch: null,
          touch: candidateTouch ?? null, // インパクトに初期候補を自動提案
          post_touch: null,
        },
        analyzedAt: new Date().toISOString(),
        warningNotice: analysisData.warningNotice || warningMessage || undefined,
      };

      onAnalysisComplete(result);
    } catch (err: unknown) {
      console.error('Analysis failed', err);
      const msg =
        err instanceof Error
          ? err.message
          : '骨格推定AIの実行中にエラーが発生しました。';
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // リセット
  const handleReset = () => {
    cleanupUrl(videoObjectUrl);
    setSelectedFile(null);
    setVideoObjectUrl(null);
    setTempVideoEl(null);
    setErrorMessage(null);
    setWarningMessage(null);
    setIsAnalyzing(false);
    onClearVideo();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`tech-card p-5 rounded-none sm:rounded-sm space-y-4 ${existingResult ? 'active' : ''}`}>
      {/* カードヘッダー */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="label-mono">
              {viewType === 'side' ? '[ カメラ01：真横視点 ]' : '[ カメラ02：背面視点 ]'}
            </span>
            <span
              className={`text-[10px] font-mono-tech uppercase px-2 py-0.5 rounded-xs border ${
                viewType === 'side'
                  ? 'border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/10'
                  : 'border-zinc-700 text-zinc-400 bg-zinc-900'
              }`}
            >
              {viewType === 'side' ? '必須' : '任意'}
            </span>
          </div>
          <h3 className="font-syne font-bold text-base sm:text-lg text-[#f2f2f2]">{title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
        </div>

        {existingResult && (
          <button
            onClick={handleReset}
            className="min-h-[40px] px-3 py-1.5 text-xs font-mono-tech uppercase text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-rose-500/50 rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="別の動画を再選択"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>再選択</span>
          </button>
        )}
      </div>

      {/* エラーメッセージ表示 */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-xs text-rose-200 text-xs sm:text-sm space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono-tech font-bold block text-rose-300">[ エラーが発生しました ]</span>
              <p className="text-rose-200 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-rose-800/40 flex items-center gap-2 font-mono-tech">
            <button
              onClick={() => {
                if (tempVideoEl && selectedFile && videoObjectUrl) {
                  runAnalysis(tempVideoEl, selectedFile.name, videoObjectUrl, videoDuration, videoFps, isEstimatedFps);
                } else {
                  handleReset();
                }
              }}
              className="px-3 py-1 bg-rose-600 text-white font-bold rounded-xs text-xs hover:bg-rose-500 transition-colors cursor-pointer"
            >
              再試行
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-zinc-900 border border-rose-500/40 text-rose-300 font-medium rounded-xs text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              動画の選び直し
            </button>
          </div>
        </div>
      )}

      {/* 警告メッセージ（長尺動画など） */}
      {warningMessage && !errorMessage && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xs text-amber-200 text-xs flex items-start gap-2 font-mono-tech">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* 解析中プログレス */}
      {isAnalyzing && (
        <div className="p-4 bg-zinc-950 border border-white/10 rounded-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-mono-tech text-zinc-300">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#00ff88] animate-spin" />
              <span>{progressMessage}</span>
            </span>
            <span className="font-mono-tech text-[#00ff88] font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-none overflow-hidden border border-white/10">
            <div
              className="h-full bg-[#00ff88] shadow-[0_0_12px_#00ff88] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] font-mono-tech text-zinc-500">
            MediaPipe AI 骨格推定解析中（端末内ローカル処理・安全）
          </p>
        </div>
      )}

      {/* 解析完了時のステータス */}
      {!isAnalyzing && existingResult && (
        <div className="p-3.5 bg-black/60 border border-[#00ff88]/30 rounded-xs flex items-center justify-between text-xs text-zinc-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#00ff88] shrink-0" />
            <div>
              <span className="font-mono-tech font-bold block text-[#f2f2f2]">
                {existingResult.fileName}
              </span>
              <span className="text-zinc-400 font-mono-tech text-[11px]">
                {existingResult.duration.toFixed(1)}秒 · {existingResult.fps.toFixed(1)} FPS {existingResult.isEstimatedFps ? '(推定値)' : '(実測値)'} · 計{existingResult.totalAnalyzedFrames}コマ解析済
              </span>
            </div>
          </div>
          <span className="font-mono-tech font-bold text-[10px] text-[#00ff88] bg-[#00ff88]/15 border border-[#00ff88]/40 px-2 py-0.5 rounded-xs tracking-wider">
            解析完了
          </span>
        </div>
      )}

      {/* 未選択状態のドロップゾーン */}
      {!isAnalyzing && !existingResult && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-white/20 hover:border-[#00ff88] bg-black/40 hover:bg-black/60 p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
          >
            <div className="w-12 h-12 bg-zinc-900 border border-white/10 group-hover:border-[#00ff88]/50 text-[#00ff88] flex items-center justify-center transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="label-mono block mb-1">動画ファイルを選択（MP4 / MOV）</span>
              <span className="text-xs text-zinc-400 block">
                タップして写真ライブラリまたはカメラ撮影から動画を選択 (10秒以内推奨)
              </span>
            </div>
            <button
              type="button"
              className="min-h-[40px] px-5 py-2 bg-[#00ff88] hover:bg-[#00e67a] active:scale-[0.98] text-[#111113] text-xs font-mono-tech font-bold uppercase tracking-wider transition-all mt-1 cursor-pointer"
            >
              動画ファイルを選択
            </button>
          </div>

          {/* サンプル動画で試すボタン */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-mono-tech text-zinc-400">
              手元に動画がない場合：
            </span>
            <button
              type="button"
              onClick={handleUseSampleVideo}
              className="min-h-[38px] px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/15 hover:border-[#00ff88]/50 text-xs font-mono-tech tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>テスト用サンプル動画で試す</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
