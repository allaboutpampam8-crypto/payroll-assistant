'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { PayrollSettings, AppUserProfile, APP_USER_PROFILES } from '@/lib/types';

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
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);

  const activeProfileInfo =
    APP_USER_PROFILES.find((p) => p.id === activeProfile) || APP_USER_PROFILES[0];

  return (
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
                      onOpenPayrollModal();
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
                      onOpenTerbilang();
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
                      onExportReports();
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
            onClick={onOpenQuickEntry}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Laporan</span>
          </button>

          {/* Tombol Kunci Layar */}
          <button
            onClick={onLogout}
            title="Kunci Layar Dashboard (PIN Security)"
            className="shrink-0 flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
