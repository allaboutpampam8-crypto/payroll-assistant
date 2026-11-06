'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Database,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export default function MaintenancePage() {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckStatus = () => {
    setIsChecking(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 transition-colors duration-200">
      {/* Header Kecil */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/30">
            AP
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Asisten Payroll
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              PT Pelindo Daya Sejahtera
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Pemeliharaan Sistem</span>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="w-full max-w-xl text-center my-auto py-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Ikon Visual Animasi */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/20 animate-pulse" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Database className="w-10 h-10 animate-bounce" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
            <Wrench className="w-4 h-4" />
          </div>
        </div>

        {/* Teks Judul & Deskripsi */}
        <div className="space-y-2.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Sistem Sedang Dalam Pemeliharaan
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            Kami sedang melakukan migrasi dan peningkatan server basis data cloud untuk memastikan sistem berjalan lebih cepat, stabil, dan andal.
          </p>
        </div>

        {/* Kotak Informasi & Jaminan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Data Aman</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              100% data laporan dan to-do list tersimpan rapi dan dicadangkan.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
              <span>Proses Migrasi</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sinkronisasi basis data cloud baru sedang dipersiapkan tim PIC.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Segera Kembali</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Layanan akan segera dibuka kembali dalam beberapa saat.
            </p>
          </div>
        </div>

        {/* Tombol Cek Status */}
        <div className="pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa Status Server...' : 'Muat Ulang / Cek Status Sistem'}</span>
          </button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Klik tombol di atas untuk melihat apakah pemeliharaan telah selesai.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-4 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 PT Pelindo Daya Sejahtera • Divisi Penggajian</p>
        <p className="text-[11px]">Asisten Operasional Payroll HRIS v0.1.0</p>
      </footer>
    </div>
  );
}
