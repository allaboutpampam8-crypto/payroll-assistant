'use client';

import React from 'react';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  SearchCheck,
  CheckSquare,
  SlidersHorizontal,
} from 'lucide-react';
import { PayrollSettings, PayrollReport } from '@/lib/types';

interface DailyBriefingProps {
  settings: PayrollSettings;
  reports: PayrollReport[];
  activeTodosCount?: number;
  onOpenSettings: () => void;
  onFilterStatus: (status: string) => void;
  onOpenTodos?: () => void;
}

export default function DailyBriefing({
  settings,
  reports,
  activeTodosCount = 0,
  onOpenSettings,
  onFilterStatus,
  onOpenTodos,
}: DailyBriefingProps) {
  // Hitung selisih hari ke cutoff
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(settings.cutoffDate);
  cutoff.setHours(0, 0, 0, 0);

  const diffTime = cutoff.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Analisis laporan
  const openCount = reports.filter((r) => r.actionStatus === 'OPEN').length;
  const crosscheckCount = reports.filter((r) => r.actionStatus === 'CROSSCHECK').length;
  const totalUnresolved = openCount + crosscheckCount;

  const urgentCount = reports.filter(
    (r) => r.priority === 'URGENT' && r.actionStatus !== 'CLOSE'
  ).length;

  const isCutoffNear = diffDays <= 4 && diffDays >= 0;
  const isCutoffPassed = diffDays < 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-5 md:p-6 text-white shadow-xl border border-indigo-700/50">
      {/* Background Glow Accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-blue-500/15 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Sapaan Asisten */}
        <div className="space-y-2 max-w-full">
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl sm:rounded-full bg-indigo-500/30 px-3 py-1 text-[11px] sm:text-xs font-medium text-indigo-200 backdrop-blur-md border border-indigo-400/30 max-w-full">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-none">
              Asisten Payroll {settings.companyName}
            </span>
            <span className="text-indigo-400 hidden sm:inline">•</span>
            <span className="font-semibold text-indigo-100">{settings.activePeriod}</span>
          </div>

          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
            {totalUnresolved === 0 ? (
              'Semua laporan payroll sudah beres! 🎉'
            ) : (
              <>
                Ada <span className="text-amber-300 font-extrabold">{totalUnresolved} laporan</span> yang perlu Anda tindaklanjuti
              </>
            )}
          </h2>

          <p className="text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
            {totalUnresolved === 0 ? (
              'Bagus sekali! Tidak ada laporan berstatus Open atau Crosscheck. Semua kendala telah terselesaikan.'
            ) : (
              <>
                Fokus tugas saat ini:{' '}
                {openCount > 0 && (
                  <span className="font-semibold text-amber-200">{openCount} laporan baru (Open), </span>
                )}
                {crosscheckCount > 0 && (
                  <span className="font-semibold text-blue-200">{crosscheckCount} sedang tahap Crosscheck. </span>
                )}
                {urgentCount > 0 && (
                  <span className="block mt-1 text-rose-300 font-semibold">
                    ⚠️ {urgentCount} laporan berprioritas TINGGI/URGENT!
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Status Cutoff & Pengaturan */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-start md:items-end gap-2 shrink-0 w-full sm:w-auto">
          <div
            className={`flex items-center justify-between sm:justify-start gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold backdrop-blur-md border ${
              isCutoffPassed
                ? 'bg-rose-950/70 border-rose-600 text-rose-200'
                : isCutoffNear
                ? 'bg-amber-950/70 border-amber-500 text-amber-200 animate-pulse'
                : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCutoffNear || isCutoffPassed ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              ) : (
                <Calendar className="h-4 w-4 shrink-0 text-indigo-300" />
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-indigo-200/80">Cut-Off Payroll</div>
                <div>
                  {settings.cutoffDate}{' '}
                  <span className="text-[11px] font-normal opacity-90">
                    {isCutoffPassed
                      ? '(Lewat ' + Math.abs(diffDays) + ' hari)'
                      : diffDays === 0
                      ? '(Hari ini!)'
                      : '(' + diffDays + ' hari lagi)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-medium text-white transition-all cursor-pointer border border-white/10 w-full sm:w-auto"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Atur Periode & Cut-Off</span>
          </button>
        </div>
      </div>

      {/* Quick Action Badges */}
      {(totalUnresolved > 0 || activeTodosCount > 0) && (
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-indigo-200/70 text-[11px]">Akses Cepat:</span>
          {openCount > 0 && (
            <button
              onClick={() => onFilterStatus('OPEN')}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-amber-200 border border-amber-400/30 transition-all cursor-pointer"
            >
              <Clock className="h-3 w-3" />
              <span>{openCount} Status Open</span>
            </button>
          )}
          {crosscheckCount > 0 && (
            <button
              onClick={() => onFilterStatus('CROSSCHECK')}
              className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 px-2.5 py-1 text-blue-200 border border-blue-400/30 transition-all cursor-pointer"
            >
              <SearchCheck className="h-3 w-3" />
              <span>{crosscheckCount} Status Crosscheck</span>
            </button>
          )}
          {activeTodosCount > 0 && onOpenTodos && (
            <button
              onClick={onOpenTodos}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 text-emerald-200 border border-emerald-400/30 transition-all cursor-pointer"
            >
              <CheckSquare className="h-3 w-3 text-emerald-300" />
              <span>{activeTodosCount} To-Do Pribadi Aktif</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
