'use client';

import React from 'react';
import Image from 'next/image';
import { Database, Sparkles } from 'lucide-react';

interface PageLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export default function PageLoadingScreen({
  message = 'Mengambil Data dari Database Payroll...',
  subMessage = 'Asisten sedang memuat tiket kendala, agenda to-do list, dan ringkasan gaji aktif...',
}: PageLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-opacity duration-500">
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        {/* Mascot Container with floating & glowing effect */}
        <div className="relative mb-6">
          {/* Ambient Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/30 to-sky-400/20 rounded-full blur-xl animate-pulse" />

          {/* Mascot Image Card */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 shadow-xl shadow-indigo-500/10 p-2 flex items-center justify-center group animate-pulse [animation-duration:2.5s]">
            <Image
              src="/mascot/loading_olah_data.png"
              alt="Maskot Mengolah Data Payroll"
              width={160}
              height={160}
              className="object-contain rounded-2xl"
              priority
            />
          </div>

          {/* Mini Status Badge Floating */}
          <div className="absolute -bottom-2 -right-2 flex items-center gap-1.5 bg-indigo-600 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md border-2 border-white dark:border-slate-900">
            <Database className="w-3 h-3 animate-spin [animation-duration:3s]" />
            <span>Sync</span>
          </div>
        </div>

        {/* Heading & Status Text */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Asisten Payroll PT Pelindo Daya Sejahtera</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {message}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            {subMessage}
          </p>
        </div>

        {/* Modern Animated Gradient Progress Bar */}
        <div className="w-56 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-6 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-sky-400 rounded-full w-2/3 animate-[shimmer_1.5s_infinite] relative" />
        </div>

        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-medium">
          Mohon tunggu sebentar...
        </div>
      </div>
    </div>
  );
}
