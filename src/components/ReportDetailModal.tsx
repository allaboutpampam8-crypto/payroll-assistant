'use client';

import React, { useState, useRef } from 'react';
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
  CheckCircle2,
  MessageCircle,
  Paperclip,
  Upload,
  Maximize2,
  FileText,
} from 'lucide-react';
import {
  PayrollReport,
  CATEGORY_LABELS,
  ActionStatus,
  Priority,
  AppUserProfile,
  APP_USER_PROFILES,
} from '@/lib/types';

interface ReportDetailModalProps {
  report: PayrollReport | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedReport?: PayrollReport) => void;
  activeUser?: AppUserProfile;
}

export default function ReportDetailModal({
  report,
  isOpen,
  onClose,
  onUpdated,
  activeUser = 'Pampam',
}: ReportDetailModalProps) {
  if (!isOpen || !report) return null;

  return (
    <ReportDetailModalContent
      key={report.id}
      report={report}
      onClose={onClose}
      onUpdated={onUpdated}
      activeUser={activeUser}
    />
  );
}

function ReportDetailModalContent({
  report,
  onClose,
  onUpdated,
  activeUser,
}: {
  report: PayrollReport;
  onClose: () => void;
  onUpdated: (updatedReport?: PayrollReport) => void;
  activeUser: AppUserProfile;
}) {
  const [actionStatus, setActionStatus] = useState<ActionStatus>(report.actionStatus);
  const [priority, setPriority] = useState<Priority>(report.priority);
  const [resolutionNotes, setResolutionNotes] = useState(report.resolutionNotes || '');
  const [discrepancyAmount, setDiscrepancyAmount] = useState<number>(report.discrepancyAmount || 0);
  const [dueDate, setDueDate] = useState(report.dueDate || '');
  const [picName, setPicName] = useState<string>(report.picName || activeUser || 'Pampam');
  const [reportedBy, setReportedBy] = useState(report.reportedBy || '');
  const [phoneNumber, setPhoneNumber] = useState(report.phoneNumber || '');
  const [attachmentUrl, setAttachmentUrl] = useState(report.attachmentUrl || '');
  const [attachmentName, setAttachmentName] = useState(report.attachmentName || '');
  const [isViewingFullImage, setIsViewingFullImage] = useState(false);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  const handleDetailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas lampiran maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachmentUrl(base64);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoAdded, setTodoAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keyboard shortcut Esc untuk menutup modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !deleteLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading, deleteLoading]);

  const handleCreateTodoFromReport = async () => {
    setTodoLoading(true);
    try {
      const isSuper = activeUser === 'Ucup';
      const targetUser = isSuper ? (report.picName || picName || 'Pampam') : (activeUser || 'Pampam');
      const prefix = isSuper && targetUser !== 'Ucup' ? '[Dari Superintendent] ' : '';
      const finalTitle = `${prefix}Tindak lanjuti ${report.ticketNumber}: ${CATEGORY_LABELS[report.category] || report.category} - ${report.employeeName} (${report.department})`;

      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          priority: report.priority,
          dueDate: report.dueDate || '',
          relatedTicketNumber: report.ticketNumber,
          userName: targetUser,
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
          reportedBy,
          picName: picName || activeUser || 'Pampam',
          phoneNumber: phoneNumber.trim(),
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan perubahan.');
      }

      onUpdated(data.data);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
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
      setShowDeleteConfirm(false);
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

  const cleanPhone = phoneNumber?.replace(/[^0-9]/g, '') || '';
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(
        `Halo Rekan ${report.employeeName}, saya dari Tim PIC Payroll PT Pelindo Daya Sejahtera menindaklanjuti tiket #${report.ticketNumber} mengenai ${CATEGORY_LABELS[report.category] || report.category}. Status saat ini: ${actionStatus}.`
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
              {report.actionStatus === 'CLOSE' && report.resolvedAt && (
                <p className="text-[11px] sm:text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Selesai pada {new Date(report.resolvedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              )}
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
          {loading && (
            <div className="flex items-center gap-2.5 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700 border border-indigo-200 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
              <span className="font-semibold">
                Sedang menyimpan perubahan laporan ke sistem... Mohon tunggu sebentar.
              </span>
            </div>
          )}

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
                Pegawai
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {report.employeeName}
              </div>
              <div className="text-xs text-slate-600">
                NRP: {report.employeeNik} • Project: {report.department}
              </div>
              {reportedBy && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md font-medium">
                  🗣️ Pelapor: <span className="font-semibold">{reportedBy}</span>
                </div>
              )}

              {/* No. WhatsApp & Direct Chat */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="No. WhatsApp..."
                    className="text-xs text-slate-800 outline-none w-32 placeholder:text-slate-400 font-medium"
                    title="Nomor WhatsApp pegawai (dapat diubah/disimpan)"
                  />
                </div>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Chat WA Pegawai</span>
                    <ExternalLink className="h-3 w-3 text-emerald-500" />
                  </a>
                )}
              </div>
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

          {/* Lampiran Bukti / Slip */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Lampiran Bukti (Slip / Timesheet):
              </label>
              <button
                type="button"
                onClick={() => detailFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                <span>{attachmentUrl ? 'Ganti Berkas' : '+ Unggah Bukti'}</span>
              </button>
              <input
                ref={detailFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleDetailFileChange}
                className="hidden"
              />
            </div>

            {attachmentUrl ? (
              <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50 space-y-2">
                {attachmentUrl.startsWith('data:image') || attachmentUrl.startsWith('http') ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center max-h-56">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachmentUrl}
                      alt={attachmentName || 'Bukti Laporan'}
                      className="max-h-56 rounded-lg object-contain mx-auto cursor-pointer"
                      onClick={() => setIsViewingFullImage(true)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <span className="bg-white/90 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <Maximize2 className="h-3 w-3" />
                        Klik untuk perbesar
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate flex-1">
                      {attachmentName || 'Dokumen Lampiran'}
                    </span>
                    <a
                      href={attachmentUrl}
                      download={attachmentName || 'lampiran.pdf'}
                      className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      Unduh
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <span className="text-slate-500 text-[11px] truncate max-w-[200px]">
                    📎 {attachmentName || 'lampiran-bukti'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsViewingFullImage(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Perbesar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl('');
                        setAttachmentName('');
                        if (detailFileInputRef.current) detailFileInputRef.current.value = '';
                      }}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => detailFileInputRef.current?.click()}
                className="border border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-3 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/30 text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1.5"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Belum ada berkas bukti dilampirkan. Klik untuk mengunggah.</span>
              </div>
            )}
          </div>

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

            {/* Interactive Status Stepper */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  Alur Status Pengerjaan (Klik untuk Ubah Cepat):
                </span>
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">Pilih status aktif</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Step 1: OPEN */}
                <button
                  type="button"
                  onClick={() => setActionStatus('OPEN')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    actionStatus === 'OPEN'
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${actionStatus === 'OPEN' ? 'text-amber-700' : 'text-slate-400'}`}>
                      Tahap 1
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${actionStatus === 'OPEN' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">🟡 Open</div>
                  <div className="text-[10px] text-slate-500">Laporan Baru</div>
                </button>

                {/* Step 2: CROSSCHECK */}
                <button
                  type="button"
                  onClick={() => setActionStatus('CROSSCHECK')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    actionStatus === 'CROSSCHECK'
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${actionStatus === 'CROSSCHECK' ? 'text-sky-700' : 'text-slate-400'}`}>
                      Tahap 2
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${actionStatus === 'CROSSCHECK' ? 'bg-sky-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">🔵 Crosscheck</div>
                  <div className="text-[10px] text-slate-500">Sedang Investigasi</div>
                </button>

                {/* Step 3: CLOSE */}
                <button
                  type="button"
                  onClick={() => setActionStatus('CLOSE')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    actionStatus === 'CLOSE'
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${actionStatus === 'CLOSE' ? 'text-emerald-700' : 'text-slate-400'}`}>
                      Tahap 3
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${actionStatus === 'CLOSE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 mt-1">🟢 Close</div>
                  <div className="text-[10px] text-slate-500">Selesai / Tuntas</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status Dropdown */}
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
                {actionStatus === 'CLOSE' && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>Tanggal & jam selesai otomatis dicatat</span>
                  </p>
                )}
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

            {/* Baris PIC & Pelapor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PIC Penanggung Jawab
                </label>
                <select
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-xs font-semibold text-indigo-950 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none cursor-pointer"
                >
                  {APP_USER_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      👤 {p.name} ({p.roleLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pelapor / Sumber Laporan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  placeholder="Contoh: Pak Doni, HR Project..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>
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
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl animate-in fade-in">
              <span className="text-xs text-rose-800 font-semibold">Hapus permanen?</span>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading}
              className="px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          )}

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
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan<span className="hidden sm:inline"> Perubahan</span></span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fullscreen Attachment Preview Modal */}
        {isViewingFullImage && attachmentUrl && (
          <div
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setIsViewingFullImage(false)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white border-b border-slate-700">
                <span className="text-xs font-semibold truncate flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-indigo-400" />
                  {attachmentName || 'Lampiran Bukti'}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={attachmentUrl}
                    download={attachmentName || 'lampiran'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                  >
                    Buka / Unduh
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsViewingFullImage(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-2 overflow-auto flex items-center justify-center bg-slate-950">
                {attachmentUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={attachmentUrl}
                    className="w-full h-[75vh] rounded-lg"
                    title="PDF Preview"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={attachmentUrl}
                    alt="Bukti Lampiran"
                    className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
