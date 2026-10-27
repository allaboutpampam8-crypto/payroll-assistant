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
  AlertCircle,
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
import DashboardNavbar from '@/components/DashboardNavbar';
import DailyBriefing from '@/components/DailyBriefing';
import MetricsCards from '@/components/MetricsCards';
import ReportsFilterBar from '@/components/ReportsFilterBar';
import ReportsCardView from '@/components/ReportsCardView';
import ReportsTableView, { SortField, SortOrder } from '@/components/ReportsTableView';
import MobileBottomBar from '@/components/MobileBottomBar';
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
  const [picFilter, setPicFilter] = useState<'ALL' | 'MY_TICKETS'>('MY_TICKETS');

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
  const [updatingReportIds, setUpdatingReportIds] = useState<Set<string>>(new Set());
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    type: 'loading' | 'success' | 'error';
  } | null>(null);

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
      if (saved === 'Ucup') {
        setPicFilter('ALL');
      } else {
        setPicFilter('MY_TICKETS');
      }
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
    if (prof === 'Ucup') {
      setPicFilter('ALL');
    } else {
      setPicFilter('MY_TICKETS');
    }
    setCurrentPage(1);
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

  // Quick 1-click update status from list dengan loading progress & optimistic update
  const handleQuickStatusChange = async (
    reportId: string,
    newStatus: ActionStatus
  ) => {
    const targetReport = reports.find((r) => r.id === reportId);
    const oldStatus = targetReport?.actionStatus;
    const ticketNo = targetReport?.ticketNumber || '';
    const statusLabel =
      newStatus === 'CLOSE' ? 'Selesai (Close)' : newStatus === 'CROSSCHECK' ? 'Crosscheck' : 'Open';

    // 1. Set ID yang sedang diproses untuk menampilkan spinner loading
    setUpdatingReportIds((prev) => new Set(prev).add(reportId));

    // 2. Optimistic update: status di tabel/card langsung berubah seketika tanpa delay
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, actionStatus: newStatus } : r))
    );

    // 3. Tampilkan toast loading bahwa proses penyimpanan sedang berjalan
    setToastNotification({
      message: `Sedang memproses perubahan status #${ticketNo} ke ${statusLabel}...`,
      type: 'loading',
    });

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionStatus: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Tampilkan konfirmasi sukses
        setToastNotification({
          message: `Status laporan #${ticketNo} berhasil disimpan sebagai ${statusLabel}!`,
          type: 'success',
        });
        setTimeout(() => setToastNotification(null), 3000);
        // Refresh latar belakang untuk sinkronisasi metrik & settings
        fetchDashboardData();
        fetchTodos();
      } else {
        throw new Error(data.message || 'Gagal mengubah status');
      }
    } catch (err) {
      console.error('Failed to quick-update status:', err);
      // Kembalikan ke status semula jika request gagal
      if (oldStatus) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, actionStatus: oldStatus } : r))
        );
      }
      setToastNotification({
        message: 'Gagal memperbarui status laporan. Silakan coba lagi.',
        type: 'error',
      });
      setTimeout(() => setToastNotification(null), 4000);
    } finally {
      setUpdatingReportIds((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
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
    const ids = Array.from(selectedReportIds);
    const statusLabel =
      status === 'CLOSE' ? 'Selesai (Close)' : status === 'CROSSCHECK' ? 'Crosscheck' : 'Open';
    setToastNotification({
      message: `Sedang memproses ${ids.length} laporan terpilih ke status ${statusLabel}...`,
      type: 'loading',
    });
    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, actionStatus: status }),
      });
      const data = await res.json();
      if (data.success) {
        setToastNotification({
          message: `${ids.length} laporan berhasil diubah ke status ${statusLabel}!`,
          type: 'success',
        });
        setTimeout(() => setToastNotification(null), 3500);
        setSelectedReportIds(new Set());
        fetchDashboardData();
        fetchTodos();
      } else {
        alert(data.message || 'Gagal mengubah status massal.');
      }
    } catch (err) {
      console.error('Error bulk updating:', err);
      setToastNotification({
        message: 'Terjadi kesalahan saat memproses pembaruan massal.',
        type: 'error',
      });
      setTimeout(() => setToastNotification(null), 4000);
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
          if (selectedUser === 'Ucup') {
            setPicFilter('ALL');
          } else {
            setPicFilter('MY_TICKETS');
          }
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

      {/* Top Navbar Modular Component */}
      <DashboardNavbar
        settings={settings}
        activeProfile={activeProfile}
        onSwitchProfile={handleSwitchProfile}
        onLogout={handleLogout}
        onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
        onOpenPayrollModal={() => setIsPayrollModalOpen(true)}
        onOpenTerbilang={() => setIsTerbilangOpen(true)}
        onExportReports={handleExport}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-5 pb-28 md:pb-12 space-y-4 sm:space-y-6">
        {/* 1. Daily Briefing Card */}
        <DailyBriefing
          settings={settings}
          reports={reports}
          todos={todos}
          activeTodosCount={todos.filter((t) => !t.isCompleted).length}
          activeUser={activeProfile}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRefresh={fetchDashboardData}
          onFilterStatus={(st) => {
            if (activeProfile !== 'Ucup' && st === 'OVERDUE') {
              setPicFilter('MY_TICKETS');
            }
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
            if (activeProfile !== 'Ucup' && st === 'OVERDUE') {
              setPicFilter('MY_TICKETS');
            }
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
          <div id="todo-list-widget">
            <TodoListWidget
              todos={todos}
              initialFilter={todoFilter}
              activeUser={activeProfile}
              onRefresh={() => {
                fetchTodos();
                fetchDashboardData();
              }}
            />
          </div>
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

            {/* 3. Search & Filter Bar Modular Component */}
            <ReportsFilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              searchInputRef={searchInputRef}
              picFilter={picFilter}
              onPicFilterChange={(val) => {
                setPicFilter(val);
                setCurrentPage(1);
              }}
              activeProfile={activeProfile}
              periodFilter={periodFilter}
              onPeriodFilterChange={handlePeriodFilterChange}
              availablePeriods={availablePeriods}
              activePeriod={settings.activePeriod}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              overdueCount={metrics.overdueCount}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={handleCategoryFilterChange}
              onResetFilters={() => {
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                setPeriodFilter('ALL');
                setPicFilter('ALL');
                setSearchQuery('');
                setCurrentPage(1);
              }}
            />

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
                /* Card View (Tampilan Kartu Modular Component) */
                <ReportsCardView
                  paginatedReports={paginatedReports}
                  selectedReportIds={selectedReportIds}
                  isAllVisibleSelected={isAllVisibleSelected}
                  isSomeVisibleSelected={isSomeVisibleSelected}
                  onToggleSelectAllVisible={handleToggleSelectAllVisible}
                  onToggleSelectRow={handleToggleSelectRow}
                  onSelectReport={setSelectedReport}
                  onPreviewAttachment={setPreviewAttachment}
                  updatingReportIds={updatingReportIds}
                  onQuickStatusChange={handleQuickStatusChange}
                  formatRupiah={formatRupiah}
                />
              ) : (
                /* Compact Table View (Tabel Padat Modular Component) */
                <ReportsTableView
                  paginatedReports={paginatedReports}
                  selectedReportIds={selectedReportIds}
                  isAllVisibleSelected={isAllVisibleSelected}
                  isSomeVisibleSelected={isSomeVisibleSelected}
                  onToggleSelectAllVisible={handleToggleSelectAllVisible}
                  onToggleSelectRow={handleToggleSelectRow}
                  onSelectReport={setSelectedReport}
                  onPreviewAttachment={setPreviewAttachment}
                  updatingReportIds={updatingReportIds}
                  onQuickStatusChange={handleQuickStatusChange}
                  formatRupiah={formatRupiah}
                  startIndex={startIndex}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
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

      {/* Floating Bottom Bar Khusus Mobile Modular Component */}
      <MobileBottomBar
        activeTab={activeTab}
        onToggleTab={() => setActiveTab(activeTab === 'REPORTS' ? 'TODOS' : 'REPORTS')}
        isMobileToolsOpen={isMobileToolsOpen}
        onOpenMobileTools={() => setIsMobileToolsOpen(true)}
        onCloseMobileTools={() => setIsMobileToolsOpen(false)}
        onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
        onOpenPayrollModal={() => setIsPayrollModalOpen(true)}
        onOpenTerbilang={() => setIsTerbilangOpen(true)}
        onExportReports={handleExport}
        onLogout={handleLogout}
      />

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
        onUpdated={(updatedReport) => {
          if (updatedReport) {
            // Optimistic update: langsung perbarui laporan di tabel & card seketika
            setReports((prev) =>
              prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
            );
            setToastNotification({
              message: `Perubahan laporan #${updatedReport.ticketNumber} (${updatedReport.employeeName}) berhasil disimpan!`,
              type: 'success',
            });
            setTimeout(() => setToastNotification(null), 3500);
          }
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
        todos={todos}
        onOpenTodos={(filter) => {
          if (filter) setTodoFilter(filter);
          setActiveTab('TODOS');
        }}
        onDataUpdated={() => {
          fetchDashboardData();
          fetchTodos();
        }}
      />

      {/* Global Toast Notifikasi Progress & Aksi */}
      {toastNotification ? (
        <div
          className={`fixed top-16 right-4 z-50 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top duration-200 border ${
            toastNotification.type === 'loading'
              ? 'bg-slate-900/95 text-indigo-200 border-indigo-500/40 backdrop-blur-md shadow-indigo-950/40'
              : toastNotification.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-600 shadow-rose-950/50'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastNotification.type === 'loading' ? (
            <Loader2 className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
          ) : toastNotification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastNotification.message}</span>
        </div>
      ) : bulkToastMessage ? (
        <div className="fixed top-16 right-4 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{bulkToastMessage}</span>
        </div>
      ) : null}

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
