'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, Pause, Play, ArrowUpRight } from 'lucide-react';
import { AppUserProfile, OvertimeChecklistItem } from '@/lib/types';
import { formatStopwatchSeconds, formatTimeDot } from '@/lib/overtimeUtils';
import { useToast } from '@/components/ToastProvider';

const STORAGE_KEY = 'lapor_payroll_focus_session_v1';

export type FocusSessionStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

export interface ActiveFocusSession {
  status: FocusSessionStatus;
  startedAtMs: number | null;
  pausedAtMs: number | null;
  totalPausedMs: number;
  userProfile: AppUserProfile;
  presetId: string;
  jobDescription: string;
  targetDescription: string;
  reason: string;
  checklist: OvertimeChecklistItem[];
  focusIntervalMinutes: number; // Pengingat istirahat mata opsional (e.g. 50 menit)
  acknowledgedIntervals: number;
}

const DEFAULT_SESSION: ActiveFocusSession = {
  status: 'IDLE',
  startedAtMs: null,
  pausedAtMs: null,
  totalPausedMs: 0,
  userProfile: 'Pampam',
  presetId: 'posting_absensi_pegawai',
  jobDescription: '',
  targetDescription: '',
  reason:
    'Diperlukan lembur untuk kebutuhan penyelesaian target data gaji pada tanggal 23 setiap bulan',
  checklist: [],
  focusIntervalMinutes: 50,
  acknowledgedIntervals: 0,
};

interface OvertimeFocusContextType {
  session: ActiveFocusSession;
  elapsedSeconds: number;
  pauseMinutes: number;
  startTimeDot: string;
  startDateIso: string;
  startSession: (payload: {
    userProfile: AppUserProfile;
    presetId: string;
    jobDescription: string;
    targetDescription: string;
    reason: string;
    checklist: OvertimeChecklistItem[];
    focusIntervalMinutes?: number;
  }) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  discardSession: () => void;
  updateSessionDetails: (partial: Partial<ActiveFocusSession>) => void;
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (label: string) => void;
  removeChecklistItem: (id: string) => void;
}

const OvertimeFocusContext = createContext<OvertimeFocusContextType | null>(null);

