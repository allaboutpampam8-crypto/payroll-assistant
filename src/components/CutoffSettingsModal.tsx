'use client';

import React, { useState } from 'react';
import { X, Calendar, Save, Loader2, AlertCircle } from 'lucide-react';
import { PayrollSettings } from '@/lib/types';

interface CutoffSettingsModalProps {
  isOpen: boolean;
  settings: PayrollSettings;
  onClose: () => void;
  onUpdated: () => void;
}

export default function CutoffSettingsModal({
  isOpen,
  settings,
  onClose,
  onUpdated,
}: CutoffSettingsModalProps) {
  const [activePeriod, setActivePeriod] = useState(settings.activePeriod);
  const [cutoffDate, setCutoffDate] = useState(settings.cutoffDate);
  const [companyName, setCompanyName] = useState(settings.companyName);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePeriod,
          cutoffDate,
          companyName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan pengaturan.');
      }

      onUpdated();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan Periode & Cut-Off
              </h3>
              <p className="text-xs text-slate-500">
                Sesuaikan jadwal payroll untuk kalkulasi pengingat otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Periode Penggajian Aktif
            </label>
            <input
              type="text"
              required
              value={activePeriod}
              onChange={(e) => setActivePeriod(e.target.value)}
              placeholder="Contoh: Oktober 2026"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Batas (Cut-Off) Payroll
            </label>
            <input
              type="date"
              required
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Asisten akan memberikan peringatan mendesak jika laporan belum selesai menjelang tanggal ini.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Perusahaan / Organisasi
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Contoh: PT Pelindo Daya Sejahtera"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
