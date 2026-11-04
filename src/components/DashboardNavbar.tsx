'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  FileSpreadsheet,
  Database,
  Scissors,
  Calculator,
  Lock,
  ChevronDown,
  CheckCircle2,
  HardDriveDownload,
  Layers,
  Sun,
  Moon,
} from 'lucide-react';
import { PayrollSettings, AppUserProfile, APP_USER_PROFILES } from '@/lib/types';
import { useTheme } from '@/components/ThemeProvider';

export interface DashboardNavbarProps {
  settings: PayrollSettings;
  activeProfile: AppUserProfile;
  onSwitchProfile: (profile: AppUserProfile) => void;
  onLogout: () => void;
  onOpenQuickEntry: () => void;
  onOpenPayrollModal: () => void;
  onOpenTerbilang: () => void;
  onExportReports: () => void;
}

export default function DashboardNavbar({
  settings,
  activeProfile,
  onSwitchProfile,
  onLogout,
  onOpenQuickEntry,
  onOpenPayrollModal,
  onOpenTerbilang,
  onExportReports,
}: DashboardNavbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileDropdownOpen && !isToolsDropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        isProfileDropdownOpen &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(target)
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (
        isToolsDropdownOpen &&
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(target)
      ) {
        setIsToolsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false);
        setIsToolsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileDropdownOpen, isToolsDropdownOpen]);

  const activeProfileInfo =
    APP_USER_PROFILES.find((p) => p.id === activeProfile) || APP_USER_PROFILES[0];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3.5 sm:px-6 py-2.5 sm:py-3.5 shadow-xs transition-colors">
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
              <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {settings.assistantName}
              </h1>
              <span className="hidden md:inline-flex rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 shrink-0">
                Tim Aktif
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              {settings.companyName} • {settings.activePeriod}
            </p>
          </div>
        </div>

        {/* Action Buttons Navbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Profil Aktif Switcher (Multi-User) */}
          <div ref={profileDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isProfileDropdownOpen
                  ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Klik untuk beralih profil pengguna"
            >
              <div
                className={`h-5 w-5 rounded-md flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 ${activeProfileInfo.avatarBg}`}
              >
                {activeProfile.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{activeProfile}</span>
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
              <div className="absolute right-0 mt-2 w-56 sm:w-60 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span>Beralih Profil Tim</span>
                  <span className="text-[9px] font-normal text-slate-400">Pilih PIC</span>
                </div>
                  {APP_USER_PROFILES.map((prof) => {
                    const isActive = activeProfile === prof.id;
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          onSwitchProfile(prof.id);
                        }}
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
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Kunci Layar (Keluar)</span>
                    </button>
                  </div>
                </div>
            )}
          </div>

          {/* Dropdown Alat Bantu Payroll */}
          <div ref={toolsDropdownRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setIsToolsDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isToolsDropdownOpen
                  ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Alat Bantu</span>
              <ChevronDown
                className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                  isToolsDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {isToolsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                  <button
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      onOpenPayrollModal();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-indigo-50/70 dark:hover:bg-slate-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Data & Analisis Payroll</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Cari & komparasi gaji 17k+ pegawai</p>
                    </div>
                  </button>

                  <Link
                    href="/tools/excel-splitter"
                    onClick={() => setIsToolsDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-sky-50/70 dark:hover:bg-slate-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Pemecah Excel HRIS</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Bagi file per 1000 baris format utuh</p>
                    </div>
                  </Link>

                  <Link
                    href="/tools/tanos-normalizer"
                    onClick={() => setIsToolsDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-violet-50/70 dark:hover:bg-slate-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Normalisasi Data Tanos</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Urutkan 150+ kolom gaji Tanos otomatis</p>
                    </div>
                  </Link>

                  <button
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      onOpenTerbilang();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50/70 dark:hover:bg-slate-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Kalkulator Terbilang ND</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Konversi nominal ke kalimat Nota Dinas</p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                  <button
                    onClick={() => {
                      setIsToolsDropdownOpen(false);
                      onExportReports();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50/70 dark:hover:bg-slate-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Unduh Rekap Tiket</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Export laporan kendala ke Excel</p>
                    </div>
                  </button>

                  <a
                    href="/api/backup"
                    download
                    onClick={() => setIsToolsDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-purple-50/70 dark:hover:bg-slate-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <HardDriveDownload className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Cadangkan Data (JSON)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Backup 1-klik tiket & to-do list</p>
                    </div>
                  </a>
                </div>
            )}
          </div>

          {/* Tombol Catat Laporan */}
          <button
            onClick={onOpenQuickEntry}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Laporan</span>
          </button>

          {/* Tombol Tema Dark / Light */}
          <button
            type="button"
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap (Lembur)'}
            aria-label="Ubah Tema"
            className="shrink-0 flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-750 text-slate-600 dark:text-amber-400 hover:text-amber-600 transition-colors cursor-pointer shadow-xs"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Tombol Kunci Layar */}
          <button
            onClick={onLogout}
            title="Kunci Layar Dashboard (PIN Security)"
            className="shrink-0 flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shadow-xs"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