export function OvertimeFocusProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [session, setSession] = useState<ActiveFocusSession>(DEFAULT_SESSION);
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Hydrate dari localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSession({ ...DEFAULT_SESSION, ...parsed });
      } else {
        const savedUser = localStorage.getItem('lapor_payroll_active_user') as AppUserProfile;
        if (savedUser) {
          setSession((prev) => ({ ...prev, userProfile: savedUser }));
        }
      }
    } catch {
      // ignore storage error
    }
    setNowMs(Date.now());
    setHydrated(true);
  }, []);

  // Persist perubahan ke localStorage (0 egress)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [session, hydrated]);

  // Tick setiap 1 detik saat RUNNING atau PAUSED + cek pengingat istirahat mata
  useEffect(() => {
    if (session.status === 'IDLE') return;
    const timer = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      if (
        session.status === 'RUNNING' &&
        session.startedAtMs &&
        session.focusIntervalMinutes > 0
      ) {
        const curElapsedSec = Math.floor(
          Math.max(0, now - session.startedAtMs - session.totalPausedMs) / 1000
        );
        const intervalSec = session.focusIntervalMinutes * 60;
        const completedIntervals = Math.floor(curElapsedSec / intervalSec);
        if (completedIntervals > session.acknowledgedIntervals) {
          setSession((prev) => ({
            ...prev,
            acknowledgedIntervals: completedIntervals,
          }));
          toast.info(
            `Sudah ${completedIntervals * session.focusIntervalMinutes} menit fokus lembur. Istirahatkan mata 3–5 menit & minum air sejenak sebelum lanjut.`
          );
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [
    session.status,
    session.startedAtMs,
    session.totalPausedMs,
    session.focusIntervalMinutes,
    session.acknowledgedIntervals,
    toast,
  ]);

  // Hitung elapsed seconds real berdasarkan timestamp
  let elapsedMs = 0;
  let currentPauseMs = session.totalPausedMs;
  if (session.startedAtMs) {
    if (session.status === 'RUNNING') {
      elapsedMs = Math.max(0, nowMs - session.startedAtMs - session.totalPausedMs);
    } else if (session.status === 'PAUSED' && session.pausedAtMs) {
      elapsedMs = Math.max(0, session.pausedAtMs - session.startedAtMs - session.totalPausedMs);
      currentPauseMs = session.totalPausedMs + Math.max(0, nowMs - session.pausedAtMs);
    }
  }

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const pauseMinutes = Math.round(currentPauseMs / 60000);

  const startSession = useCallback(
    (payload: {
      userProfile: AppUserProfile;
      presetId: string;
      jobDescription: string;
      targetDescription: string;
      reason: string;
      checklist: OvertimeChecklistItem[];
      focusIntervalMinutes?: number;
    }) => {
      const now = Date.now();
      setNowMs(now);
      setSession({
        status: 'RUNNING',
        startedAtMs: now,
        pausedAtMs: null,
        totalPausedMs: 0,
        userProfile: payload.userProfile,
        presetId: payload.presetId,
        jobDescription: payload.jobDescription,
        targetDescription: payload.targetDescription,
        reason: payload.reason,
        checklist: payload.checklist,
        focusIntervalMinutes: payload.focusIntervalMinutes ?? 50,
        acknowledgedIntervals: 0,
      });
    },
    []
  );

  const pauseSession = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setSession((prev) => {
      if (prev.status !== 'RUNNING') return prev;
      return {
        ...prev,
        status: 'PAUSED',
        pausedAtMs: now,
      };
    });
  }, []);

  const resumeSession = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setSession((prev) => {
      if (prev.status !== 'PAUSED' || !prev.pausedAtMs) return prev;
      const pauseDelta = Math.max(0, now - prev.pausedAtMs);
      return {
        ...prev,
        status: 'RUNNING',
        pausedAtMs: null,
        totalPausedMs: prev.totalPausedMs + pauseDelta,
      };
    });
  }, []);

  const discardSession = useCallback(() => {
    setSession((prev) => ({
      ...DEFAULT_SESSION,
      userProfile: prev.userProfile,
    }));
  }, []);

  const updateSessionDetails = useCallback((partial: Partial<ActiveFocusSession>) => {
    setSession((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    }));
  }, []);

  const addChecklistItem = useCallback((label: string) => {
    const clean = label.trim();
    if (!clean) return;
    setSession((prev) => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        { id: `chk-${Date.now()}`, label: clean, done: false },
      ],
    }));
  }, []);

  const removeChecklistItem = useCallback((id: string) => {
    setSession((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((c) => c.id !== id),
    }));
  }, []);

  const startDateObj = session.startedAtMs ? new Date(session.startedAtMs) : new Date();
  const startTimeDot = formatTimeDot(startDateObj);
  const startDateIso = `${startDateObj.getFullYear()}-${String(
    startDateObj.getMonth() + 1
  ).padStart(2, '0')}-${String(startDateObj.getDate()).padStart(2, '0')}`;

  const showFloatingBadge =
    hydrated &&
    session.status !== 'IDLE' &&
    pathname !== '/tools/deep-focus' &&
    pathname !== '/lapor';

  return (
    <OvertimeFocusContext.Provider
      value={{
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
      }}
    >
      {children}

      {/* Floating Mini-Bar Indikator Lembur Aktif saat user pindah halaman */}
      {showFloatingBadge && (
        <div className="fixed bottom-20 md:bottom-5 left-4 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
              session.status === 'RUNNING'
                ? 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/30'
                : 'bg-amber-950/95 text-amber-100 border-amber-500/50'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                session.status === 'RUNNING'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {session.status === 'RUNNING' ? 'Lembur Aktif' : 'Sedang Jeda'} ({session.userProfile})
              </span>
              <span className="font-mono text-sm font-extrabold tracking-tight flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                {formatStopwatchSeconds(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-2">
              {session.status === 'RUNNING' ? (
                <button
                  type="button"
                  onClick={pauseSession}
                  title="Jeda / Istirahat"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors cursor-pointer"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeSession}
                  title="Lanjutkan Lembur"
                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              )}

              <Link
                href="/tools/deep-focus"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                <span>Buka Fokus</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </OvertimeFocusContext.Provider>
  );
}

export function useOvertimeFocus() {
  const ctx = useContext(OvertimeFocusContext);
  if (!ctx) {
    throw new Error('useOvertimeFocus must be used inside OvertimeFocusProvider');
  }
  return ctx;
}
