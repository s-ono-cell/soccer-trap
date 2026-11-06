/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera } from 'lucide-react';

interface HeaderProps {
  onOpenGuide: () => void;
  activeSection: string;
  onNavigateSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGuide,
  activeSection,
  onNavigateSection,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#111113]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Zone 1: Brand title with Japanese system label & version badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-zinc-900 border border-white/15 rounded flex items-center justify-center text-[#00ff88] font-bold text-sm shadow-inner">
          ⚡
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="label-mono hidden sm:inline">[ サッカー動作解析 ]</span>
            <h1 className="font-syne font-extrabold text-base sm:text-lg tracking-tight text-[#f2f2f2] whitespace-nowrap">
              サポータス TRAPFORM
            </h1>
          </div>
          <span className="font-mono-tech text-[10px] px-1.5 py-0.5 border border-[#00ff88]/80 text-[#00ff88] rounded-xs font-bold tracking-wider inline-block self-start sm:self-center">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation links in friendly Japanese */}
      <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs font-mono-tech tracking-wider">
        <button
          onClick={() => onNavigateSection('settings-section')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'settings-section'
              ? 'text-[#00ff88] font-bold border-b border-[#00ff88] pb-0.5'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          設定
        </button>
        <button
          onClick={() => onNavigateSection('upload-section')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'upload-section'
              ? 'text-[#00ff88] font-bold border-b border-[#00ff88] pb-0.5'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          動画解析
        </button>
        <button
          onClick={() => onNavigateSection('player-section')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'player-section'
              ? 'text-[#00ff88] font-bold border-b border-[#00ff88] pb-0.5'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          コマ送り・ピン留め
        </button>
        <button
          onClick={() => onNavigateSection('checklist-section')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeSection === 'checklist-section'
              ? 'text-[#00ff88] font-bold border-b border-[#00ff88] pb-0.5'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          フォーム診断
        </button>
      </nav>

      {/* Zone 3: Primary action button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenGuide}
          className="min-h-[40px] px-3.5 py-2 text-xs font-mono-tech tracking-wider text-zinc-300 hover:text-[#00ff88] bg-zinc-900/80 hover:bg-zinc-800 border border-white/15 hover:border-[#00ff88]/50 rounded transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-[#00ff88]" />
          <span>撮影ガイド</span>
        </button>
      </div>
    </header>
  );
};
