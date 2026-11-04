'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Scissors, Layers, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface ToolsHeaderNavProps {
  activeTool: 'excel-splitter' | 'tanos-normalizer';
}

export default function ToolsHeaderNav({ activeTool }: ToolsHeaderNavProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3 shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tombol Kembali ke Dashboard */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Kembali ke Dashboard Asisten</span>
          </Link>

          {/* Privacy badge di mobile */}
          <span className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            100% Privat
          </span>
        </div>

        {/* Tab Switcher Antara Alat Bantu */}
        <div className="flex items-center justify-center p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700 text-xs font-bold shadow-inner">
          <Link
            href="/tools/excel-splitter"
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTool === 'excel-splitter'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">Pemecah Excel HRIS</span>
          </Link>

          <Link
            href="/tools/tanos-normalizer"
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTool === 'tanos-normalizer'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="truncate">Normalisasi Data Tanos</span>
          </Link>
        </div>

        {/* Privacy badge di desktop & Dark Mode Toggle */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            100% Offline & Privat
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap (Lembur)'}
            aria-label="Ubah Tema"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 hover:text-amber-600 transition-colors cursor-pointer shadow-xs"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
