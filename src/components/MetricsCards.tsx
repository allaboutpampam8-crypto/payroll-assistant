'use client';

import React from 'react';
import {
  Inbox,
  AlertCircle,
  SearchCheck,
  CheckCircle2,
  ClockAlert,
  Flame,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  onSelectTodosOverdue?: () => void;
}

export default function MetricsCards({
  metrics,
  activeFilter,
  onSelectFilter,
  onSelectTodosOverdue,
}: MetricsCardsProps) {
  const cards = [
    {
      id: 'ALL',
      title: 'Total Masuk',
      value: metrics.totalReports,
      subtext: 'Seluruh laporan periode ini',
      icon: Inbox,
      color: 'slate',
      borderClass: 'hover:border-slate-400',
      activeClass: 'ring-2 ring-slate-900 border-slate-900 bg-slate-50/80',
      badgeClass: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'OPEN',
      title: 'Open',
      value: metrics.openReports,
      subtext: 'Laporan baru / belum ditangani',
      icon: AlertCircle,
      color: 'amber',
      borderClass: 'hover:border-amber-400',
      activeClass: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/60',
      badgeClass: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'CROSSCHECK',
      title: 'Crosscheck',
      value: metrics.crosscheckReports,
      subtext: 'Sedang diteliti / dicek project',
      icon: SearchCheck,
      color: 'blue',
      borderClass: 'hover:border-blue-400',
      activeClass: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/60',
      badgeClass: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'CLOSE',
      title: 'Close',
      value: metrics.closeReports,
      subtext: 'Selesai ditangani tuntas',
      icon: CheckCircle2,
      color: 'emerald',
      borderClass: 'hover:border-emerald-400',
      activeClass: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/60',
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
  ];

  const hasOverdueReports = (metrics.overdueCount || 0) > 0;
  const hasOverdueTodos = (metrics.overdueTodosCount || 0) > 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const isActive = activeFilter === c.id;

          return (
            <button
              key={c.id}
              onClick={() => onSelectFilter(c.id)}
              className={`flex flex-col justify-between text-left rounded-2xl bg-white p-4 md:p-5 shadow-sm border transition-all cursor-pointer ${
                isActive
                  ? c.activeClass
                  : `border-slate-200/80 ${c.borderClass} hover:shadow-md`
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs md:text-sm font-semibold text-slate-500">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl ${c.badgeClass}`}>
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>

              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {c.value}
                </div>
                <div className="text-[11px] md:text-xs text-slate-400 mt-1 truncate">
                  {c.subtext}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mini Bar Indikator Overdue / Terlambat Cepat */}
      {(hasOverdueReports || hasOverdueTodos) && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping shrink-0" />
            <ClockAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>Perhatian Target Batas Waktu:</strong> Ditemukan item yang melewati target tanggal penyelesaian!
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasOverdueReports && (
              <button
                type="button"
                onClick={() => onSelectFilter('OVERDUE')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer border ${
                  activeFilter === 'OVERDUE'
                    ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                    : 'bg-white hover:bg-rose-100 text-rose-700 border-rose-300'
                }`}
              >
                Lihat {metrics.overdueCount} Laporan Terlambat
              </button>
            )}

            {hasOverdueTodos && onSelectTodosOverdue && (
              <button
                type="button"
                onClick={onSelectTodosOverdue}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
              >
                <Flame className="h-3 w-3 text-amber-300" />
                <span>Lihat {metrics.overdueTodosCount} To-Do Terlambat</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
