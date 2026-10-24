'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  SearchCheck,
  CheckSquare,
  SlidersHorizontal,
  Flame,
  Hourglass,
  ArrowRight,
  CheckCircle2,
  FastForward,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PayrollSettings, PayrollReport, PayrollTodo } from '@/lib/types';
import { getNextPeriodSuggestion } from '@/lib/periodUtils';

interface DailyBriefingProps {
  settings: PayrollSettings;
  reports: PayrollReport[];
  todos?: PayrollTodo[];
  activeTodosCount?: number;
  onOpenSettings: () => void;
  onFilterStatus: (status: string) => void;
  onOpenTodos?: (filter?: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'TODAY') => void;
  onRefresh?: () => void;
}

export default function DailyBriefing({
  settings,
  reports,
  todos = [],
  activeTodosCount = 0,
  onOpenSettings,
  onFilterStatus,
  onOpenTodos,
  onRefresh,
}: DailyBriefingProps) {
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false);
  const nextSuggestion = getNextPeriodSuggestion(settings.activePeriod, settings.cutoffDate);

  const handleToggleComplete = async (isCompleted: boolean) => {
    setUpdatingLifecycle(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPeriodCompleted: isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : '',
        }),
      });
      if (res.ok) {
        if (isCompleted && typeof window !== 'undefined') {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }
        }
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to update period lifecycle:', err);
    } finally {
      setUpdatingLifecycle(false);
    }
  };

  const handleStartNextCycle = async () => {
    if (
      !confirm(
        `Buka siklus payroll baru untuk "${nextSuggestion.nextPeriod}" dengan cut-off tanggal ${nextSuggestion.nextCutoff}?`
      )
    ) {
      return;
    }
    setUpdatingLifecycle(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePeriod: nextSuggestion.nextPeriod,
          cutoffDate: nextSuggestion.nextCutoff,
          isPeriodCompleted: false,
          completedAt: '',
        }),
      });
      if (res.ok) {
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to start next cycle:', err);
    } finally {
      setUpdatingLifecycle(false);
    }
  };

  // Hitung selisih hari ke cutoff
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(settings.cutoffDate);
  cutoff.setHours(0, 0, 0, 0);

  const diffTime = cutoff.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Analisis laporan
  const openCount = reports.filter((r) => r.actionStatus === 'OPEN').length;
  const crosscheckCount = reports.filter((r) => r.actionStatus === 'CROSSCHECK').length;
  const totalUnresolved = openCount + crosscheckCount;

  const urgentCount = reports.filter(
    (r) => r.priority === 'URGENT' && r.actionStatus !== 'CLOSE'
  ).length;

  // Laporan Terlambat (Overdue) & Jatuh Tempo Hari Ini / Besok
  const overdueReports = reports.filter(
    (r) => r.dueDate && r.dueDate < todayStr && r.actionStatus !== 'CLOSE'
  );
  const dueSoonReports = reports.filter(
    (r) =>
      r.dueDate &&
      (r.dueDate === todayStr || r.dueDate === tomorrowStr) &&
      r.actionStatus !== 'CLOSE'
  );

  // To-Do List Terlambat & Jatuh Tempo Hari Ini / Besok
  const activeTodoList = todos.filter((t) => !t.isCompleted);
  const overdueTodos = activeTodoList.filter(
    (t) => t.dueDate && t.dueDate < todayStr
  );
  const dueTodayTodos = activeTodoList.filter(
    (t) => t.dueDate === todayStr
  );
  const dueSoonTodos = activeTodoList.filter(
    (t) => t.dueDate && (t.dueDate === todayStr || t.dueDate === tomorrowStr)
  );

  const totalOverdueItems = overdueReports.length + overdueTodos.length;
  const totalDueSoonItems = dueSoonReports.length + dueSoonTodos.length;

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
            {settings.isPeriodCompleted ? (
              <span className="flex items-center flex-wrap gap-2 text-emerald-300">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <span>
                  Payroll {settings.activePeriod} Selesai Diproses! 🎉
                </span>
              </span>
            ) : totalOverdueItems > 0 ? (
              <span className="flex items-center flex-wrap gap-2 text-rose-300">
                <AlertTriangle className="h-6 w-6 text-rose-400 animate-bounce shrink-0" />
                <span>
                  Perhatian: Ada <span className="underline decoration-rose-400 font-extrabold text-white">{totalOverdueItems} item terlambat</span> dari target deadline!
                </span>
              </span>
            ) : totalUnresolved === 0 && activeTodoList.length === 0 ? (
              'Semua laporan & to-do list sudah beres tuntas! 🎉'
            ) : (
              <>
                Ada <span className="text-amber-300 font-extrabold">{totalUnresolved} laporan</span> dan{' '}
                <span className="text-emerald-300 font-extrabold">{activeTodoList.length} to-do</span> dalam agenda Anda
              </>
            )}
          </h2>

          <p className="text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
            {settings.isPeriodCompleted ? (
              <>
                Siklus penggajian {settings.activePeriod} telah tuntas difinalisasi. Dashboard dalam masa standby sampai siklus baru dimulai.
                {totalUnresolved > 0 && (
                  <span className="text-indigo-200 block text-xs mt-1 opacity-90">
                    💡 Catatan: Masih ada {totalUnresolved} tiket laporan tercatat, yang dapat Anda tindak lanjuti pada siklus penggajian berikutnya.
                  </span>
                )}
              </>
            ) : totalOverdueItems > 0 ? (
              <>
                Segera tindaklanjuti:{' '}
                {overdueTodos.length > 0 && (
                  <span className="font-bold text-rose-200 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/30 mr-1.5">
                    🚨 {overdueTodos.length} To-Do terlewat jatuh tempo
                  </span>
                )}
                {overdueReports.length > 0 && (
                  <span className="font-bold text-rose-200 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/30 mr-1.5">
                    ⚠️ {overdueReports.length} Laporan kendala lewat target
                  </span>
                )}
                {totalDueSoonItems > 0 && (
                  <span className="text-amber-200 mt-1 inline-block">
                    • ({dueTodayTodos.length > 0 ? `${dueTodayTodos.length} to-do jatuh tempo hari ini` : ''}
                    {dueSoonReports.length > 0 ? `, ${dueSoonReports.length} laporan mendekati batas waktu` : ''})
                  </span>
                )}
              </>
            ) : totalUnresolved === 0 && activeTodoList.length === 0 ? (
              'Bagus sekali! Tidak ada laporan tertunda dan agenda to-do Anda kosong atau sudah diselesaikan.'
            ) : (
              <>
                Fokus tugas saat ini:{' '}
                {openCount > 0 && (
                  <span className="font-semibold text-amber-200">{openCount} laporan baru (Open), </span>
                )}
                {crosscheckCount > 0 && (
                  <span className="font-semibold text-blue-200">{crosscheckCount} sedang tahap Crosscheck, </span>
                )}
                {activeTodoList.length > 0 && (
                  <span className="font-semibold text-emerald-200">{activeTodoList.length} agenda To-Do aktif. </span>
                )}
                {urgentCount > 0 && (
                  <span className="block mt-1 text-rose-300 font-semibold">
                    ⚠️ {urgentCount} laporan berprioritas TINGGI/URGENT!
                  </span>
                )}
                {totalDueSoonItems > 0 && (
                  <span className="block mt-1 text-amber-300 font-medium">
                    ⏰ {totalDueSoonItems} item mendekati batas waktu (hari ini / besok).
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Status Cutoff & Pengaturan Lifecycle */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-start md:items-end gap-2 shrink-0 w-full sm:w-auto">
          {/* Badge Status Cut-Off / Selesai */}
          <div
            className={`flex items-center justify-between sm:justify-start gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold backdrop-blur-md border ${
              settings.isPeriodCompleted
                ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
                : isCutoffPassed
                ? 'bg-rose-950/70 border-rose-600 text-rose-200'
                : isCutoffNear
                ? 'bg-amber-950/70 border-amber-500 text-amber-200 animate-pulse'
                : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {settings.isPeriodCompleted ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : isCutoffNear || isCutoffPassed ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              ) : (
                <Calendar className="h-4 w-4 shrink-0 text-indigo-300" />
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-indigo-200/80">
                  {settings.isPeriodCompleted ? 'Payroll Selesai' : 'Cut-Off Payroll'}
                </div>
                <div>
                  {settings.cutoffDate}{' '}
                  <span className="text-[11px] font-normal opacity-90">
                    {settings.isPeriodCompleted
                      ? '(Closing Tuntas)'
                      : isCutoffPassed
                      ? '(Lewat ' + Math.abs(diffDays) + ' hari)'
                      : diffDays === 0
                      ? '(Hari ini!)'
                      : '(' + diffDays + ' hari lagi)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Lifecycle Periode */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {settings.isPeriodCompleted ? (
              <>
                <button
                  type="button"
                  onClick={handleStartNextCycle}
                  disabled={updatingLifecycle}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title={`Buka siklus baru untuk ${nextSuggestion.nextPeriod}`}
                >
                  {updatingLifecycle ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FastForward className="h-3.5 w-3.5" />
                  )}
                  <span>Buka {nextSuggestion.nextPeriod} ➔</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleComplete(false)}
                  disabled={updatingLifecycle}
                  className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 p-2 text-xs font-medium text-white transition-all cursor-pointer border border-white/10"
                  title="Buka kembali status periode ini (batalkan selesai)"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleComplete(true)}
                disabled={updatingLifecycle}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm disabled:opacity-50 ${
                  isCutoffPassed
                    ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50 shadow-lg'
                    : 'bg-emerald-600/90 hover:bg-emerald-500'
                }`}
                title="Tandai proses payroll periode ini telah selesai dikerjakan"
              >
                {updatingLifecycle ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Tandai Payroll Selesai</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-2.5 py-2 text-xs font-medium text-white transition-all cursor-pointer border border-white/10"
              title="Atur Periode & Cut-Off"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Atur</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER KHUSUS REMINDER DEADLINE & TERLAMBAT */}
      {(totalOverdueItems > 0 || totalDueSoonItems > 0) && (
        <div className="mt-4 p-3 rounded-xl bg-black/30 backdrop-blur-md border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-extrabold text-amber-300 flex items-center gap-1">
              <Hourglass className="h-3.5 w-3.5" />
              <span>Reminder Batas Waktu:</span>
            </span>

            {overdueTodos.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenTodos && onOpenTodos('OVERDUE')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] shadow-sm cursor-pointer transition-all animate-pulse"
                title="Klik untuk langsung melihat To-Do yang terlambat"
              >
                <Flame className="h-3 w-3 text-amber-300" />
                <span>{overdueTodos.length} To-Do Terlambat</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            )}

            {overdueReports.length > 0 && (
              <button
                type="button"
                onClick={() => onFilterStatus('OVERDUE')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] shadow-sm cursor-pointer transition-all"
                title="Klik untuk memfilter laporan yang lewat target tanggal"
              >
                <Clock className="h-3 w-3 text-amber-300" />
                <span>{overdueReports.length} Laporan Terlambat</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            )}

            {dueTodayTodos.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenTodos && onOpenTodos('TODAY')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-slate-950 font-bold text-[11px] shadow-sm cursor-pointer transition-all"
                title="Klik untuk melihat To-Do dengan deadline hari ini"
              >
                <Clock className="h-3 w-3" />
                <span>{dueTodayTodos.length} To-Do Hari Ini</span>
              </button>
            )}

            {dueSoonReports.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[11px] font-medium">
                <span>{dueSoonReports.length} Laporan Deadline Dekat</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-indigo-200/70 shrink-0 italic">
            Klik tombol untuk langsung membuka daftar tugas
          </div>
        </div>
      )}

      {/* Quick Action Badges */}
      {(totalUnresolved > 0 || activeTodosCount > 0) && (
        <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
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
              onClick={() => onOpenTodos('ACTIVE')}
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
