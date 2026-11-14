'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Lock, AlertCircle, Loader2, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { AppUserProfile, APP_USER_PROFILES } from '@/lib/types';

interface PinLockScreenProps {
  onSuccess: (user: AppUserProfile) => void;
  assistantName?: string;
  companyName?: string;
}

export default function PinLockScreen({
  onSuccess,
  assistantName = 'Asisten Payroll & Task Tracker',
  companyName = 'PT Pelindo Daya Sejahtera',
}: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUserProfile>('Pampam');

  useEffect(() => {
    const saved = localStorage.getItem('lapor_payroll_active_user') as AppUserProfile;
    if (saved && ['Pampam', 'Wahid', 'Izul', 'Ucup'].includes(saved)) {
      setSelectedUser(saved);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        localStorage.setItem('payroll_pin_authenticated', 'true');
        setIsPinVerified(true);
      } else {
        setErrorMsg(json.message || 'PIN salah. Akses ditolak.');
        setPin('');
      }
    } catch {
      setErrorMsg('Gagal memverifikasi PIN. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfileAndProceed = (profile: AppUserProfile) => {
    localStorage.setItem('lapor_payroll_active_user', profile);
    onSuccess(profile);
  };

  const handleQuickDigit = (num: string) => {
    if (pin.length < 10) {
      setPin((prev) => prev + num);
      setErrorMsg('');
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 flex flex-col items-center text-center">
        {/* Avatar Maskot & Badge */}
        <div className="relative mb-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-600/30 overflow-hidden border-2 border-indigo-400/40">
            <Image
              src="/mascot/avatar.png"
              alt="Maskot Si PALI"
              width={80}
              height={80}
              className="object-cover"
              priority
            />
          </div>
          <div className={`absolute -bottom-1.5 -right-1.5 p-2 rounded-xl text-white shadow-md border-2 border-white dark:border-slate-900 ${isPinVerified ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 shadow-amber-500/30'}`}>
            {isPinVerified ? <UserCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </div>
        </div>

        {/* Step 2: Pilih Profil Pengguna */}
        {isPinVerified ? (
          <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Pilih Profil Anda
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data laporan dan to-do list akan disesuaikan dengan profil Anda:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2">
              {APP_USER_PROFILES.map((prof) => {
                const isSelected = selectedUser === prof.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleSelectProfileAndProceed(prof.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs ${prof.avatarBg}`}>
                        {prof.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {prof.name}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {prof.roleLabel}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'}`} />
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 pt-2">
              Profil dapat Anda ganti kapan saja di navbar atas.
            </p>
          </div>
        ) : (
          /* Step 1: Input PIN Utama */
          <>
            {/* Brand & Keterangan */}
            <div className="space-y-1 mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {assistantName}
              </h2>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                {companyName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto pt-1 leading-relaxed">
                Data penggajian bersifat rahasia. Masukkan PIN keamanan untuk membuka akses tim.
              </p>
            </div>

            {/* Form PIN */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/[^0-9]/g, ''));
                    setErrorMsg('');
                  }}
                  placeholder="Masukkan 6-Digit PIN..."
                  className="w-full text-center tracking-widest text-lg sm:text-xl font-mono font-extrabold py-3 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 outline-none transition-all placeholder:text-xs placeholder:tracking-normal placeholder:font-sans placeholder:font-normal"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Keypad Numeric Cepat */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleQuickDigit(digit)}
                    className="py-2.5 rounded-xl font-mono text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDeleteDigit}
                  className="py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDigit('0')}
                  className="py-2.5 rounded-xl font-mono text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700"
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={loading || !pin}
                  className="py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-md shadow-indigo-600/30"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span>Lanjut</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
