'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  TrendingUp,
  CreditCard,
  Percent,
  ShieldCheck,
  RefreshCw,
  Check,
  SlidersHorizontal,
  Info,
  Table,
} from 'lucide-react';
import { normalizeTanosWorkbook, NormalizerSummary } from '@/lib/tanosNormalizer';
import PinLockScreen from '@/components/PinLockScreen';
import ToolsHeaderNav from '@/components/ToolsHeaderNav';
import { useToast } from '@/components/ToastProvider';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(1) + ' MB';
}

export default function TanosNormalizerPage() {
  const { toast } = useToast();

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
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<NormalizerSummary | null>(null);
  const [processedWorkbook, setProcessedWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Mini Preview States (5 baris teratas)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);

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
    setPreviewHeaders([]);
    setPreviewRows([]);
    setShowAllColumns(false);
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
    setPreviewHeaders([]);
    setPreviewRows([]);
    setShowAllColumns(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setResultSummary(null);
    setProcessedWorkbook(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setShowAllColumns(false);
    setProgressPercent(0);
    setProgressMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressPercent(15);
    setProgressMessage('Membaca lembar kerja Excel Tanos...');

    try {
      await new Promise((r) => setTimeout(r, 200));
      const buffer = await selectedFile.arrayBuffer();

      setProgressPercent(45);
      setProgressMessage('Mengurai dan memuat data mentah ke memori...');
      await new Promise((r) => setTimeout(r, 200));
      const wb = XLSX.read(buffer, { type: 'array' });

      setProgressPercent(75);
      setProgressMessage('Menyortir 150+ kolom, menghitung THP & membersihkan subtotal...');
      await new Promise((r) => setTimeout(r, 250));

      const { processedWorkbook: outWb, summary } = normalizeTanosWorkbook(wb);

      // Ambil 5 baris pertama untuk preview visual
      const outSheet = outWb.Sheets[outWb.SheetNames[0]];
      const previewMatrix: any[][] = XLSX.utils.sheet_to_json(outSheet, { header: 1 });
      if (previewMatrix.length > 0) {
        setPreviewHeaders(previewMatrix[0] || []);
        setPreviewRows(previewMatrix.slice(1, 6)); // Baris 1 s/d 5
      }

      setProgressPercent(100);
      setProgressMessage('Selesai! Menyusun file terstruktur...');
      await new Promise((r) => setTimeout(r, 200));

      setProcessedWorkbook(outWb);
      setResultSummary(summary);
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
      toast.success(
        `Normalisasi sukses! ${summary.validEmployeeRows.toLocaleString('id-ID')} baris data pegawai berhasil diselaraskan.`
      );
    } catch (err: any) {
      console.error('Error normalizing Tanos file:', err);
      const msg = err.message || 'Gagal memproses file Excel Tanos. Pastikan format file sesuai.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedWorkbook || !selectedFile) return;
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const outFilename = `${baseName}_Terstruktur_Rapi.xlsx`;
    XLSX.writeFile(processedWorkbook, outFilename);
    toast.success(`File ${outFilename} berhasil diunduh!`);
  };

  // Menentukan kolom mana saja yang ditampilkan di mini preview
  const previewDisplayHeaders = React.useMemo(() => {
    if (previewHeaders.length === 0) return [];
    if (showAllColumns) {
      return previewHeaders.map((name, idx) => ({ name, idx }));
    }

    const targetKeywords = [
      'employee number',
      'employee',
      'job formation',
      'unit',
      'total allowance',
      'total deduction',
      'take home pay (thp)',
      'total contribution',
    ];

    const selected: { name: string; idx: number }[] = [];
    targetKeywords.forEach((kw) => {
      const idx = previewHeaders.findIndex((h) => h.toLowerCase().trim() === kw);
      if (idx !== -1) {
        selected.push({ name: previewHeaders[idx], idx });
      }
    });

    if (selected.length === 0) {
      return previewHeaders.slice(0, 8).map((name, idx) => ({ name, idx }));
    }

    return selected;
  }, [previewHeaders, showAllColumns]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors duration-200">
      {/* Header Bar Harmonis */}
      <ToolsHeaderNav activeTool="tanos-normalizer" />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Title Card Hero Harmonis */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-transparent dark:border-slate-800/80 relative overflow-hidden transition-colors">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
                <Layers className="w-3.5 h-3.5" />
                Modul Intelijen Tanos • Urutkan Kolom Otomatis
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Normalisasi & Sortir Data Gaji Tanos
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Kelompokkan 150+ kolom acak dari aplikasi Tanos ke dalam urutan rapi: <strong className="text-indigo-200">Identitas ➔ Allowance (Pendapatan) ➔ Deduction (Potongan) ➔ THP ➔ Contribution (Beban Perusahaan)</strong>. Dilengkapi kalkulasi subtotal dan otomatis menghapus baris subtotal kosong.
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 bg-white/10 dark:bg-slate-800/60 backdrop-blur-xs p-3 rounded-2xl border border-white/15 dark:border-slate-700">
              <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-white/20 dark:bg-slate-700/60 p-1 flex items-center justify-center">
                <Image
                  src="/mascot/ready.png"
                  alt="Si PALI Siap"
                  width={44}
                  height={44}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Si PALI Helper</div>
                <div className="text-[11px] text-sky-200">100% Presisi & Rapi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Assurance Banner Harmonis */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-emerald-900 dark:text-emerald-300">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">
              Jaminan Keamanan & Privasi Data Gaji Tanos:
            </p>
            <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Seluruh proses membaca, memetakan kamus komponen 150+ kolom, menghitung THP, dan membersihkan baris subtotal dilakukan secara <b>100% Client-Side di dalam memori laptop Anda</b>. File mentah Tanos Anda <b>tidak pernah dikirim ke server luar atau cloud pihak ketiga</b>.
            </p>
          </div>
        </div>

        {/* Step 1 & Step 2 Card */}
        {!resultSummary && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-6">
            {/* Step 1: Upload */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Pilih File Excel Mentah Tanos (.xlsx)
                </h2>
              </div>

              {!selectedFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/50 hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-800 group-hover:bg-indigo-100/80 dark:group-hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 transition-colors shadow-xs">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                    Klik untuk Memilih File atau Tarik (Drag & Drop) ke Sini
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                    Mendukung file export Tanos (<code>Payroll_Component_xxx.xlsx</code> hingga ribuan baris data).
                  </p>
                </div>
              ) : (
                <div className="bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Ukuran: {formatFileSize(selectedFile.size)} • Format: .xlsx Tanos
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Konfirmasi Format & Standar Normalisasi */}
            {selectedFile && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Standar Normalisasi & Otomatisasi Perapian
                  </h2>
                </div>

                {/* Checklist Kualitas Format */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Perlakuan Otomatis yang Diterapkan:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Pemetaan 195+ kamus komponen (Pendapatan, Potongan, Kontribusi)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Kalkulasi subtotal: Total Allowance, Total Deduction, THP, & Kontribusi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Otomatis menghapus baris <code>Total</code> / subtotal kosong bawaan Tanos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>NIP/Employee Number & No. Rekening dipaksa teks murni tanpa titik (<code>.</code>)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Format ribuan resmi (<code>#,##0</code>) pada kolom nominal keuangan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Lebar kolom otomatis disesuaikan agar teks tidak terpotong</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar jika sedang diproses */}
                {isProcessing && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        {progressMessage}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                      Mohon menunggu beberapa detik, sistem sedang memetakan ratusan kolom gaji.
                    </p>
                  </div>
                )}

                {/* Pesan Error */}
                {errorMsg && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gagal Memproses: </span>
                      {errorMsg}
                    </div>
                  </div>
                )}

                {/* Tombol Eksekusi Normalisasi */}
                <div className="pt-2">
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang Menyelaraskan Kolom Gaji ({progressPercent}%)...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        <span>Mulai Normalisasi Data Gaji Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Result Card Harmonis */}
        {resultSummary && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            {/* Header Success */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    Data Gaji Berhasil Dinormalisasi & Disortir Rapi!
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Sebanyak <strong>{resultSummary.validEmployeeRows.toLocaleString('id-ID')} baris data pegawai</strong> dan <strong>{resultSummary.totalColumns} kolom komponen</strong> berhasil diselaraskan.
                  </p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Normalisasi File Baru</span>
              </button>
            </div>

            {/* Metrics Grid 4-Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Pegawai Bersih
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
                  {resultSummary.validEmployeeRows.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">data pegawai valid</div>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Total Kolom
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1 font-mono">
                  {resultSummary.totalColumns} Kolom
                </div>
                <div className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">100% terpetakan</div>
              </div>

              <div className="bg-rose-50/50 dark:bg-rose-950/40 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/50">
                <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Baris Total Dihapus
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-200 mt-1 font-mono">
                  {resultSummary.filteredTotalRows.toLocaleString('id-ID')} Baris
                </div>
                <div className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5">subtotal kosong disaring</div>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Format Angka & Teks
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 font-mono">
                  100% Presisi
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">NIP teks, gaji #,##0</div>
              </div>
            </div>

            {/* Rincian Komponen Terpetakan */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Struktur Urutan Kolom Terbentuk:
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-[11px] font-bold">1. Identitas</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{resultSummary.identityCount} Kolom</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">NRP, Nama, Unit, Bank</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold">2. Allowance</span>
                  </div>
                  <p className="text-lg font-black text-emerald-900 dark:text-emerald-200">{resultSummary.allowanceCount} Kolom</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">+ Total Allowance</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-1">
                    <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-[11px] font-bold">3. Deduction</span>
                  </div>
                  <p className="text-lg font-black text-rose-900 dark:text-rose-200">{resultSummary.deductionCount} Kolom</p>
                  <p className="text-[10px] text-rose-700 dark:text-rose-400">+ Total Deduction</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 mb-1">
                    <Percent className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-[11px] font-bold">4. Contribution</span>
                  </div>
                  <p className="text-lg font-black text-sky-900 dark:text-sky-200">{resultSummary.contributionCount} Kolom</p>
                  <p className="text-[10px] text-sky-700 dark:text-sky-400">+ Total Kontribusi</p>
                </div>
              </div>
            </div>

            {/* Mini Preview 5 Baris Pegawai Teratas */}
            {previewRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Table className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Preview Hasil Normalisasi (5 Baris Pegawai Teratas):</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {showAllColumns
                        ? `Menampilkan seluruh ${previewHeaders.length} kolom`
                        : `Menampilkan ${previewDisplayHeaders.length} kolom ringkasan utama`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllColumns((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                    >
                      {showAllColumns ? 'Tampilan Ringkas' : 'Lihat Semua Kolom'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                  <div className="overflow-x-auto max-h-80 divide-y divide-slate-100 dark:divide-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-10">#</th>
                          {previewDisplayHeaders.map((col, i) => (
                            <th key={i} className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                              {col.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                        {previewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2.5 px-3 text-[11px] text-slate-400 font-mono font-bold text-center">
                              {rIdx + 1}
                            </td>
                            {previewDisplayHeaders.map((col, cIdx) => {
                              const rawVal = row[col.idx];
                              const colLower = col.name.toLowerCase();
                              const isMoney =
                                typeof rawVal === 'number' &&
                                (colLower.includes('total') ||
                                  colLower.includes('upah') ||
                                  colLower.includes('thp') ||
                                  colLower.includes('pay') ||
                                  colLower.includes('gaji') ||
                                  colLower.includes('tunjangan') ||
                                  colLower.includes('potongan') ||
                                  colLower.includes('contribution'));

                              return (
                                <td key={cIdx} className="py-2.5 px-3 whitespace-nowrap">
                                  {isMoney ? (
                                    <span
                                      className={
                                        colLower.includes('total allowance')
                                          ? 'font-bold text-emerald-700 dark:text-emerald-400'
                                          : colLower.includes('total deduction')
                                          ? 'font-bold text-rose-700 dark:text-rose-400'
                                          : colLower.includes('thp') || colLower.includes('take home pay')
                                          ? 'font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800'
                                          : colLower.includes('total contribution')
                                          ? 'font-bold text-sky-700 dark:text-sky-400'
                                          : 'font-semibold text-slate-700 dark:text-slate-300'
                                      }
                                    >
                                      {'Rp ' + rawVal.toLocaleString('id-ID')}
                                    </span>
                                  ) : (
                                    <span
                                      className={
                                        colLower === 'employee number'
                                          ? 'font-mono text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]'
                                          : colLower === 'employee'
                                          ? 'font-bold text-slate-900 dark:text-slate-100'
                                          : 'text-slate-600 dark:text-slate-300'
                                      }
                                    >
                                      {String(rawVal ?? '-')}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Main Download Card Harmonis */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Unduh File Excel Terstruktur Rapi (.xlsx)
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                    {selectedFile?.name.replace(/\.[^/.]+$/, '')}_Terstruktur_Rapi.xlsx
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Excel Sekarang</span>
              </button>
            </div>

            {/* Tips & Catatan */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Tips Penggunaan File Hasil:</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  File hasil normalisasi ini sudah 100% siap untuk dibuatkan <b>Pivot Table</b>, vlookup laporan per unit, maupun analisis komparasi gaji bulanan karena seluruh baris total kosong telah disaring dan urutan komponen pendapatan/potongan telah dipisahkan secara tegas.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
