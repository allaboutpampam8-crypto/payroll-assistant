'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  ListTodo,
  ClipboardList,
  Wrench,
  Plus,
  Database,
  Calculator,
  Scissors,
  Layers,
  FileSpreadsheet,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export interface MobileBottomBarProps {
  activeTab: 'REPORTS' | 'TODOS';
  onToggleTab: () => void;
  isMobileToolsOpen: boolean;
  onOpenMobileTools: () => void;
  onCloseMobileTools: () => void;
  onOpenQuickEntry: () => void;
  onOpenPayrollModal: () => void;
  onOpenTerbilang: () => void;
  onExportReports: () => void;
  onLogout: () => void;
}

export default function MobileBottomBar({
  activeTab,
  onToggleTab,
  isMobileToolsOpen,
  onOpenMobileTools,
  onCloseMobileTools,
  onOpenQuickEntry,
  onOpenPayrollModal,
  onOpenTerbilang,
  onExportReports,
  onLogout,
}: MobileBottomBarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isMobileToolsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobileTools();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileToolsOpen, onCloseMobileTools]);

  return (
    <>
      {/* Floating Bottom Bar Khusus Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-2xl transition-colors">
        <button
          onClick={onToggleTab}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
        >
          {activeTab === 'REPORTS' ? (
            <>
              <ListTodo className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>To-Do</span>
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Laporan</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenMobileTools}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
        >
          <Wrench className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Alat Bantu</span>
        </button>

        <button
          onClick={onOpenQuickEntry}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Catat</span>
        </button>
      </div>

      {/* Mobile Bottom Action Sheet */}
      {isMobileToolsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex-1" onClick={onCloseMobileTools} />
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Alat Bantu Payroll
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih menu utilitas yang ingin dibuka
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseMobileTools}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => {
                  onCloseMobileTools();
                  onOpenPayrollModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Data & Analisis Payroll
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cari, cek slip & komparasi gaji 17k+ pegawai
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  onCloseMobileTools();
                  onOpenTerbilang();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Kalkulator Terbilang ND
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Konversi nominal ke kalimat resmi Nota Dinas
                  </p>
                </div>
              </button>

              <Link
                href="/tools/excel-splitter"
                onClick={onCloseMobileTools}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Pemecah Excel HRIS
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bagi file per 1000 baris tetap utuh
                  </p>
                </div>
              </Link>

              <Link
                href="/tools/tanos-normalizer"
                onClick={onCloseMobileTools}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-violet-50/60 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/80 dark:border-violet-800 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-xs">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Normalisasi Data Tanos
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Urutkan 150+ kolom gaji Tanos otomatis
                  </p>
                </div>
              </Link>

              <button
                onClick={() => {
                  onCloseMobileTools();
                  onExportReports();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Unduh Rekap Tiket
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ekspor seluruh tiket kendala ke file Excel
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 p-2 cursor-pointer"
              >
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span>Mode Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-500" />
                    <span>Mode Gelap</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onCloseMobileTools();
                  onLogout();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 p-2 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Kunci Layar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
