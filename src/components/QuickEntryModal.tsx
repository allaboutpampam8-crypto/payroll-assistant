'use client';

import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';
import { IssueCategory, CATEGORY_LABELS, ActionStatus, Priority } from '@/lib/types';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activePeriod: string;
}

export default function QuickEntryModal({
  isOpen,
  onClose,
  onSuccess,
  activePeriod,
}: QuickEntryModalProps) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNik, setEmployeeNik] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState<IssueCategory>('KOREKSI_GAJI');
  const [discrepancyAmount, setDiscrepancyAmount] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('OPEN');
  const [dueDate, setDueDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!employeeName.trim()) {
      setErrorMsg('Nama pegawai wajib diisi.');
      return;
    }

    const amountNum = Number(discrepancyAmount.replace(/[^0-9]/g, '')) || 0;

    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: employeeName.trim(),
          employeeNik: employeeNik.trim() || '-',
          department: department.trim() || 'Project Umum',
          phoneNumber: phoneNumber.trim(),
          category,
          discrepancyAmount: amountNum,
          description: description.trim(),
          period: activePeriod,
          priority,
          actionStatus,
          dueDate,
          source: 'MANUAL_PIC',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan laporan.');
      }

      // Reset form
      setEmployeeName('');
      setEmployeeNik('');
      setDepartment('');
      setPhoneNumber('');
      setDiscrepancyAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const formatInputCurrency = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('id-ID').format(Number(raw));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
              Catat Laporan Cepat
            </h3>
            <p className="text-xs text-slate-500">
              Input instan dari chat WhatsApp, telepon, atau PIC Project.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Baris 1: Nama & NRP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pegawai <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NRP (Nomor Registrasi Pegawai)
              </label>
              <input
                type="text"
                value={employeeNik}
                onChange={(e) => setEmployeeNik(e.target.value)}
                placeholder="Contoh: NRP-240182"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>

          {/* Baris 2: Project & No WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Contoh: Project Terminal Petikemas"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. WhatsApp (Opsional)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Contoh: 08123456789"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>

          {/* Baris 3: Kategori Kendala */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Baris 4: Estimasi Selisih Rp (TIDAK MANDATORY) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimasi Selisih (Rp) <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={discrepancyAmount}
                onChange={(e) => setDiscrepancyAmount(formatInputCurrency(e.target.value))}
                placeholder="Kosongkan jika hanya Permintaan Data"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bisa dikosongkan apabila laporan terkait Permintaan Data atau belum diketahui nominalnya.
            </p>
          </div>

          {/* Baris 5: Status Awal & Prioritas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={actionStatus}
                onChange={(e) => setActionStatus(e.target.value as ActionStatus)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              >
                <option value="OPEN">🟡 Open</option>
                <option value="CROSSCHECK">🔵 Crosscheck</option>
                <option value="CLOSE">🟢 Close</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              >
                <option value="NORMAL">Normal</option>
                <option value="TINGGI">Tinggi</option>
                <option value="URGENT">Mendesak / Urgent 🔴</option>
              </select>
            </div>
          </div>

          {/* Baris 6: Tanggal Target Selesai */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Penyelesaian (Due Date)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          {/* Baris 7: Kronologi / Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi / Keterangan Laporan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Permintaan bukti potong pajak PPh 21 dan rekap slip gaji 3 bulan terakhir..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-none"
            />
          </div>

          {/* Tombol Aksi */}
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
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Laporan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
