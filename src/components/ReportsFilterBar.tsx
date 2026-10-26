'use client';

import React, { RefObject } from 'react';
import { Search, Users, Star, RotateCcw } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/types';

export interface ReportsFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  picFilter: 'ALL' | 'MY_TICKETS';
  onPicFilterChange: (val: 'ALL' | 'MY_TICKETS') => void;
  activeProfile: string;
  periodFilter: string;
  onPeriodFilterChange: (val: string) => void;
  availablePeriods: string[];
  activePeriod: string;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  overdueCount: number;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  onResetFilters: () => void;
}

export default function ReportsFilterBar({
  searchQuery,
  onSearchChange,
  searchInputRef,
  picFilter,
  onPicFilterChange,
  activeProfile,
  periodFilter,
  onPeriodFilterChange,
  availablePeriods,
  activePeriod,
  statusFilter,
  onStatusFilterChange,
  overdueCount,
  categoryFilter,
  onCategoryFilterChange,
  onResetFilters,
}: ReportsFilterBarProps) {
  const isAnyFilterActive =
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    periodFilter !== 'ALL' ||
    picFilter !== 'ALL' ||
    Boolean(searchQuery);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
      {/* Search Box */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama pegawai, NRP, No. Tiket, atau Project..."
          className="w-full rounded-xl border border-slate-200 pl-10 pr-16 py-2 text-xs sm:text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Reset
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none font-mono">
            Ctrl+K
          </span>
        )}
      </div>

      {/* Filter Dropdowns & Quick Action */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        {/* Toggle Pilihan: Semua PIC vs Tiket Saya */}
        <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => onPicFilterChange('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              picFilter === 'ALL'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Semua PIC</span>
          </button>
          <button
            type="button"
            onClick={() => onPicFilterChange('MY_TICKETS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              picFilter === 'MY_TICKETS'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title={`Filter hanya tiket milik ${activeProfile}`}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                picFilter === 'MY_TICKETS' ? 'fill-white' : 'text-amber-500'
              }`}
            />
            <span className="sm:hidden">Tiket Saya</span>
            <span className="hidden sm:inline">Tiket Saya ({activeProfile})</span>
          </button>
        </div>

        {/* Filter Periode Payroll */}
        <select
          value={periodFilter}
          onChange={(e) => onPeriodFilterChange(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 shrink-0"
        >
          <option value="ALL">Semua Periode</option>
          {availablePeriods.map((p) => (
            <option key={p} value={p}>
              {p} {p === activePeriod ? '(Aktif)' : ''}
            </option>
          ))}
        </select>

        {/* Filter Status */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 shrink-0"
        >
          <option value="ALL">Semua Status</option>
          <option value="OPEN">🟡 Open</option>
          <option value="CROSSCHECK">🔵 Crosscheck</option>
          <option value="CLOSE">🟢 Close</option>
          {overdueCount > 0 && (
            <option value="OVERDUE">🔴 Terlambat ({overdueCount})</option>
          )}
        </select>

        {/* Filter Kategori */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 shrink-0"
        >
          <option value="ALL">Semua Kategori</option>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        {/* Reset All Filters */}
        {isAnyFilterActive && (
          <button
            onClick={onResetFilters}
            className="shrink-0 flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
            title="Reset Semua Filter"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
