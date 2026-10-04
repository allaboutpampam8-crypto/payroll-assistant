'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  ListTodo,
  ClipboardList,
} from 'lucide-react';

import {
  PayrollReport,
  PayrollTodo,
  PayrollSettings,
  DashboardMetrics,
  CATEGORY_LABELS,
  STATUS_CONFIG,
  ActionStatus,
} from '@/lib/types';
import DailyBriefing from '@/components/DailyBriefing';
import MetricsCards from '@/components/MetricsCards';
import QuickEntryModal from '@/components/QuickEntryModal';
import ReportDetailModal from '@/components/ReportDetailModal';
import CutoffSettingsModal from '@/components/CutoffSettingsModal';
import TodoListWidget from '@/components/TodoListWidget';
import { exportReportsToExcel } from '@/lib/exportExcel';

export default function AssistantDashboard() {
  const [reports, setReports] = useState<PayrollReport[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>({
    activePeriod: 'Oktober 2026',
    cutoffDate: '2026-10-25',
    assistantName: 'Asisten Payroll',
    companyName: 'PT Pelindo Daya Sejahtera',
  });
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalReports: 0,
    openReports: 0,
    crosscheckReports: 0,
    closeReports: 0,
    overdueCount: 0,
    urgentCount: 0,
  });

  // To-Do List state & Tab Navigation
  const [todos, setTodos] = useState<PayrollTodo[]>([]);
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'TODOS'>('REPORTS');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, CROSSCHECK, CLOSE
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL'); // ALL or specific period

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // default 10 per page

  // Modals state
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PayrollReport | null>(null);

  // Toast notice for copied link
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchDashboardData = useCallback(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setReports(json.data.reports || []);
          setMetrics(json.data.metrics);
          setSettings(json.data.settings);
        }
      })
      .catch((err) => {
        console.error('Failed to load reports:', err);
      });
  }, []);

  const fetchTodos = useCallback(() => {
    fetch('/api/todos')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setTodos(json.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load todos:', err);
      });
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchTodos();
  }, [fetchDashboardData, fetchTodos]);

  // Unique list of periods available
  const availablePeriods = Array.from(
    new Set([settings.activePeriod, ...reports.map((r) => r.period).filter(Boolean)])
  );

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (st: string) => {
    setStatusFilter(st);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handlePeriodFilterChange = (per: string) => {
    setPeriodFilter(per);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Quick 1-click update status from list
  const handleQuickStatusChange = async (
    reportId: string,
    newStatus: ActionStatus
  ) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionStatus: newStatus }),
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to quick-update status:', err);
    }
  };

  const handleCopyPublicLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/lapor`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleExport = () => {
    const exportPeriodTitle =
      periodFilter === 'ALL' ? settings.activePeriod : periodFilter;
    exportReportsToExcel(filteredReports, exportPeriodTitle);
  };

  // Filtered reports logic
  const filteredReports = reports.filter((r) => {
    // Search
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeNik.toLowerCase().includes(q) ||
      r.ticketNumber.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q);

    // Category
    const matchCategory =
      categoryFilter === 'ALL' || r.category === categoryFilter;

    // Status
    let matchStatus = true;
    if (statusFilter !== 'ALL') {
      matchStatus = r.actionStatus === statusFilter;
    }

    // Period
    const matchPeriod =
      periodFilter === 'ALL' || r.period === periodFilter;

    return matchSearch && matchCategory && matchStatus && matchPeriod;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredReports.length);
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  const formatRupiah = (val?: number) => {
    if (!val || val === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                  {settings.assistantName}
                </h1>
                <span className="hidden sm:inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-none">
                {settings.companyName} • {settings.activePeriod}
              </p>
            </div>
          </div>

          {/* Action Buttons Navbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPublicLink}
              title="Salin Link Form Lapor Karyawan"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Link Form</span>
                </>
              )}
            </button>

            <button
              onClick={handleExport}
              title="Unduh Rekap Excel"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Rekap Excel</span>
            </button>

            <button
              onClick={() => setIsQuickEntryOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Laporan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Toast Notifikasi Berhasil Salin Link */}
        {copiedLink && (
          <div className="fixed top-16 right-4 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-medium shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Link form lapor karyawan berhasil disalin ke clipboard!</span>
          </div>
        )}

        {/* 1. Daily Briefing Card */}
        <DailyBriefing
          settings={settings}
          reports={reports}
          activeTodosCount={todos.filter((t) => !t.isCompleted).length}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onFilterStatus={(st) => {
            handleStatusFilterChange(st);
            setActiveTab('REPORTS');
          }}
          onOpenTodos={() => setActiveTab('TODOS')}
        />

        {/* 2. Interactive Metrics Cards (Open, Crosscheck, Close) */}
        <MetricsCards
          metrics={metrics}
          activeFilter={statusFilter}
          onSelectFilter={(st) => {
            handleStatusFilterChange(st);
            setActiveTab('REPORTS');
          }}
        />

        {/* Navigation Tabs (Laporan vs To-Do List) */}
        <div className="flex items-center gap-2 border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('REPORTS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'REPORTS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Laporan Kendala</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'REPORTS'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {reports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TODOS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'TODOS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>To-Do List Asisten</span>
            {todos.filter((t) => !t.isCompleted).length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                {todos.filter((t) => !t.isCompleted).length} aktif
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {todos.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'TODOS' ? (
          /* Widget To-Do List Pribadi */
          <TodoListWidget
            todos={todos}
            onRefresh={() => {
              fetchTodos();
              fetchDashboardData();
            }}
          />
        ) : (
          /* Tampilan Laporan Payroll */
          <>
            {/* 3. Search & Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama pegawai, NRP, No. Tiket, atau Project..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-xs sm:text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Reset
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Filter Periode Payroll */}
            <select
              value={periodFilter}
              onChange={(e) => handlePeriodFilterChange(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 shrink-0"
            >
              <option value="ALL">Semua Periode</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {p} {p === settings.activePeriod ? '(Aktif)' : ''}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-slate-50 text-slate-700 outline-none focus:border-indigo-600 shrink-0"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">🟡 Open</option>
              <option value="CROSSCHECK">🔵 Crosscheck</option>
              <option value="CLOSE">🟢 Close</option>
            </select>

            {/* Filter Kategori */}
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
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
            {(statusFilter !== 'ALL' || categoryFilter !== 'ALL' || periodFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                  setPeriodFilter('ALL');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="shrink-0 flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
                title="Reset Semua Filter"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Task / Reports List & Pagination */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1 gap-1">
            <span>
              Daftar Laporan ({filteredReports.length} laporan)
              {periodFilter !== 'ALL' && (
                <span className="text-indigo-600 font-semibold normal-case ml-1.5">
                  • Periode {periodFilter}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2 font-normal normal-case text-slate-400">
              {filteredReports.length > 0 && (
                <span>
                  Halaman {currentPage} dari {totalPages}
                </span>
              )}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Tidak ada laporan yang sesuai kriteria
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {reports.length === 0
                  ? 'Belum ada laporan payroll yang dicatat.'
                  : 'Coba ubah kata kunci pencarian atau sesuaikan filter periode dan status.'}
              </p>
              {reports.length === 0 && (
                <button
                  onClick={() => setIsQuickEntryOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Catat Laporan Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {paginatedReports.map((report) => {
                  const statusInfo = STATUS_CONFIG[report.actionStatus] || {
                    label: report.actionStatus,
                    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
                    isClosed: false,
                  };
                  const isUrgent = report.priority === 'URGENT';

                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="group rounded-2xl bg-white p-4 md:p-5 border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left Info */}
                      <div className="space-y-2 flex-1">
                        {/* Baris Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {report.ticketNumber}
                          </span>

                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.label}
                          </span>

                          {isUrgent && !statusInfo.isClosed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              URGENT
                            </span>
                          )}

                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 font-semibold">
                            {report.period}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            {new Date(report.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>

                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                            {report.source === 'FORM_KARYAWAN' ? 'Form Mandiri' : 'Dicatat PIC'}
                          </span>
                        </div>

                        {/* Nama & Project */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {report.employeeName}
                            </h4>
                            <span className="text-xs text-slate-500">
                              (NRP: {report.employeeNik} • {report.department})
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                            {CATEGORY_LABELS[report.category] || report.category}
                          </p>
                        </div>

                        {/* Deskripsi Kronologi Singkat */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {report.description}
                        </p>

                        {/* Catatan Tindak Lanjut jika ada */}
                        {report.resolutionNotes && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 line-clamp-1">
                            <span className="font-semibold text-slate-700">Tindak Lanjut:</span>{' '}
                            {report.resolutionNotes}
                          </div>
                        )}
                      </div>

                      {/* Right Info: Nominal & Quick Action Status */}
                      <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0 gap-2">
                        <div className="text-left md:text-right">
                          <div className="text-[10px] uppercase font-semibold text-slate-400">
                            Estimasi Selisih
                          </div>
                          <div className="text-sm md:text-base font-bold text-slate-900">
                            {formatRupiah(report.discrepancyAmount)}
                          </div>
                        </div>

                        {/* 1-Click Status Quick Action Dropdown */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={report.actionStatus}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                report.id,
                                e.target.value as ActionStatus
                              )
                            }
                            className="text-[11px] font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="OPEN">Open</option>
                            <option value="CROSSCHECK">Crosscheck</option>
                            <option value="CLOSE">Close</option>
                          </select>

                          <button
                            onClick={() => setSelectedReport(report)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Lihat Detail & Catatan"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200/80 shadow-xs mt-3">
                {/* Informasi Rentang Data & Pilihan Jumlah Baris */}
                <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-start">
                  <span>
                    Menampilkan <strong className="text-slate-700">{filteredReports.length > 0 ? startIndex + 1 : 0}</strong> -{' '}
                    <strong className="text-slate-700">{endIndex}</strong> dari{' '}
                    <strong className="text-slate-700">{filteredReports.length}</strong> laporan
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="hidden md:inline">Baris:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:border-indigo-600"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Tombol Navigasi Halaman */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </button>

                  {/* Indikator Tombol Nomor Halaman */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-1 text-xs text-slate-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                currentPage === page
                                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                                  : 'text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span className="hidden sm:inline">Selanjutnya</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      </main>

      {/* Floating Bottom Bar Khusus Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shadow-2xl">
        <button
          onClick={() => setActiveTab(activeTab === 'REPORTS' ? 'TODOS' : 'REPORTS')}
          className={`flex items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'TODOS'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={activeTab === 'REPORTS' ? 'Buka To-Do List' : 'Buka Laporan'}
        >
          {activeTab === 'REPORTS' ? (
            <ListTodo className="h-5 w-5" />
          ) : (
            <ClipboardList className="h-5 w-5" />
          )}
        </button>

        <Link
          href="/lapor"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
        >
          <ExternalLink className="h-4 w-4 text-slate-500" />
          <span>Form Pegawai</span>
        </Link>

        <button
          onClick={handleExport}
          className="flex items-center justify-center p-2.5 rounded-xl text-emerald-700 bg-emerald-50 border border-emerald-200"
          title="Rekap Excel"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsQuickEntryOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 shadow-md shadow-indigo-600/30"
        >
          <Plus className="h-4 w-4" />
          <span>Catat Laporan</span>
        </button>
      </div>

      {/* Modals */}
      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={() => setIsQuickEntryOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          fetchTodos();
        }}
        activePeriod={settings.activePeriod}
      />

      <ReportDetailModal
        report={selectedReport}
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        onUpdated={() => {
          fetchDashboardData();
          fetchTodos();
        }}
      />

      <CutoffSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={fetchDashboardData}
      />
    </div>
  );
}
