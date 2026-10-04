'use client';

import React from 'react';
import {
  Inbox,
  AlertCircle,
  SearchCheck,
  CheckCircle2,
} from 'lucide-react';
import { DashboardMetrics } from '@/lib/types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export default function MetricsCards({
  metrics,
  activeFilter,
  onSelectFilter,
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

  return (
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
  );
}
