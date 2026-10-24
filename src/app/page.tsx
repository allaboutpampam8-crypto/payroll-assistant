'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  ListTodo,
  ClipboardList,
  Database,
  Scissors,
  Calculator,
  Lock,
  Wrench,
  LayoutGrid,
  Table,
  Building2,
  MessageCircle,
  Paperclip,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  Users,
  User,
  Star,
} from 'lucide-react';

import {
  PayrollReport,
  PayrollTodo,
  PayrollSettings,
  DashboardMetrics,
  CATEGORY_LABELS,
  STATUS_CONFIG,
  ActionStatus,
  AppUserProfile,
  APP_USER_PROFILES,
} from '@/lib/types';
import DailyBriefing from '@/components/DailyBriefing';
import MetricsCards from '@/components/MetricsCards';
import QuickEntryModal from '@/components/QuickEntryModal';
import ReportDetailModal from '@/components/ReportDetailModal';
import CutoffSettingsModal from '@/components/CutoffSettingsModal';
import PayrollResultsModal from '@/components/PayrollResultsModal';
import TerbilangModal from '@/components/TerbilangModal';
import PinLockScreen from '@/components/PinLockScreen';
import TodoListWidget, { TodoFilterType } from '@/components/TodoListWidget';
import AiChatWidget from '@/components/AiChatWidget';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import { exportReportsToExcel } from '@/lib/exportExcel';

type SortField =
  | 'ticketNumber'
  | 'actionStatus'
  | 'employeeName'
  | 'department'
  | 'category'
  | 'discrepancyAmount'
  | 'createdAt'
  | 'picName';

type SortOrder = 'asc' | 'desc';

