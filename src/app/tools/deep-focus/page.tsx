'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  FileText,
  Download,
  Copy,
  Settings,
  Edit3,
  AlertTriangle,
  Scissors,
  Layers,
  LayoutDashboard,
  Sparkles,
  Loader2,
  X,
  Calendar,
  UserCheck,
  Lock,
} from 'lucide-react';
import ToolsHeaderNav from '@/components/ToolsHeaderNav';
import { useOvertimeFocus } from '@/components/OvertimeFocusProvider';
import { useToast } from '@/components/ToastProvider';
import {
  AppUserProfile,
  APP_USER_PROFILES,
  OvertimeLog,
  OvertimeDocConfig,
  DEFAULT_OVERTIME_DOC_CONFIG,
} from '@/lib/types';
import {
  OVERTIME_PRESETS,
  computeDurationMinutes,
  normalizeTimeDot,
  formatOvertimeDayDateUpper,
  formatOvertimeDurationUpper,
  formatPeriodTitle,
  formatStopwatchSeconds,
  formatTimeDot,
  subtractMinutesFromTimeDot,
} from '@/lib/overtimeUtils';
import { generateOvertimeSpklBlob } from '@/lib/overtimeDocx';

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function getCurrentPeriodIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DeepFocusPage() {
  const { toast } = useToast();
  const {
    session,
    elapsedSeconds,
    pauseMinutes,
    startTimeDot,
    startDateIso,
    startSession,
    pauseSession,
    resumeSession,
    discardSession,
    updateSessionDetails,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
  } = useOvertimeFocus();

  const [activeTab, setActiveTab] = useState<'FOCUS' | 'HISTORY'>('FOCUS');

  // Setup state ketika session === IDLE
  const [setupUser, setSetupUser] = useState<AppUserProfile>('Pampam');
  const [setupPresetId, setSetupPresetId] = useState<string>(OVERTIME_PRESETS[0].id);
  const [setupPeriodMonth, setSetupPeriodMonth] = useState<string>(() =>
    formatPeriodTitle(getCurrentPeriodIso())
  );
  const [setupJob, setSetupJob] = useState<string>(() =>
    OVERTIME_PRESETS[0].jobTemplate(formatPeriodTitle(getCurrentPeriodIso()))
  );
  const [setupTarget, setSetupTarget] = useState<string>(() =>
    OVERTIME_PRESETS[0].targetTemplate(formatPeriodTitle(getCurrentPeriodIso()))
  );
  const [setupReason, setSetupReason] = useState<string>(
    DEFAULT_OVERTIME_DOC_CONFIG.defaultReason
  );
  const [setupChecklist, setSetupChecklist] = useState(
    OVERTIME_PRESETS[0].checklist.map((c) => ({ ...c }))
  );
  const [setupFocusInterval, setSetupFocusInterval] = useState<number>(50);
  const [newCheckLabel, setNewCheckLabel] = useState('');

  // History & Config States
  const [logs, setLogs] = useState<OvertimeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>(getCurrentPeriodIso());
  const [filterUser, setFilterUser] = useState<AppUserProfile | 'ALL'>('Pampam');
  const [signatureDate, setSignatureDate] = useState<string>(getTodayIso());
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const [docConfig, setDocConfig] = useState<OvertimeDocConfig>(DEFAULT_OVERTIME_DOC_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Modal Konfirmasi Simpan Sesi / Tambah Manual / Edit Log
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [isFromActiveTimer, setIsFromActiveTimer] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  const [formUser, setFormUser] = useState<AppUserProfile>('Pampam');
  const [formDate, setFormDate] = useState<string>(getTodayIso());
  const [formStartTime, setFormStartTime] = useState<string>('17.00');
  const [formEndTime, setFormEndTime] = useState<string>('21.00');
  const [formPauseMins, setFormPauseMins] = useState<number>(0);
  const [deductedPauseMins, setDeductedPauseMins] = useState<number>(0);
  const [rawRealEndTime, setRawRealEndTime] = useState<string>('');
  const [formJob, setFormJob] = useState<string>('');
  const [formTarget, setFormTarget] = useState<string>('');
  const [formReason, setFormReason] = useState<string>(DEFAULT_OVERTIME_DOC_CONFIG.defaultReason);

  // Inisialisasi user aktif dari localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lapor_payroll_active_user') as AppUserProfile;
      if (saved && APP_USER_PROFILES.some((p) => p.id === saved)) {
        setSetupUser(saved);
        setFilterUser(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Muat konfigurasi surat lembur dan setting periode aktif saat halaman dibuka
  useEffect(() => {
    fetch('/api/overtime/config')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setDocConfig(json.data);
          if (json.data.defaultReason) {
            setSetupReason(json.data.defaultReason);
          }
        }
      })
      .catch(() => {
        // fallback ke default config
      });

    fetch('/api/settings')
      .then((res) => res.json())
      .then((settings) => {
        if (settings && settings.activePeriod) {
          setSetupPeriodMonth(settings.activePeriod);
          const p = OVERTIME_PRESETS.find((x) => x.id === setupPresetId) || OVERTIME_PRESETS[0];
          setSetupJob(p.jobTemplate(settings.activePeriod));
          setSetupTarget(p.targetTemplate(settings.activePeriod));
        }
      })
      .catch(() => {
        // fallback ke default period
      });
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (filterPeriod) params.set('period', filterPeriod);
      if (filterUser) params.set('user', filterUser);
      const res = await fetch(`/api/overtime?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || 'Gagal memuat riwayat lembur.');
      } else {
        setLogs(json.data || []);
        setTableMissing(Boolean(json.tableMissing));
      }
    } catch (err) {
      console.error('Failed to fetch overtime logs:', err);
      toast.error('Koneksi terputus saat memuat riwayat lembur.');
    } finally {
      setLoadingLogs(false);
    }
  }, [filterPeriod, filterUser, toast]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  const handleSelectPreset = (presetId: string) => {
    setSetupPresetId(presetId);
    const preset = OVERTIME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSetupJob(preset.jobTemplate(setupPeriodMonth));
      setSetupTarget(preset.targetTemplate(setupPeriodMonth));
      setSetupChecklist(preset.checklist.map((c) => ({ ...c })));
    }
  };

  const handleStartFocus = () => {
    if (!setupJob.trim()) {
      toast.error('Isi pekerjaan yang akan dilemburkan terlebih dahulu.');
      return;
    }
    startSession({
      userProfile: setupUser,
      presetId: setupPresetId,
      jobDescription: setupJob.trim(),
      targetDescription: setupTarget.trim(),
      reason: setupReason.trim() || docConfig.defaultReason,
      checklist: setupChecklist,
      focusIntervalMinutes: setupFocusInterval,
    });
    toast.success(`Sesi Deep Focus & Lembur dimulai untuk ${setupUser}!`);
  };

  const handleOpenFinishActiveModal = () => {
    const nowDot = formatTimeDot(new Date());
    // Potong langsung jeda ke jam selesai
    const effectiveEndDot =
      pauseMinutes > 0 ? subtractMinutesFromTimeDot(nowDot, pauseMinutes) : nowDot;

    setEditingLogId(null);
    setIsFromActiveTimer(true);
    setFormUser(session.userProfile);
    setFormDate(startDateIso);
    setFormStartTime(startTimeDot);
    setFormEndTime(effectiveEndDot);
    setFormPauseMins(0); // Jeda sudah dipotong langsung ke jam selesai
    setDeductedPauseMins(pauseMinutes);
    setRawRealEndTime(nowDot);
    setFormJob(session.jobDescription);
    setFormTarget(session.targetDescription);
    setFormReason(session.reason || docConfig.defaultReason);
    setIsLogModalOpen(true);
  };

  const handleOpenManualAddModal = () => {
    setEditingLogId(null);
    setIsFromActiveTimer(false);
    setDeductedPauseMins(0);
    setRawRealEndTime('');
    setFormUser(filterUser === 'ALL' ? setupUser : filterUser);
    setFormDate(getTodayIso());
    setFormStartTime('17.00');
    setFormEndTime('21.00');
    setFormPauseMins(0);
    setFormJob(setupJob || OVERTIME_PRESETS[0].jobTemplate(formatPeriodTitle(filterPeriod)));
    setFormTarget(setupTarget || OVERTIME_PRESETS[0].targetTemplate(formatPeriodTitle(filterPeriod)));
    setFormReason(docConfig.defaultReason);
    setIsLogModalOpen(true);
  };

  const handleOpenEditModal = (log: OvertimeLog) => {
    setEditingLogId(log.id);
    setIsFromActiveTimer(false);
    setDeductedPauseMins(0);
    setRawRealEndTime('');
    setFormUser(log.userProfile);
    setFormDate(log.workDate);
    setFormStartTime(log.startTime);
    setFormEndTime(log.endTime);
    setFormPauseMins(log.pauseMinutes || 0);
    setFormJob(log.jobDescription);
    setFormTarget(log.targetDescription);
    setFormReason(log.reason);
    setIsLogModalOpen(true);
  };

  const computedFormMinutes = computeDurationMinutes(
    formStartTime,
    formEndTime,
    formPauseMins
  );

  const handleSaveLogForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formStartTime.trim() || !formEndTime.trim() || !formJob.trim()) {
      toast.error('Tanggal, jam mulai, jam selesai, dan pekerjaan wajib diisi.');
      return;
    }

    const cleanStart = normalizeTimeDot(formStartTime);
    const cleanEnd = normalizeTimeDot(formEndTime);
    const cleanPause = Math.max(0, Number(formPauseMins) || 0);
    const cleanDuration = computeDurationMinutes(cleanStart, cleanEnd, cleanPause);

    if (cleanDuration <= 0) {
      toast.error('Format jam tidak valid atau durasi lembur 0 menit.');
      return;
    }

    setSavingLog(true);
    try {
      const payload = {
        userProfile: formUser,
        workDate: formDate,
        period: formDate.slice(0, 7),
        startTime: cleanStart,
        endTime: cleanEnd,
        pauseMinutes: cleanPause,
        durationMinutes: cleanDuration,
        jobDescription: formJob.trim(),
        targetDescription: formTarget.trim(),
        reason: formReason.trim() || docConfig.defaultReason,
        checklist: isFromActiveTimer ? session.checklist : undefined,
      };

      const url = editingLogId ? `/api/overtime/${editingLogId}` : '/api/overtime';
      const method = editingLogId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menyimpan catatan lembur.');
      }

      if (isFromActiveTimer) {
        discardSession();
        setFilterPeriod(payload.period);
        setFilterUser(payload.userProfile);
        setActiveTab('HISTORY');
      } else {
        fetchLogs();
      }

      setIsLogModalOpen(false);
      toast.success(
        editingLogId
          ? 'Catatan lembur berhasil diperbarui!'
          : 'Catatan lembur berhasil disimpan ke riwayat!'
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (log: OvertimeLog) => {
    if (
      !confirm(
        `Hapus catatan lembur tanggal ${formatOvertimeDayDateUpper(log.workDate)}?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/overtime/${log.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Catatan lembur dihapus.');
        setLogs((prev) => prev.filter((item) => item.id !== log.id));
      } else {
        throw new Error(json.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus catatan.');
    }
  };

  const handleSaveDocConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/overtime/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docConfig),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDocConfig(json.data);
        setIsConfigOpen(false);
        toast.success('Identitas Pimpinan & Karyawan SPKL berhasil disimpan!');
      } else {
        throw new Error(json.message);
      }
    } catch {
      toast.error('Gagal menyimpan konfigurasi SPKL.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownloadSpklDocx = async () => {
    if (filterUser === 'ALL') {
      toast.error('Pilih satu nama karyawan terlebih dahulu sebelum mencetak SPKL (.docx).');
      return;
    }
    if (logs.length === 0) {
      toast.error('Belum ada catatan lembur pada periode & karyawan terpilih.');
      return;
    }

    setIsExportingDocx(true);
    try {
      const blob = await generateOvertimeSpklBlob({
        logs,
        period: filterPeriod,
        userProfile: filterUser,
        config: docConfig,
        signatureDate,
      });

      const empName = (docConfig.employees[filterUser]?.fullName || filterUser)
        .replace(/\s+/g, '_');
      const fileName = `SPKL_Lembur_${filterPeriod}_${empName}.docx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`Surat Perintah Kerja Lembur (.docx) berhasil diunduh!`);
    } catch (err: unknown) {
      console.error('Export SPKL docx error:', err);
      toast.error('Gagal membuat dokumen Word (.docx).');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleCopyTextSummary = () => {
    if (logs.length === 0) {
      toast.error('Tidak ada data untuk disalin.');
      return;
    }
    const targetName =
      filterUser === 'ALL'
        ? 'Semua Tim'
        : docConfig.employees[filterUser]?.fullName || filterUser;
    const totalMins = logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

    const lines = [
      `*REKAP LEMBUR PAYROLL - ${formatPeriodTitle(filterPeriod).toUpperCase()}*`,
      `Nama: ${targetName}`,
      `Total Sesi: ${logs.length} hari (${formatOvertimeDurationUpper(totalMins)})`,
      '',
      ...logs.map(
        (l, idx) =>
          `${idx + 1}. *${formatOvertimeDayDateUpper(l.workDate)}* (${l.startTime} - ${l.endTime} = ${formatOvertimeDurationUpper(l.durationMinutes)})\n   • Pekerjaan: ${l.jobDescription}\n   • Target: ${l.targetDescription || '-'}`
      ),
    ];

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => {
        toast.success('Rekap teks lembur disalin ke clipboard!');
      })
      .catch(() => {
        toast.error('Gagal menyalin teks ke clipboard. Izin browser tidak diberikan.');
      });
  };

  const totalNetMinutes = logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors">
      <ToolsHeaderNav activeTool="deep-focus" />

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Header Title & Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Deep Focus & Tracker Pengajuan Lembur
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fokus cek pergerakan pegawai, absensi, & gaji sekaligus rekap otomatis ke format SPKL Word (.docx)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('FOCUS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'FOCUS'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Workspace Fokus</span>
                {session.status !== 'IDLE' && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Riwayat & Cetak SPKL</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Atur Nama Pimpinan, NIPP, dan Jabatan untuk Surat Perintah Kerja Lembur"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Identitas Surat (SPKL)</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: WORKSPACE DEEP FOCUS */}
        {/* ============================================================ */}
        {activeTab === 'FOCUS' && (
          <>
            {session.status === 'IDLE' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Kiri: Persiapan Sesi Fokus Lembur */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Persiapan Sesi Fokus & Lembur
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pilih preset pekerjaan & target agar langsung siap dicatat ke surat lembur
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenManualAddModal}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Catat Manual</span>
                    </button>
                  </div>

                  {/* Pilih PIC & Bulan Payroll */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Nama Tim (PIC):
                      </label>
                      {(() => {
                        const activePic =
                          APP_USER_PROFILES.find((p) => p.id === setupUser) || APP_USER_PROFILES[0];
                        return (
                          <div className="px-3 py-2 rounded-xl text-xs font-bold border bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-5 w-5 rounded-md text-[10px] text-white flex items-center justify-center shrink-0 ${activePic.avatarBg}`}
                              >
                                {activePic.name.slice(0, 1)}
                              </span>
                              <span className="truncate">{activePic.name}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              <Lock className="w-3 h-3" />
                              Sesuai Dashboard
                            </span>
                          </div>
                        );
                      })()}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Otomatis terkunci sesuai profil yang sedang aktif di dashboard
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Periode Gaji yang Dikerjakan:
                      </label>
                      <input
                        type="text"
                        value={setupPeriodMonth}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSetupPeriodMonth(val);
                          const p = OVERTIME_PRESETS.find((x) => x.id === setupPresetId);
                          if (p) {
                            setSetupJob(p.jobTemplate(val));
                            setSetupTarget(p.targetTemplate(val));
                          }
                        }}
                        placeholder="Contoh: November 2026"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Otomatis mengisi template kalimat pekerjaan & target lembur
                      </p>
                    </div>
                  </div>

                  {/* Preset Siklus Payroll */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Template Cepat Pekerjaan:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OVERTIME_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            setupPresetId === preset.id
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                              : 'bg-slate-50/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{preset.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Detail Pekerjaan, Target, Alasan */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Pekerjaan yang Dilemburkan:
                      </label>
                      <textarea
                        rows={2}
                        value={setupJob}
                        onChange={(e) => setSetupJob(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Target Pekerjaan yang Dilemburkan:
                      </label>
                      <textarea
                        rows={2}
                        value={setupTarget}
                        onChange={(e) => setSetupTarget(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Alasan Lembur:
                        </label>
                        <input
                          type="text"
                          value={setupReason}
                          onChange={(e) => setSetupReason(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Pengingat Istirahat Mata:
                        </label>
                        <select
                          value={setupFocusInterval}
                          onChange={(e) => setSetupFocusInterval(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold focus:border-emerald-500 outline-none"
                        >
                          <option value={50}>Tiap 50 Menit</option>
                          <option value={30}>Tiap 30 Menit</option>
                          <option value={0}>Nonaktif</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartFocus}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Mulai Deep Focus & Hitung Lembur</span>
                  </button>
                </div>

                {/* Kanan: Checklist Rencana & Shortcut Alat Bantu */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Checklist Fokus Siklus Payroll
                    </h3>
                    <div className="space-y-2">
                      {setupChecklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs"
                        >
                          <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSetupChecklist((prev) =>
                                prev.filter((x) => x.id !== item.id)
                              )
                            }
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCheckLabel}
                        onChange={(e) => setNewCheckLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCheckLabel.trim()) {
                            e.preventDefault();
                            setSetupChecklist((prev) => [
                              ...prev,
                              {
                                id: `chk-${Date.now()}`,
                                label: newCheckLabel.trim(),
                                done: false,
                              },
                            ]);
                            setNewCheckLabel('');
                          }
                        }}
                        placeholder="Tambah item cek project tertentu..."
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCheckLabel.trim()) return;
                          setSetupChecklist((prev) => [
                            ...prev,
                            {
                              id: `chk-${Date.now()}`,
                              label: newCheckLabel.trim(),
                              done: false,
                            },
                          ]);
                          setNewCheckLabel('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer hover:bg-slate-700"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>

                  <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/70 dark:border-indigo-800/60 p-4 space-y-2 text-xs">
                    <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Informasi Identitas SPKL Aktif ({setupUser})</span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                      Nama Surat: <strong>{docConfig.employees[setupUser]?.fullName || setupUser}</strong> • NIPP:{' '}
                      <strong>{docConfig.employees[setupUser]?.nipp || '(Belum diisi)'}</strong> • Pimpinan:{' '}
                      <strong>{docConfig.leaderName}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsConfigOpen(true)}
                      className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Ubah / Lengkapi NIPP & Pimpinan →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* MODE FOKUS SEDANG BERJALAN (ZEN WORKSPACE) */
              <div className="space-y-6">
                {/* Main Zen Timer Card */}
                <div
                  className={`rounded-3xl p-6 sm:p-8 border shadow-xl transition-all text-center space-y-5 ${
                    session.status === 'RUNNING'
                      ? 'bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/90 text-white border-emerald-500/40'
                      : 'bg-linear-to-br from-slate-900 via-amber-950/60 to-slate-900 text-white border-amber-500/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        session.status === 'RUNNING'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          session.status === 'RUNNING'
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-amber-400'
                        }`}
                      />
                      {session.status === 'RUNNING'
                        ? 'Mode Deep Focus Aktif'
                        : 'Sedang Jeda / Istirahat'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      PIC: {session.userProfile}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      Mulai: {startTimeDot} WIB
                    </span>
                    {pauseMinutes > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/50 text-amber-200 border border-amber-700/60">
                        Total Jeda: {pauseMinutes} menit
                      </span>
                    )}
                  </div>

                  {/* Huge Stopwatch Display */}
                  <div className="py-2">
                    <div className="font-mono text-5xl sm:text-7xl font-black tracking-tight text-white tabular-nums">
                      {formatStopwatchSeconds(elapsedSeconds)}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Timer tetap berjalan akurat meski Anda berpindah tab, membuka Excel Splitter, atau Tanos Normalizer
                    </p>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {session.status === 'RUNNING' ? (
                      <button
                        type="button"
                        onClick={pauseSession}
                        className="px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Jeda / Istirahat</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={resumeSession}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Lanjutkan Fokus</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenFinishActiveModal}
                      className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Selesai & Simpan ke Rekap Lembur</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Batalkan sesi lembur yang sedang berjalan? Waktu tidak akan dicatat.')) {
                          discardSession();
                          toast.info('Sesi lembur dibatalkan.');
                        }
                      }}
                      className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Batalkan</span>
                    </button>
                  </div>
                </div>

                {/* Live Checklist & Notes + Tool Launchers */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Checklist Interaktif */}
                  <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Checklist Siklus Payroll Sesi Ini
                      </h3>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {session.checklist.filter((c) => c.done).length} / {session.checklist.length} Selesai
                      </span>
                    </div>

                    <div className="space-y-2">
                      {session.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleChecklistItem(item.id)}
                          className={`flex items-center justify-between gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                            item.done
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-slate-500 line-through'
                              : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {item.done ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium">{item.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeChecklistItem(item.id);
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCheckLabel}
                        onChange={(e) => setNewCheckLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCheckLabel.trim()) {
                            e.preventDefault();
                            addChecklistItem(newCheckLabel);
                            setNewCheckLabel('');
                          }
                        }}
                        placeholder="Tambah poin pengecekan baru..."
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCheckLabel.trim()) return;
                          addChecklistItem(newCheckLabel);
                          setNewCheckLabel('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer hover:bg-indigo-700"
                      >
                        + Tambah
                      </button>
                    </div>
                  </div>

                  {/* Live Edit Pekerjaan & Quick Launchers */}
                  <div className="lg:col-span-6 space-y-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Uraian untuk Surat Perintah Lembur
                      </h3>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Pekerjaan yang Dilemburkan:
                        </label>
                        <textarea
                          rows={2}
                          value={session.jobDescription}
                          onChange={(e) =>
                            updateSessionDetails({ jobDescription: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Target Pekerjaan:
                        </label>
                        <textarea
                          rows={2}
                          value={session.targetDescription}
                          onChange={(e) =>
                            updateSessionDetails({ targetDescription: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>

                    {/* Shortcut Cepat Alat Tempur */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                        Akses Cepat Alat Kerja (Timer Tetap Jalan)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Link
                          href="/"
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/70 dark:border-indigo-800 text-xs font-bold text-indigo-800 dark:text-indigo-200 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 shrink-0" />
                          <span>Dashboard & Cek Gaji</span>
                        </Link>
                        <Link
                          href="/tools/excel-splitter"
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/70 dark:border-sky-800 text-xs font-bold text-sky-800 dark:text-sky-200 transition-colors"
                        >
                          <Scissors className="w-4 h-4 shrink-0" />
                          <span>Pemecah Excel HRIS</span>
                        </Link>
                        <Link
                          href="/tools/tanos-normalizer"
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/70 dark:border-violet-800 text-xs font-bold text-violet-800 dark:text-violet-200 transition-colors"
                        >
                          <Layers className="w-4 h-4 shrink-0" />
                          <span>Normalisasi Tanos</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: RIWAYAT LEMBUR & CETAK SPKL (.DOCX) */}
        {/* ============================================================ */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            {tableMissing && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    Tabel Supabase `payroll_overtime_logs` belum dibuat (Saat ini tersimpan lokal sementara).
                  </p>
                  <p>
                    Jalankan file SQL <code className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900 font-mono">scripts/create_payroll_overtime_logs.sql</code> di Supabase SQL Editor agar data tersimpan permanen lintas perangkat.
                  </p>
                </div>
              </div>
            )}

            {/* Filter & Action Toolbar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Bulan / Periode:
                  </label>
                  <input
                    type="month"
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Karyawan (PIC):
                  </label>
                  <select
                    value={filterUser}
                    onChange={(e) =>
                      setFilterUser(e.target.value as AppUserProfile | 'ALL')
                    }
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    {APP_USER_PROFILES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {docConfig.employees[p.id]?.fullName || p.name} ({p.id})
                      </option>
                    ))}
                    <option value="ALL">Semua Tim Payroll</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Tanggal Tanda Tangan Surat:
                  </label>
                  <input
                    type="date"
                    value={signatureDate}
                    onChange={(e) => setSignatureDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenManualAddModal}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Tambah Manual</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyTextSummary}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Teks</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSpklDocx}
                  disabled={isExportingDocx || logs.length === 0 || filterUser === 'ALL'}
                  title={
                    filterUser === 'ALL'
                      ? 'Pilih satu nama karyawan terlebih dahulu untuk cetak surat SPKL'
                      : 'Unduh Surat Perintah Kerja Lembur format .docx siap cetak'
                  }
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {isExportingDocx ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Unduh Surat Lembur (.docx)</span>
                </button>
              </div>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    Total Hari / Sesi Lembur
                  </p>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {logs.length} Sesi
                  </p>
                </div>
                <Calendar className="w-7 h-7 text-indigo-500/40" />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    Akumulasi Jam Lembur Bersih
                  </p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatOvertimeDurationUpper(totalNetMinutes)}
                  </p>
                </div>
                <Clock className="w-7 h-7 text-emerald-500/40" />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    Format Dokumen Resmi
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    Kop Pelindo Daya Sejahtera (.docx)
                  </p>
                </div>
                <FileText className="w-7 h-7 text-sky-500/40" />
              </div>
            </div>

            {/* Table Preview (Format SPKL) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {loadingLogs ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-medium">Memuat riwayat lembur...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Belum ada catatan lembur di periode {formatPeriodTitle(filterPeriod)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gunakan Workspace Fokus saat bekerja lembur, atau klik tombol &quot;Tambah Manual&quot; di atas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3 font-bold">TANGGAL, HARI</th>
                        {filterUser === 'ALL' && <th className="p-3 font-bold">PIC</th>}
                        <th className="p-3 font-bold">PEKERJAAN YANG DILEMBURKAN</th>
                        <th className="p-3 font-bold">TARGET PEKERJAAN</th>
                        <th className="p-3 font-bold text-center">WAKTU (MULAI – SELESAI)</th>
                        <th className="p-3 font-bold text-center">JML</th>
                        <th className="p-3 font-bold">ALASAN LEMBUR</th>
                        <th className="p-3 font-bold text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatOvertimeDayDateUpper(log.workDate)}
                          </td>
                          {filterUser === 'ALL' && (
                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {log.userProfile}
                            </td>
                          )}
                          <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs">
                            {log.jobDescription}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs">
                            {log.targetDescription || '-'}
                          </td>
                          <td className="p-3 text-center font-mono font-semibold whitespace-nowrap">
                            {log.startTime} – {log.endTime}
                            {log.pauseMinutes > 0 && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                                (Jeda {log.pauseMinutes} mnt)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            {formatOvertimeDurationUpper(log.durationMinutes)}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs">
                            {log.reason || '-'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(log)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                                title="Edit / Koreksi Jam"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL SIMPAN / EDIT CATATAN LEMBUR */}
      {/* ============================================================ */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {editingLogId
                    ? 'Edit Catatan Lembur'
                    : isFromActiveTimer
                    ? 'Konfirmasi & Simpan Hasil Timer Lembur'
                    : 'Tambah Catatan Lembur Manual'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Anda dapat menyesuaikan jam mulai/selesai bila perlu sebelum masuk ke SPKL
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLogForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Karyawan (PIC):
                  </label>
                  <select
                    value={formUser}
                    onChange={(e) => setFormUser(e.target.value as AppUserProfile)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-bold outline-none"
                  >
                    {APP_USER_PROFILES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {docConfig.employees[p.id]?.fullName || p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Kerja Lembur:
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-bold outline-none [color-scheme:light] dark:[color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Mulai (cth: 17.21):
                  </label>
                  <input
                    type="text"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    placeholder="17.21"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jam Selesai (cth: 21.21):
                  </label>
                  <input
                    type="text"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    placeholder="21.21"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Potong Jeda (Menit):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formPauseMins}
                    onChange={(e) => setFormPauseMins(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Info Pengurangan Jeda Otomatis ke Jam Selesai */}
              {isFromActiveTimer && deductedPauseMins > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Waktu jeda <strong>{deductedPauseMins} menit</strong> telah otomatis dipotong ke Jam Selesai (dari jam riil <strong>{rawRealEndTime}</strong> menjadi <strong>{formEndTime}</strong>) agar durasi di SPKL selaras.
                  </span>
                </div>
              ) : formPauseMins > 0 ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200">
                  <span>
                    Terdapat jeda {formPauseMins} menit. Ingin langsung potong ke jam selesai?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormEndTime(subtractMinutesFromTimeDot(formEndTime, formPauseMins));
                      toast.info(`Jam selesai dimundurkan ${formPauseMins} menit.`);
                      setFormPauseMins(0);
                    }}
                    className="font-bold underline text-amber-700 dark:text-amber-400 hover:text-amber-900 cursor-pointer text-xs"
                  >
                    Potong Sekarang
                  </button>
                </div>
              ) : null}

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Total Durasi Tercatat di SPKL (JML):
                </span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  {formatOvertimeDurationUpper(computedFormMinutes)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pekerjaan yang Dilemburkan:
                </label>
                <textarea
                  rows={2}
                  value={formJob}
                  onChange={(e) => setFormJob(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Pekerjaan yang Dilemburkan:
                </label>
                <textarea
                  rows={2}
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Lembur:
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingLog && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Catatan Lembur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL KONFIGURASI IDENTITAS SPKL (.DOCX) */}
      {/* ============================================================ */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Konfigurasi Identitas Surat Perintah Kerja Lembur (SPKL)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data Pimpinan Divisi & Identitas Lengkap Tim Payroll untuk dicetak otomatis ke file Word (.docx)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocConfig} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Pimpinan Divisi */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  1. Pimpinan Divisi/Regional (Pemberi Perintah)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Nama Pimpinan:</label>
                    <input
                      type="text"
                      value={docConfig.leaderName}
                      onChange={(e) =>
                        setDocConfig((prev) => ({ ...prev, leaderName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">NIPP Pimpinan:</label>
                    <input
                      type="text"
                      value={docConfig.leaderNipp}
                      onChange={(e) =>
                        setDocConfig((prev) => ({ ...prev, leaderNipp: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Jabatan Pimpinan:</label>
                    <input
                      type="text"
                      value={docConfig.leaderPosition}
                      onChange={(e) =>
                        setDocConfig((prev) => ({ ...prev, leaderPosition: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Kota Tanda Tangan:</label>
                    <input
                      type="text"
                      value={docConfig.city}
                      onChange={(e) =>
                        setDocConfig((prev) => ({ ...prev, city: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold mb-1">
                      Alasan Lembur Default (SPKL):
                    </label>
                    <textarea
                      rows={2}
                      value={docConfig.defaultReason || ''}
                      onChange={(e) =>
                        setDocConfig((prev) => ({ ...prev, defaultReason: e.target.value }))
                      }
                      placeholder="Contoh: Diperlukan lembur untuk kebutuhan penyelesaian target data gaji..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Identitas Tim Payroll */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  2. Identitas Lengkap Karyawan per Profil
                </h4>
                <div className="space-y-2.5">
                  {APP_USER_PROFILES.map((prof) => {
                    const emp = docConfig.employees[prof.id] || {
                      fullName: prof.name,
                      nipp: '',
                      position: 'Staff Payroll',
                    };
                    return (
                      <div
                        key={prof.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                      >
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span
                            className={`h-6 w-6 rounded-lg text-white text-[10px] flex items-center justify-center ${prof.avatarBg}`}
                          >
                            {prof.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{prof.name}</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Nama Lengkap di Surat"
                          value={emp.fullName}
                          onChange={(e) =>
                            setDocConfig((prev) => ({
                              ...prev,
                              employees: {
                                ...prev.employees,
                                [prof.id]: { ...emp, fullName: e.target.value },
                              },
                            }))
                          }
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="NIPP"
                          value={emp.nipp}
                          onChange={(e) =>
                            setDocConfig((prev) => ({
                              ...prev,
                              employees: {
                                ...prev.employees,
                                [prof.id]: { ...emp, nipp: e.target.value },
                              },
                            }))
                          }
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Jabatan"
                          value={emp.position}
                          onChange={(e) =>
                            setDocConfig((prev) => ({
                              ...prev,
                              employees: {
                                ...prev.employees,
                                [prof.id]: { ...emp, position: e.target.value },
                              },
                            }))
                          }
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Konfigurasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
