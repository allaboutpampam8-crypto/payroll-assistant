'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  Layers,
  FileCheck,
  TrendingUp,
  CreditCard,
  Percent,
  ShieldCheck,
} from 'lucide-react';
import { normalizeTanosWorkbook, NormalizerSummary } from '@/lib/tanosNormalizer';
import PinLockScreen from '@/components/PinLockScreen';

export default function TanosNormalizerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('payroll_pin_authenticated');
      if (stored === 'true') {
        setIsAuthenticated(true);
      }
      setIsAuthChecking(false);
    }
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<NormalizerSummary | null>(null);
  const [processedWorkbook, setProcessedWorkbook] = useState<XLSX.WorkBook | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('Format file harus berupa Excel (.xlsx atau .xls).');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setResultSummary(null);
    setProcessedWorkbook(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('Format file harus berupa Excel (.xlsx atau .xls).');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setResultSummary(null);
    setProcessedWorkbook(null);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      // Proses normalisasi
      const { processedWorkbook: outWb, summary } = normalizeTanosWorkbook(wb);

      setProcessedWorkbook(outWb);
      setResultSummary(summary);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Error normalizing Tanos file:', err);
      setErrorMsg(err.message || 'Gagal memproses file Excel Tanos. Pastikan format file sesuai.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedWorkbook || !selectedFile) return;
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const outFilename = `${baseName}_Terstruktur_Rapi.xlsx`;
    XLSX.writeFile(processedWorkbook, outFilename);
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!isAuthenticated) {
    return (
      <PinLockScreen
        onSuccess={() => setIsAuthenticated(true)}
        assistantName="Normalisasi Data Tanos"
        companyName="PT Pelindo Daya Sejahtera"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Lapor Payroll</span>
          </Link>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Modul Intelijen Tanos
          </span>
        </div>

        {/* Header Title */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
                <Layers className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Normalisasi & Sortir Data Gaji Tanos
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Otomatisasi pengelompokan 150+ kolom berantakan dari aplikasi Tanos menjadi urutan terstruktur:
              <strong className="text-indigo-200"> Identitas ➔ Allowance (Pendapatan) ➔ Deduction (Potongan) ➔ THP ➔ Contribution (Beban Perusahaan)</strong> dalam 1 kali klik tanpa VLOOKUP manual.
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-indigo-400 bg-indigo-50/30'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  Ukuran: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Klik atau drag file lain untuk mengganti
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Pilih atau Tarik File Excel Mentah Tanos ke Sini
                </p>
                <p className="text-xs text-slate-500">
                  Mendukung format <code>.xlsx</code> (Payroll_Component hasil export aplikasi Tanos)
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          {selectedFile && !resultSummary && (
            <button
              type="button"
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sedang Menyelaraskan Komponen Gaji...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Proses & Urutkan Kolom Otomatis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Hasil Pengolahan */}
          {resultSummary && (
            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Proses Normalisasi Sukses!
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Sebanyak <strong>{resultSummary.validEmployeeRows.toLocaleString('id-ID')} baris data pegawai</strong> dan <strong>{resultSummary.totalColumns} kolom komponen</strong> berhasil disortir dan distrukturkan rapi.
                  </p>
                  {resultSummary.filteredTotalRows > 0 && (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ✨ Otomatis menghapus <strong>{resultSummary.filteredTotalRows.toLocaleString('id-ID')} baris total / subtotal kosong</strong> bawaan Tanos agar file siap dianalisis dan pivot tanpa duplikasi data.
                    </p>
                  )}
                </div>
              </div>

              {/* Rincian Komponen Terpetakan */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <span className="text-[11px] font-bold">Identitas</span>
                  </div>
                  <p className="text-lg font-black text-slate-900">{resultSummary.identityCount} Kolom</p>
                  <p className="text-[10px] text-slate-500">NRP, Nama, Unit, dsb</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-bold">Allowance</span>
                  </div>
                  <p className="text-lg font-black text-emerald-900">{resultSummary.allowanceCount} Kolom</p>
                  <p className="text-[10px] text-emerald-700">+ Subtotal Pendapatan</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <div className="flex items-center gap-2 text-rose-700 mb-1">
                    <CreditCard className="w-4 h-4 text-rose-600" />
                    <span className="text-[11px] font-bold">Deduction</span>
                  </div>
                  <p className="text-lg font-black text-rose-900">{resultSummary.deductionCount} Kolom</p>
                  <p className="text-[10px] text-rose-700">+ Subtotal Potongan</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200">
                  <div className="flex items-center gap-2 text-sky-700 mb-1">
                    <Percent className="w-4 h-4 text-sky-600" />
                    <span className="text-[11px] font-bold">Contribution</span>
                  </div>
                  <p className="text-lg font-black text-sky-900">{resultSummary.contributionCount} Kolom</p>
                  <p className="text-[10px] text-sky-700">+ Beban Perusahaan</p>
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xl shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Download className="w-5 h-5" />
                  <span>Download File Excel Terstruktur (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panduan Alur Kolom */}
        <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            Standar Urutan Kolom Hasil Jadi:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800">1. Identitas</span>
              <p className="text-[11px] text-slate-500 leading-tight">Bank, Rekening, NRP, Nama, Unit, Jabatan, Cost Center</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="font-bold text-emerald-900">2. Allowance</span>
              <p className="text-[11px] text-emerald-700 leading-tight">Upah Pokok, seluruh tunjangan, insentif, lembur + <strong>Total Allowance</strong></p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="font-bold text-rose-900">3. Deduction</span>
              <p className="text-[11px] text-rose-700 leading-tight">BPJS Karyawan, PPh21, Koperasi, Potongan Upah + <strong>Total Deduction</strong></p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <span className="font-bold text-amber-900">4. Gaji Bersih</span>
              <p className="text-[11px] text-amber-800 leading-tight"><strong>Take Home Pay (THP)</strong> = Total Allowance - Total Deduction</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
              <span className="font-bold text-sky-900">5. Contribution</span>
              <p className="text-[11px] text-sky-700 leading-tight">JHT, JKK, JKM, BPJS Kes dari perusahaan + <strong>Total Contribution</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