export default function AssistantDashboard() {
  const [reports, setReports] = useState<PayrollReport[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>({
    activePeriod: 'Oktober 2026',
    cutoffDate: '2026-10-23',
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
  const [todoFilter, setTodoFilter] = useState<TodoFilterType>('ACTIVE');

  // Multi-User Profile State: Pampam, Wahid, Izul, Ucup
  const [activeProfile, setActiveProfile] = useState<AppUserProfile>('Pampam');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [picFilter, setPicFilter] = useState<'ALL' | 'MY_TICKETS'>('ALL');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, CROSSCHECK, CLOSE
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL'); // ALL or specific period
  const [viewMode, setViewMode] = useState<'CARD' | 'TABLE'>('TABLE');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // default 10 per page

  // Sorting State (Rekomendasi 2)
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Attachment Direct Preview Lightbox (Rekomendasi 5)
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    name: string;
    ticketNumber: string;
    report: PayrollReport;
  } | null>(null);

  // Multi-Select & Bulk Actions (Rekomendasi 6)
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkToastMessage, setBulkToastMessage] = useState<string | null>(null);

  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Modals & Popovers state
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isTerbilangOpen, setIsTerbilangOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PayrollReport | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load Saved Active Profile
  useEffect(() => {
    const saved = localStorage.getItem('lapor_payroll_active_user') as AppUserProfile;
    if (saved && ['Pampam', 'Wahid', 'Izul', 'Ucup'].includes(saved)) {
      setActiveProfile(saved);
    }
  }, []);

  const fetchDashboardData = useCallback(() => {
    return fetch('/api/reports')
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

  const fetchTodos = useCallback((targetUser?: string) => {
    const userToFetch = targetUser || activeProfile;
    // Khusus Ucup (Superintendent), ambil seluruh to-do tim agar bisa dipantau & didelegasikan
    const query = userToFetch === 'Ucup' ? '' : `?user=${encodeURIComponent(userToFetch)}`;
    return fetch(`/api/todos${query}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setTodos(json.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load todos:', err);
      });
  }, [activeProfile]);

  const handleSwitchProfile = (prof: AppUserProfile) => {
    setActiveProfile(prof);
    localStorage.setItem('lapor_payroll_active_user', prof);
    setIsProfileDropdownOpen(false);
    fetchTodos(prof);
  };

  useEffect(() => {
    const isAuth = localStorage.getItem('payroll_pin_authenticated') === 'true';
    setIsAuthenticated(isAuth);
    setIsAuthChecking(false);

    const savedViewMode = localStorage.getItem('payroll_dashboard_view_mode') as 'CARD' | 'TABLE';
    if (savedViewMode) {
      setViewMode(savedViewMode);
    } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('CARD'); // Otomatis Card View di Handphone agar pas tanpa scroll horizontal
    }

    const savedPageSize = localStorage.getItem('payroll_dashboard_page_size');
    if (savedPageSize) {
      const parsedSize = Number(savedPageSize);
      if ([5, 10, 20, 50].includes(parsedSize)) {
        setPageSize(parsedSize);
      }
    }

    Promise.all([fetchDashboardData(), fetchTodos()]).finally(() => {
      setIsInitialLoading(false);
    });

    // Smart Polling: Hemat baterai & kuota saat browser di HP diminimalkan
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchDashboardData();
      fetchTodos();
    }, 15000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchDashboardData();
        fetchTodos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDashboardData, fetchTodos]);

  const handleLogout = () => {
    localStorage.removeItem('payroll_pin_authenticated');
    setIsAuthenticated(false);
  };

  const handleViewModeChange = (mode: 'CARD' | 'TABLE') => {
    setViewMode(mode);
    localStorage.setItem('payroll_dashboard_view_mode', mode);
  };

  // Keyboard Shortcuts (Ctrl+K, N, P, T, V, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;

      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!isInput) {
        if (e.key === '/') {
          e.preventDefault();
          searchInputRef.current?.focus();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          setIsQuickEntryOpen(true);
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setIsPayrollModalOpen(true);
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          setActiveTab((prev) => (prev === 'REPORTS' ? 'TODOS' : 'REPORTS'));
        } else if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          handleViewModeChange(viewMode === 'CARD' ? 'TABLE' : 'CARD');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, viewMode]);

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
    localStorage.setItem('payroll_dashboard_page_size', String(size));
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
      r.department.toLowerCase().includes(q) ||
      (r.reportedBy && r.reportedBy.toLowerCase().includes(q));

    // Category
    const matchCategory =
      categoryFilter === 'ALL' || r.category === categoryFilter;

    // Status
    let matchStatus = true;
    if (statusFilter === 'OVERDUE') {
      const todayStr = new Date().toISOString().split('T')[0];
      matchStatus = Boolean(r.dueDate && r.dueDate < todayStr && r.actionStatus !== 'CLOSE');
    } else if (statusFilter !== 'ALL') {
      matchStatus = r.actionStatus === statusFilter;
    }

    // Period
    const matchPeriod =
      periodFilter === 'ALL' || r.period === periodFilter;

    // Multi-User PIC Filter: Hanya 'ALL' (Semua PIC) atau 'MY_TICKETS' (Tiket Saya)
    let matchPic = true;
    if (picFilter === 'MY_TICKETS') {
      const reportPic = r.picName || 'Pampam';
      matchPic = reportPic === activeProfile;
    }

    return matchSearch && matchCategory && matchStatus && matchPeriod && matchPic;
  });

  // Dynamic Metrics: Menyesuaikan saat filter "Tiket Saya" atau "Semua PIC" aktif
  const displayMetrics = useMemo<DashboardMetrics>(() => {
    if (picFilter === 'ALL' && periodFilter === 'ALL') {
      return metrics;
    }

    const targetReports = reports.filter((r) => {
      if (periodFilter !== 'ALL' && r.period !== periodFilter) return false;
      if (picFilter === 'MY_TICKETS') {
        const reportPic = r.picName || 'Pampam';
        if (reportPic !== activeProfile) return false;
      }
      return true;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const totalReports = targetReports.length;
    const openReports = targetReports.filter((r) => r.actionStatus === 'OPEN').length;
    const crosscheckReports = targetReports.filter((r) => r.actionStatus === 'CROSSCHECK').length;
    const closeReports = targetReports.filter((r) => r.actionStatus === 'CLOSE').length;
    const overdueCount = targetReports.filter(
      (r) => r.dueDate && r.dueDate < todayStr && r.actionStatus !== 'CLOSE'
    ).length;
    const urgentCount = targetReports.filter(
      (r) => r.priority === 'URGENT' && r.actionStatus !== 'CLOSE'
    ).length;

    const activeTodos = todos.filter((t) => !t.isCompleted);
    const overdueTodosCount = activeTodos.filter(
      (t) => t.dueDate && t.dueDate < todayStr
    ).length;

    return {
      totalReports,
      openReports,
      crosscheckReports,
      closeReports,
      overdueCount,
      urgentCount,
      overdueTodosCount,
    };
  }, [picFilter, periodFilter, reports, activeProfile, metrics, todos]);

  // Sorting (Rekomendasi 2)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'discrepancyAmount' || field === 'createdAt') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
    setCurrentPage(1);
  };

  const sortedReports = useMemo(() => {
    const list = [...filteredReports];
    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'discrepancyAmount') {
        comparison = (a.discrepancyAmount || 0) - (b.discrepancyAmount || 0);
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'actionStatus') {
        const orderMap: Record<ActionStatus, number> = {
          OPEN: 1,
          CROSSCHECK: 2,
          CLOSE: 3,
        };
        comparison = (orderMap[a.actionStatus] || 0) - (orderMap[b.actionStatus] || 0);
      } else if (sortField === 'picName') {
        const picA = a.picName || 'Pampam';
        const picB = b.picName || 'Pampam';
        comparison = picA.localeCompare(picB, 'id-ID');
      } else {
        const valA = (a[sortField] || '').toString().toLowerCase();
        const valB = (b[sortField] || '').toString().toLowerCase();
        comparison = valA.localeCompare(valB, 'id-ID');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredReports, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedReports.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedReports.length);
  const paginatedReports = sortedReports.slice(startIndex, startIndex + pageSize);

  // Multi-Select & Bulk Actions (Rekomendasi 6)
  const isAllVisibleSelected =
    paginatedReports.length > 0 &&
    paginatedReports.every((r) => selectedReportIds.has(r.id));

  const isSomeVisibleSelected =
    paginatedReports.some((r) => selectedReportIds.has(r.id)) && !isAllVisibleSelected;

  const handleToggleSelectAllVisible = () => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedReports.forEach((r) => next.delete(r.id));
      } else {
        paginatedReports.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedReportIds(new Set(filteredReports.map((r) => r.id)));
  };

  const handleClearSelection = () => {
    setSelectedReportIds(new Set());
  };

  const handleBulkStatusUpdate = async (status: ActionStatus) => {
    if (selectedReportIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedReportIds);
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, actionStatus: status }),
      });
      const data = await res.json();
      if (data.success) {
        const statusLabel =
          status === 'CLOSE' ? 'Selesai (Close)' : status === 'CROSSCHECK' ? 'Crosscheck' : 'Open';
        setBulkToastMessage(`${ids.length} laporan berhasil diubah ke status ${statusLabel}!`);
        setTimeout(() => setBulkToastMessage(null), 3500);
        setSelectedReportIds(new Set());
        fetchDashboardData();
        fetchTodos();
      } else {
        alert(data.message || 'Gagal mengubah status massal.');
      }
    } catch (err) {
      console.error('Error bulk updating:', err);
      alert('Terjadi kesalahan saat memproses pembaruan massal.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkExportExcel = () => {
    if (selectedReportIds.size === 0) return;
    const selectedList = reports.filter((r) => selectedReportIds.has(r.id));
    const title = `Terpilih_${selectedList.length}_Tiket_${settings.activePeriod}`;
    exportReportsToExcel(selectedList, title);
  };

  const formatRupiah = (val?: number) => {
    if (!val || val === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isAuthChecking) {
    return <PageLoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <PinLockScreen
        onSuccess={(selectedUser) => {
          setIsAuthenticated(true);
          setActiveProfile(selectedUser);
        }}
        assistantName={settings.assistantName}
        companyName={settings.companyName}
      />
    );
  }

  const activeProfileInfo = APP_USER_PROFILES.find((p) => p.id === activeProfile) || APP_USER_PROFILES[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Loading Screen Animasi Maskot saat Pertama Kali Mengambil Data Database */}
      {isInitialLoading && <PageLoadingScreen />}

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-indigo-600 shadow-md shadow-indigo-600/25 overflow-hidden border border-indigo-400/30">
              <Image
                src="/mascot/avatar.png"
                alt="Maskot Asisten"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                  {settings.assistantName}
                </h1>
                <span className="hidden md:inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 shrink-0">
                  Tim Aktif
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                {settings.companyName} • {settings.activePeriod}
              </p>
            </div>
          </div>

          {/* Action Buttons Navbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Profil Aktif Switcher (Multi-User) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isProfileDropdownOpen
                    ? 'border-indigo-400 bg-indigo-50/80 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Klik untuk beralih profil pengguna"
              >
                <div
                  className={`h-5 w-5 rounded-md flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 ${activeProfileInfo.avatarBg}`}
                >
                  {activeProfile.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-xs font-bold text-slate-900">{activeProfile}</span>
                  <span className="text-[9px] font-semibold text-slate-400 hidden lg:inline">
                    {activeProfileInfo.roleLabel}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${
                    isProfileDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 sm:w-60 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                      <span>Beralih Profil Tim</span>
                      <span className="text-[9px] font-normal text-slate-400">Pilih PIC</span>
                    </div>
                    {APP_USER_PROFILES.map((prof) => {
                      const isActive = activeProfile === prof.id;
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => handleSwitchProfile(prof.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-900 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${prof.avatarBg}`}
                            >
                              {prof.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold">{prof.name}</div>
                              <div className="text-[10px] text-slate-400">{prof.roleLabel}</div>
                            </div>
                          </div>
                          {isActive && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}

                    <div className="pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>Kunci Layar (Keluar)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dropdown Alat Bantu Payroll */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsToolsDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                  isToolsDropdownOpen
                    ? 'border-indigo-400 bg-indigo-50/80 text-indigo-800'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Database className="h-3.5 w-3.5 text-indigo-600" />
                <span>Alat Bantu</span>
                <ChevronDown
                  className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                    isToolsDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {isToolsDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsToolsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                    <button
                      onClick={() => {
                        setIsToolsDropdownOpen(false);
                        setIsPayrollModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-indigo-50/70 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Data & Analisis Payroll</p>
                        <p className="text-[11px] text-slate-500">Cari & komparasi gaji 17k+ pegawai</p>
                      </div>
                    </button>

                    <Link
                      href="/tools/excel-splitter"
                      onClick={() => setIsToolsDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-sky-50/70 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                        <Scissors className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Pemecah Excel HRIS</p>
                        <p className="text-[11px] text-slate-500">Bagi file per 1000 baris format utuh</p>
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsToolsDropdownOpen(false);
                        setIsTerbilangOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50/70 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Kalkulator Terbilang ND</p>
                        <p className="text-[11px] text-slate-500">Konversi nominal ke kalimat Nota Dinas</p>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      onClick={() => {
                        setIsToolsDropdownOpen(false);
                        handleExport();
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50/70 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Unduh Rekap Tiket</p>
                        <p className="text-[11px] text-slate-500">Export laporan kendala ke Excel</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Tombol Catat Laporan */}
            <button
              onClick={() => setIsQuickEntryOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Laporan</span>
            </button>

            {/* Tombol Kunci Layar */}
            <button
              onClick={handleLogout}
              title="Kunci Layar Dashboard (PIN Security)"
              className="shrink-0 flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 md:pb-12 space-y-4 sm:space-y-6">
        {/* 1. Daily Briefing Card */}
        <DailyBriefing
          settings={settings}
          reports={reports}
          todos={todos}
          activeTodosCount={todos.filter((t) => !t.isCompleted).length}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRefresh={fetchDashboardData}
          onFilterStatus={(st) => {
            handleStatusFilterChange(st);
            setActiveTab('REPORTS');
          }}
          onOpenTodos={(filter) => {
            if (filter) setTodoFilter(filter);
            setActiveTab('TODOS');
          }}
        />

        {/* 2. Interactive Metrics Cards */}
        <MetricsCards
          metrics={displayMetrics}
          scopeLabel={picFilter === 'MY_TICKETS' ? `Milik ${activeProfile}` : undefined}
          activeFilter={statusFilter}
          onSelectFilter={(st) => {
            handleStatusFilterChange(st);
            setActiveTab('REPORTS');
          }}
          onSelectTodosOverdue={() => {
            setTodoFilter('OVERDUE');
            setActiveTab('TODOS');
          }}
        />

        {/* Navigation Tabs (Laporan vs To-Do List) */}
        <div className="flex items-center justify-between border-b border-slate-200/80 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('REPORTS')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'REPORTS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Laporan ({reports.length})</span>
              <span className="hidden sm:inline">Monitoring Laporan Tim ({reports.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TODOS')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'TODOS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListTodo className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">To-Do ({activeProfile})</span>
              <span className="hidden sm:inline">To-Do List Mandiri ({activeProfile})</span>
              {todos.filter((t) => !t.isCompleted).length > 0 && (
                <span className="rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.2 shrink-0">
                  {todos.filter((t) => !t.isCompleted).length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <span>Profil Aktif:</span>
            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              {activeProfile} ({activeProfileInfo.roleLabel})
            </span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'TODOS' ? (
          <TodoListWidget
            todos={todos}
            initialFilter={todoFilter}
            activeUser={activeProfile}
            onRefresh={() => {
              fetchTodos();
              fetchDashboardData();
            }}
          />
        ) : (
          /* Tampilan Laporan Payroll */
          <>
            {/* Superintendent Overview Card (Khusus login sebagai Ucup) */}
            {activeProfile === 'Ucup' && (
              <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-lg border border-purple-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                        Superintendent Oversight • Pantauan Beban Kerja Tim
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Pantauan statistik dan distribusi beban kerja 3 PIC Payroll.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold bg-purple-500/30 px-3 py-1 rounded-full border border-purple-400/40 text-purple-100">
                    Total: {reports.length} Tiket Periode Ini
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {(['Pampam', 'Wahid', 'Izul'] as const).map((pic) => {
                    const picReports = reports.filter((r) => r.picName === pic || (!r.picName && pic === 'Pampam'));
                    const openCount = picReports.filter((r) => r.actionStatus === 'OPEN').length;
                    const crosscheckCount = picReports.filter((r) => r.actionStatus === 'CROSSCHECK').length;
                    const closeCount = picReports.filter((r) => r.actionStatus === 'CLOSE').length;

                    return (
                      <div
                        key={pic}
                        className="p-3 rounded-xl border bg-white/10 border-white/10 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-400" />
                            PIC {pic}
                          </span>
                          <span className="text-[11px] font-mono text-purple-200 font-semibold">
                            {picReports.length} tiket
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold">
                          <span className="text-amber-300">🟡 {openCount} Open</span>
                          <span className="text-sky-300">🔵 {crosscheckCount} Cross</span>
                          <span className="text-emerald-300">🟢 {closeCount} Done</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Search & Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Cari nama pegawai, NRP, No. Tiket, atau Project..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-16 py-2 text-xs sm:text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
                {searchQuery ? (
                  <button
                    onClick={() => handleSearchChange('')}
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
                    onClick={() => {
                      setPicFilter('ALL');
                      setCurrentPage(1);
                    }}
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
                    onClick={() => {
                      setPicFilter('MY_TICKETS');
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      picFilter === 'MY_TICKETS'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title={`Filter hanya tiket milik ${activeProfile}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${picFilter === 'MY_TICKETS' ? 'fill-white' : 'text-amber-500'}`} />
                    <span className="sm:hidden">Tiket Saya</span>
                    <span className="hidden sm:inline">Tiket Saya ({activeProfile})</span>
                  </button>
                </div>

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
                  {metrics.overdueCount > 0 && (
                    <option value="OVERDUE">🔴 Terlambat ({metrics.overdueCount})</option>
                  )}
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
                {(statusFilter !== 'ALL' || categoryFilter !== 'ALL' || periodFilter !== 'ALL' || picFilter !== 'ALL' || searchQuery) && (
                  <button
                    onClick={() => {
                      setStatusFilter('ALL');
                      setCategoryFilter('ALL');
                      setPeriodFilter('ALL');
                      setPicFilter('ALL');
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Daftar Laporan ({filteredReports.length} laporan)
                    {picFilter === 'MY_TICKETS' && (
                      <span className="text-amber-600 font-semibold normal-case ml-1.5">
                        • Milik {activeProfile}
                      </span>
                    )}
                    {periodFilter !== 'ALL' && (
                      <span className="text-indigo-600 font-semibold normal-case ml-1.5">
                        • Periode {periodFilter}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-normal normal-case text-slate-400 justify-between sm:justify-end">
                  {filteredReports.length > 0 && (
                    <span className="text-xs">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                  )}

                  {/* Toggle Tampilan: Tabel Padat vs Kartu */}
                  <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleViewModeChange('TABLE')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === 'TABLE'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Tampilan Tabel Ringkas"
                    >
                      <Table className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Tabel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewModeChange('CARD')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === 'CARD'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Tampilan Kartu Lengkap"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Kartu</span>
                    </button>
                  </div>
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-white shadow-xs">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tidak ada laporan yang sesuai kriteria
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
                    {reports.length === 0
                      ? 'Belum ada laporan payroll yang dicatat.'
                      : 'Coba ubah kata kunci pencarian, filter status, atau filter PIC Anda.'}
                  </p>
                  {reports.length === 0 && (
                    <button
                      onClick={() => setIsQuickEntryOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Catat Laporan Pertama</span>
                    </button>
                  )}
                </div>
              ) : viewMode === 'CARD' ? (
                /* Card View (Tampilan Kartu) */
                <div className="space-y-3">
                  {/* Bilah Pilih Semua di Mode Kartu */}
                  {paginatedReports.length > 0 && (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs">
                      <label
                        className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label="Pilih semua kartu di halaman ini"
                          checked={isAllVisibleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeVisibleSelected;
                          }}
                          onChange={handleToggleSelectAllVisible}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>
                          {isAllVisibleSelected ? 'Batalkan Semua' : 'Pilih Semua Halaman Ini'}
                        </span>
                      </label>
                      {selectedReportIds.size > 0 && (
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                          {selectedReportIds.size} dipilih
                        </span>
                      )}
                    </div>
                  )}

                  {paginatedReports.map((report) => {
                    const statusInfo = STATUS_CONFIG[report.actionStatus] || {
                      label: report.actionStatus,
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
                      isClosed: false,
                    };
                    const isUrgent = report.priority === 'URGENT';
                    const reportPic = report.picName || 'Pampam';
                    const isSelected = selectedReportIds.has(report.id);

                    return (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`group rounded-2xl bg-white p-3.5 sm:p-5 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50/25 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md'
                        }`}
                      >
                        {/* Checkbox & Left Info Container */}
                        <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                          {/* Checkbox Card */}
                          <div
                            className="pt-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="p-1 -m-1 flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                aria-label={`Pilih tiket ${report.ticketNumber}`}
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(report.id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </label>
                          </div>

                          {/* Detail Info */}
                          <div className="space-y-2 flex-1 min-w-0">
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

                              {/* Badge PIC */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                👤 {reportPic}
                              </span>

                              {/* Tombol Lampiran Bukti */}
                              {report.attachmentUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewAttachment({
                                      url: report.attachmentUrl!,
                                      name: report.attachmentName || 'Bukti Laporan',
                                      ticketNumber: report.ticketNumber,
                                      report,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                  title={report.attachmentName ? `Klik untuk lihat lampiran: ${report.attachmentName}` : 'Klik untuk lihat lampiran bukti'}
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span>Bukti</span>
                                </button>
                              )}

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

                              {report.reportedBy && (
                                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 font-medium">
                                  🗣️ Pelapor: {report.reportedBy}
                                </span>
                              )}
                            </div>

                            {/* Nama & Project */}
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                                <h4 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {report.employeeName}
                                </h4>
                                <span className="text-xs text-slate-500">
                                  NRP: {report.employeeNik} • {report.department}
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
              ) : (
                /* Compact Table View (Tabel Padat) */
                <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          {/* Checkbox Header (Rekomendasi 6) */}
                          <th className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                            <label className="p-2 -m-2 flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                aria-label="Pilih semua baris halaman ini"
                                checked={isAllVisibleSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isSomeVisibleSelected;
                                }}
                                onChange={handleToggleSelectAllVisible}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </label>
                          </th>
                          <th className="py-3 px-2 w-8 text-center text-slate-400">#</th>

                          {/* No. Tiket */}
                          <th
                            onClick={() => handleSort('ticketNumber')}
                            className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan No. Tiket"
                          >
                            <div className="flex items-center gap-1">
                              <span>No. Tiket</span>
                              {sortField === 'ticketNumber' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* Status */}
                          <th
                            onClick={() => handleSort('actionStatus')}
                            className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan Status"
                          >
                            <div className="flex items-center gap-1">
                              <span>Status</span>
                              {sortField === 'actionStatus' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* PIC Penanggung Jawab */}
                          <th
                            onClick={() => handleSort('picName')}
                            className="py-3 px-3 w-24 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan PIC"
                          >
                            <div className="flex items-center gap-1">
                              <span>PIC</span>
                              {sortField === 'picName' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* Pegawai & NRP */}
                          <th
                            onClick={() => handleSort('employeeName')}
                            className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan Nama Pegawai"
                          >
                            <div className="flex items-center gap-1">
                              <span>Pegawai & NRP</span>
                              {sortField === 'employeeName' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* Project / Cost Center */}
                          <th
                            onClick={() => handleSort('department')}
                            className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan Project"
                          >
                            <div className="flex items-center gap-1">
                              <span>Project / Cost Center</span>
                              {sortField === 'department' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* Kategori */}
                          <th
                            onClick={() => handleSort('category')}
                            className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan Kategori"
                          >
                            <div className="flex items-center gap-1">
                              <span>Kategori</span>
                              {sortField === 'category' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* Selisih */}
                          <th
                            onClick={() => handleSort('discrepancyAmount')}
                            className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan Selisih Nominal"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Selisih</span>
                              {sortField === 'discrepancyAmount' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          {/* Tgl */}
                          <th
                            onClick={() => handleSort('createdAt')}
                            className="py-3 px-3 w-20 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                            title="Klik untuk urutkan Tanggal"
                          >
                            <div className="flex items-center gap-1">
                              <span>Tgl</span>
                              {sortField === 'createdAt' ? (
                                sortOrder === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>

                          <th className="py-3 px-3 w-16 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedReports.map((report, idx) => {
                          const isUrgent = report.priority === 'URGENT';
                          const rowNumber = startIndex + idx + 1;
                          const isSelected = selectedReportIds.has(report.id);
                          const reportPic = report.picName || 'Pampam';

                          return (
                            <tr
                              key={report.id}
                              onClick={() => setSelectedReport(report)}
                              className={`transition-colors cursor-pointer group ${
                                isSelected
                                  ? 'bg-indigo-50/80 hover:bg-indigo-100/70'
                                  : 'hover:bg-indigo-50/40'
                              }`}
                            >
                              {/* Checkbox Baris */}
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <label className="p-2 -m-2 flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    aria-label={`Pilih tiket ${report.ticketNumber}`}
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectRow(report.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </label>
                              </td>

                              <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                                {rowNumber}
                              </td>

                              {/* No. Tiket & Indikator Lampiran */}
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] group-hover:bg-indigo-100 group-hover:text-indigo-800 transition-colors">
                                    {report.ticketNumber}
                                  </span>
                                  {report.attachmentUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewAttachment({
                                          url: report.attachmentUrl!,
                                          name: report.attachmentName || 'Bukti Laporan',
                                          ticketNumber: report.ticketNumber,
                                          report,
                                        });
                                      }}
                                      title={
                                        report.attachmentName
                                          ? `Klik untuk pratinjau bukti: ${report.attachmentName}`
                                          : 'Klik untuk pratinjau bukti lampiran'
                                      }
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                    >
                                      <Paperclip className="h-3 w-3 text-indigo-600 shrink-0" />
                                      <span>Bukti</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Quick Action Status */}
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={report.actionStatus}
                                  onChange={(e) =>
                                    handleQuickStatusChange(
                                      report.id,
                                      e.target.value as ActionStatus
                                    )
                                  }
                                  className={`text-[11px] font-semibold py-1 px-2 rounded-lg border outline-none cursor-pointer ${
                                    report.actionStatus === 'OPEN'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : report.actionStatus === 'CROSSCHECK'
                                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  <option value="OPEN">🟡 Open</option>
                                  <option value="CROSSCHECK">🔵 Crosscheck</option>
                                  <option value="CLOSE">🟢 Close</option>
                                </select>
                              </td>

                              {/* PIC Penanggung Jawab */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                  👤 {reportPic}
                                </span>
                              </td>

                              {/* Pegawai & NRP */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {report.employeeName}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  NRP: {report.employeeNik}
                                </div>
                              </td>

                              {/* Project */}
                              <td className="py-2.5 px-3 text-slate-600 font-medium max-w-[200px] truncate" title={report.department}>
                                {report.department || '-'}
                              </td>

                              {/* Kategori */}
                              <td className="py-2.5 px-3 font-medium text-indigo-700 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{CATEGORY_LABELS[report.category] || report.category}</span>
                                  {isUrgent && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 uppercase animate-pulse">
                                      Urgent
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Selisih */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {formatRupiah(report.discrepancyAmount)}
                              </td>

                              {/* Tgl */}
                              <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                                {new Date(report.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </td>

                              {/* Aksi */}
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedReport(report)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Buka Detail Laporan"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-1 text-slate-400 text-xs">...</span>
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
            </div>
          </>
        )}
      </main>

      {/* Floating Bottom Bar Khusus Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-2xl">
        <button
          onClick={() => setActiveTab(activeTab === 'REPORTS' ? 'TODOS' : 'REPORTS')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-all cursor-pointer"
        >
          {activeTab === 'REPORTS' ? (
            <>
              <ListTodo className="h-4 w-4 text-indigo-600" />
              <span>To-Do</span>
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 text-indigo-600" />
              <span>Laporan</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsMobileToolsOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 transition-all cursor-pointer"
        >
          <Wrench className="h-4 w-4 text-indigo-600" />
          <span>Alat Bantu</span>
        </button>

        <button
          onClick={() => setIsQuickEntryOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Catat</span>
        </button>
      </div>

      {/* Mobile Bottom Action Sheet */}
      {isMobileToolsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="flex-1"
            onClick={() => setIsMobileToolsOpen(false)}
          />
          <div className="bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Alat Bantu Payroll</h4>
                  <p className="text-[11px] text-slate-500">Pilih menu utilitas yang ingin dibuka</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileToolsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => {
                  setIsMobileToolsOpen(false);
                  setIsPayrollModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Data & Analisis Payroll</p>
                  <p className="text-[11px] text-slate-500">Cari, cek slip & komparasi gaji 17k+ pegawai</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileToolsOpen(false);
                  setIsTerbilangOpen(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50/60 hover:bg-amber-100 border border-amber-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Kalkulator Terbilang ND</p>
                  <p className="text-[11px] text-slate-500">Konversi nominal ke kalimat resmi Nota Dinas</p>
                </div>
              </button>

              <Link
                href="/tools/excel-splitter"
                onClick={() => setIsMobileToolsOpen(false)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-sky-50/60 hover:bg-sky-100 border border-sky-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Pemecah Excel HRIS</p>
                  <p className="text-[11px] text-slate-500">Bagi file master payroll per 1.000 baris format utuh</p>
                </div>
              </Link>

              <button
                onClick={() => {
                  setIsMobileToolsOpen(false);
                  handleExport();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100 border border-emerald-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Unduh Rekap Tiket</p>
                  <p className="text-[11px] text-slate-500">Ekspor seluruh tiket kendala ke file Excel</p>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => {
                  setIsMobileToolsOpen(false);
                  handleLogout();
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

      {/* Modals */}
      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={() => setIsQuickEntryOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          fetchTodos();
        }}
        activePeriod={settings.activePeriod}
        activeUser={activeProfile}
      />

      <ReportDetailModal
        report={selectedReport}
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        onUpdated={() => {
          fetchDashboardData();
          fetchTodos();
        }}
        activeUser={activeProfile}
      />

      <CutoffSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={fetchDashboardData}
      />

      <PayrollResultsModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        defaultPeriod={settings.activePeriod}
      />

      <TerbilangModal
        isOpen={isTerbilangOpen}
        onClose={() => setIsTerbilangOpen(false)}
      />

      {/* Floating AI Chat Assistant with Mascot */}
      <AiChatWidget
        activeUser={activeProfile}
        onDataUpdated={() => {
          fetchDashboardData();
          fetchTodos();
        }}
      />

      {/* Toast Notifikasi Aksi Massal */}
      {bulkToastMessage && (
        <div className="fixed top-16 right-4 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{bulkToastMessage}</span>
        </div>
      )}

      {/* Floating Bulk Action Bar (Rekomendasi 6) */}
      {selectedReportIds.size > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-45 w-auto max-w-[95vw] bg-slate-900/95 backdrop-blur-md text-white px-3.5 sm:px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-5 duration-200 overflow-x-auto">
          {/* Info Jumlah Terpilih */}
          <div className="flex items-center gap-2 shrink-0 border-r border-slate-700 pr-3 sm:pr-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
              {selectedReportIds.size}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">
                {selectedReportIds.size} Tiket Terpilih
              </span>
              {selectedReportIds.size < filteredReports.length && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 underline text-left cursor-pointer"
                >
                  Pilih semua ({filteredReports.length})
                </button>
              )}
            </div>
          </div>

          {/* Tombol Aksi Massal */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Selesaikan (Close) */}
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusUpdate('CLOSE')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Ubah status semua tiket terpilih menjadi Close"
            >
              {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>🟢</span>}
              <span>Set Close</span>
            </button>

            {/* Set Crosscheck */}
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusUpdate('CROSSCHECK')}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Ubah status semua tiket terpilih menjadi Crosscheck"
            >
              {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>🔵</span>}
              <span>Set Crosscheck</span>
            </button>

            {/* Set Open */}
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusUpdate('OPEN')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Kembalikan status tiket terpilih ke Open"
            >
              {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>🟡</span>}
              <span>Set Open</span>
            </button>

            {/* Export Terpilih ke Excel */}
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={handleBulkExportExcel}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Ekspor hanya tiket yang dipilih ke file Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>

          {/* Tombol Batal */}
          <button
            type="button"
            disabled={isBulkUpdating}
            onClick={handleClearSelection}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title="Batalkan pilihan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Instant Attachment Preview Lightbox (Rekomendasi 5) */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Lightbox */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white border-b border-slate-700">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono text-xs font-bold bg-slate-700 px-2 py-0.5 rounded text-indigo-300">
                  {previewAttachment.ticketNumber}
                </span>
                <span className="text-xs font-semibold truncate text-slate-200">
                  {previewAttachment.name || 'Lampiran Bukti Slip/Gaji'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name || 'bukti-lampiran'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                  Unduh / Tab Baru
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const rep = previewAttachment.report;
                    setPreviewAttachment(null);
                    setSelectedReport(rep);
                  }}
                  className="hidden sm:inline-flex px-2.5 py-1 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  Buka Form Tiket
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-3 overflow-auto flex items-center justify-center bg-slate-950 min-h-[300px]">
              {previewAttachment.url.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[75vh] rounded-lg border-0"
                  title="PDF Preview"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name || 'Lampiran Bukti'}
                  className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
