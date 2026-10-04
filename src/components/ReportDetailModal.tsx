'use client';

import React, { useState } from 'react';
import {
  X,
  Phone,
  Trash2,
  Save,
  Loader2,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckSquare,
  Check,
} from 'lucide-react';
import {
  PayrollReport,
  CATEGORY_LABELS,
  ActionStatus,
  Priority,
} from '@/lib/types';

interface ReportDetailModalProps {
  report: PayrollReport | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ReportDetailModal({
  report,
  isOpen,
  onClose,
  onUpdated,
}: ReportDetailModalProps) {
  if (!isOpen || !report) return null;

  return (
    <ReportDetailModalContent
      key={report.id}
      report={report}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  );
}

function ReportDetailModalContent({
  report,
  onClose,
  onUpdated,
}: {
  report: PayrollReport;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [actionStatus, setActionStatus] = useState<ActionStatus>(report.actionStatus);
  const [priority, setPriority] = useState<Priority>(report.priority);
  const [resolutionNotes, setResolutionNotes] = useState(report.resolutionNotes || '');
  const [discrepancyAmount, setDiscrepancyAmount] = useState<number>(report.discrepancyAmount || 0);
  const [dueDate, setDueDate] = useState(report.dueDate || '');

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoAdded, setTodoAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateTodoFromReport = async () => {
    setTodoLoading(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Tindak lanjuti ${report.ticketNumber}: ${CATEGORY_LABELS[report.category] || report.category} - ${report.employeeName} (${report.department})`,
          priority: report.priority,
          dueDate: report.dueDate || '',
          relatedTicketNumber: report.ticketNumber,
        }),
      });
      if (res.ok) {
        setTodoAdded(true);
        setTimeout(() => setTodoAdded(false), 3000);
        onUpdated();
      }
    } catch (err) {
      console.error('Failed to create todo from report:', err);
    } finally {
      setTodoLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionStatus,
          priority,
          resolutionNotes,
          discrepancyAmount,
          dueDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan perubahan.');
      }

      onUpdated();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus laporan ini?')) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus laporan.');
      }
      onUpdated();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus laporan.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    if (!val || val === 0) return 'Rp 0 (Tidak ada selisih)';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cleanPhone = report.phoneNumber?.replace(/[^0-9]/g, '') || '';
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(
        `Halo ${report.employeeName}, terkait laporan kendala payroll Anda di PT Pelindo Daya Sejahtera (${report.ticketNumber} - ${CATEGORY_LABELS[report.category]})...`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="font-mono text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              {report.ticketNumber}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                {CATEGORY_LABELS[report.category] || report.category}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Dilaporkan pada {new Date(report.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profil Karyawan & Nominal */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Pegawai / Pelapor
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {report.employeeName}
              </div>
              <div className="text-xs text-slate-600">
                NRP: {report.employeeNik} • Project: {report.department}
              </div>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Kirim Chat WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Estimasi Selisih
              </div>
              <div className="text-lg font-bold text-indigo-700 mt-0.5">
                {formatRupiah(discrepancyAmount)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Periode: <span className="font-medium text-slate-700">{report.period}</span>
              </div>
            </div>
          </div>

          {/* Deskripsi Laporan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Kronologi Laporan:
            </label>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {report.description || 'Tidak ada deskripsi rinci.'}
            </div>
          </div>

          {/* Lampiran jika ada */}
          {report.attachmentUrl && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lampiran Bukti (Slip / Timesheet):
              </label>
              <div className="rounded-xl border border-slate-200 p-2 overflow-hidden bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.attachmentUrl}
                  alt={report.attachmentName || 'Bukti Laporan'}
                  className="max-h-48 rounded-lg object-contain mx-auto"
                />
              </div>
            </div>
          )}

          <hr className="border-slate-100" />

          {/* Form Tindakan Asisten */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Tindakan Penanganan
              </h4>
              <button
                type="button"
                onClick={handleCreateTodoFromReport}
                disabled={todoLoading || todoAdded}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  todoAdded
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                {todoLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : todoAdded ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                )}
                <span>{todoAdded ? '✓ Masuk To-Do List' : '+ Tambah ke To-Do List'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as ActionStatus)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                >
                  <option value="OPEN">🟡 Open</option>
                  <option value="CROSSCHECK">🔵 Crosscheck</option>
                  <option value="CLOSE">🟢 Close</option>
                </select>
              </div>

              {/* Ubah Prioritas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="TINGGI">Tinggi</option>
                  <option value="URGENT">Mendesak / Urgent 🔴</option>
                </select>
              </div>

              {/* Target Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Selesai
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            {/* Koreksi Nominal Final */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Koreksi Nominal (Rp) <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                type="number"
                value={discrepancyAmount}
                onChange={(e) => setDiscrepancyAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>

            {/* Catatan Tindak Lanjut */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Solusi / Hasil Crosscheck:
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Contoh: Sudah dikonfirmasi ke PIC Project, lembur disetujui dan diajukan rapel / slip sudah dikirim via email..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Hapus</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Simpan<span className="hidden sm:inline"> Perubahan</span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
