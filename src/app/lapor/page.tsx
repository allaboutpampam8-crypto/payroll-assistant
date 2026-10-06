'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Send,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IssueCategory, CATEGORY_LABELS } from '@/lib/types';

export default function PublicReportPage() {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNik, setEmployeeNik] = useState(''); // Digunakan sebagai NRP
  const [department, setDepartment] = useState('');   // Digunakan sebagai Project
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState<IssueCategory>('KOREKSI_GAJI');
  const [discrepancyAmount, setDiscrepancyAmount] = useState('');
  const [description, setDescription] = useState('');

  // Attachment
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    createdAt: string;
  } | null>(null);

  const [activePeriod, setActivePeriod] = useState('Oktober 2026');
  const [companyName, setCompanyName] = useState('PT Pelindo Daya Sejahtera');

  // Master Payroll Lookup
  const [isSearchingNrp, setIsSearchingNrp] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [matchedEmployee, setMatchedEmployee] = useState<any>(null);

  const handleNrpLookup = async (nrp: string) => {
    const clean = nrp.trim();
    if (clean.length < 3) {
      setMatchedEmployee(null);
      return;
    }
    setIsSearchingNrp(true);
    try {
      const res = await fetch(`/api/payroll-results/query?nik=${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const emp = json.data[0];
        setMatchedEmployee(emp);
        setEmployeeName(emp.employeeName);
        if (emp.department) setDepartment(emp.department);
      } else {
        setMatchedEmployee(null);
      }
    } catch {
      setMatchedEmployee(null);
    } finally {
      setIsSearchingNrp(false);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setActivePeriod(json.data.activePeriod || 'Oktober 2026');
          setCompanyName(json.data.companyName || 'PT Pelindo Daya Sejahtera');
        }
      })
      .catch((err) => console.warn('Could not load settings:', err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas maksimal 5MB.');
      return;
    }

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const formatInputCurrency = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('id-ID').format(Number(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!employeeName.trim() || !employeeNik.trim() || !department.trim()) {
      setErrorMsg('Nama Lengkap, NRP, dan Project wajib diisi.');
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
          employeeNik: employeeNik.trim(),
          department: department.trim(),
          phoneNumber: phoneNumber.trim(),
          category,
          discrepancyAmount: amountNum,
          description: description.trim(),
          period: activePeriod,
          attachmentUrl: attachmentBase64 || undefined,
          attachmentName: attachmentName || undefined,
          source: 'FORM_KARYAWAN',
          actionStatus: 'OPEN',
          priority: 'NORMAL',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengirim laporan.');
      }

      setSubmittedTicket({
        ticketNumber: data.data.ticketNumber,
        createdAt: data.data.createdAt,
      });

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi gangguan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmployeeName('');
    setEmployeeNik('');
    setDepartment('');
    setPhoneNumber('');
    setDiscrepancyAmount('');
    setDescription('');
    setAttachmentBase64(null);
    setAttachmentName('');
    setMatchedEmployee(null);
    setSubmittedTicket(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Asisten</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Data Terlindungi</span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Periode {activePeriod}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Form Lapor Kendala Payroll
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            {companyName} • Silakan ajukan permintaan data, koreksi gaji, atau pemutakhiran data payroll Anda.
          </p>
        </div>

        {/* Submission Success Screen */}
        {submittedTicket ? (
          <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-emerald-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">
                Laporan Berhasil Terkirim!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Laporan Anda telah tercatat dengan status <span className="font-semibold text-amber-600">Open</span> dan akan segera diverifikasi oleh tim payroll.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-1 text-left">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Nomor Tiket Anda
              </div>
              <div className="font-mono text-xl sm:text-2xl font-black text-indigo-600 select-all">
                {submittedTicket.ticketNumber}
              </div>
              <div className="text-xs text-slate-500 pt-1">
                Simpan nomor tiket ini untuk keperluan konfirmasi ke PIC Project atau Admin Payroll.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Buat Laporan Lain
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all text-center"
              >
                Ke Halaman Utama
              </Link>
            </div>
          </div>
        ) : (
          /* Form Input */
          <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-slate-100">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nama & NRP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      NRP (Ketik untuk Autofill) <span className="text-rose-500">*</span>
                    </label>
                    {isSearchingNrp && (
                      <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-normal">
                        <Loader2 className="h-3 w-3 animate-spin" /> Mencari...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={employeeNik}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmployeeNik(val);
                      handleNrpLookup(val);
                    }}
                    placeholder="Contoh: 19770419494"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Pegawai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Nama sesuai data kepegawaian"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              {/* Matched Employee Banner Info */}
              {matchedEmployee && (
                <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50/80 p-2.5 text-xs text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-900">
                      Data Terverifikasi di Master Payroll!
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      {matchedEmployee.positionTitle ? `${matchedEmployee.positionTitle} • ` : ''}
                      {matchedEmployee.department} (Periode {matchedEmployee.period})
                    </div>
                  </div>
                </div>
              )}

              {/* Project & No WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Penempatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Contoh: Project Terminal Petikemas"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp Aktif (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="08123456789"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              {/* Kategori Kendala */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Laporan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IssueCategory)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimasi Selisih (BUKAN MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimasi Selisih Nominal (Rp) <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={discrepancyAmount}
                    onChange={(e) => setDiscrepancyAmount(formatInputCurrency(e.target.value))}
                    placeholder="Kosongkan jika hanya permintaan data"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tidak wajib diisi jika pengajuan berupa Permintaan Data atau belum mengetahui nominal pastinya.
                </p>
              </div>

              {/* Deskripsi Kronologi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan Detail <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan kebutuhan Anda (rincian data yang diminta, tanggal lembur yang belum masuk, dsb.)..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-none"
                />
              </div>

              {/* Upload Foto Slip / Bukti */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Foto Slip Gaji / Bukti Pendukung (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20"
                >
                  {attachmentBase64 ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachmentBase64}
                        alt="Preview Bukti"
                        className="max-h-36 mx-auto rounded-lg object-contain shadow-sm"
                      />
                      <p className="text-xs text-indigo-700 font-medium">
                        ✓ {attachmentName} (Klik untuk mengganti)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        Pilih foto atau ambil gambar dari kamera HP
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Format JPG/PNG maksimal 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Kirim Laporan</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
