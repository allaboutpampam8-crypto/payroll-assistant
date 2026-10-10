'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Scissors,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  FileArchive,
  ChevronDown,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { splitExcelFile, SplitResult } from '@/lib/excelSplitter';
import PinLockScreen from '@/components/PinLockScreen';

export default function ExcelSplitterPage() {
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
  const [chunkSize, setChunkSize] = useState<number>(1000);
  const [filePrefix, setFilePrefix] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const [result, setResult] = useState<SplitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErrorMsg('Format file harus berupa Excel (.xlsx atau .xls).');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setResult(null);
      // Default prefix dari nama file
      const base = file.name.replace(/\.[^/.]+$/, '');
      setFilePrefix(base);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setErrorMsg('Format file harus berupa Excel (.xlsx atau .xls).');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setResult(null);
      const base = file.name.replace(/\.[^/.]+$/, '');
      setFilePrefix(base);
    }
  };

  const handleStartSplit = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);
    setProgressPercent(5);
    setProgressStage('reading');
    setProgressMessage('Membaca file master Excel...');

    try {
      const splitRes = await splitExcelFile(selectedFile, {
        chunkSize: Number(chunkSize) || 1000,
        filePrefix: filePrefix.trim() || undefined,
        onProgress: (p) => {
          setProgressStage(p.stage);
          setProgressPercent(p.percent);
          setProgressMessage(p.message);
        },
      });

      setResult(splitRes);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Gagal memecah file Excel:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses file Excel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSinglePart = (part: SplitResult['parts'][0]) => {
    const url = URL.createObjectURL(part.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = part.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMsg(null);
    setProgressPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!isAuthenticated) {
    return (
      <PinLockScreen
        onSuccess={() => setIsAuthenticated(true)}
        assistantName="Pemecah Excel HRIS"
        companyName="PT Pelindo Daya Sejahtera"
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Asisten</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Offline & Privat di Laptop
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Title Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
                <Scissors className="w-3.5 h-3.5" />
                Tools Internal Payroll HRIS
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Pemecah File Excel Payroll (Batch Splitter)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Bagi file master payroll (hingga 100.000+ baris) menjadi file kecil per 1.000 baris secara otomatis, aman, dan tanpa mengubah format kolom sedikit pun (tanggal <code className="text-sky-300">dd/mm/yyyy</code>, teks NIK/rekening, dan angka tetap 100% utuh).
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-white/20 p-1 flex items-center justify-center">
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
                <div className="text-[11px] text-sky-200">Presisi & Anti Gagal Upload</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Assurance Banner */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-emerald-800">
              Jaminan Keamanan & Privasi Data Gaji:
            </p>
            <p className="text-emerald-700 leading-relaxed">
              Seluruh proses membaca, memotong baris data, dan mengompresi ke file ZIP dilakukan secara <b>100% Client-Side di dalam memori laptop Pak Pampam</b>. File Excel master Anda <b>tidak pernah dikirim ke internet, cloud, atau server pihak ketiga mana pun</b>.
            </p>
          </div>
        </div>

        {/* Step 1 & Step 2 Card */}
        {!result && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            {/* Step 1: Upload */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-800">
                  Pilih File Master Excel (.xlsx)
                </h2>
              </div>

              {!selectedFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/30 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100/80 text-indigo-600 mx-auto flex items-center justify-center mb-4 transition-colors shadow-xs">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Klik untuk Memilih File atau Tarik (Drag & Drop) ke Sini
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                    Mendukung file Excel master penggajian (hingga 100.000+ baris data, format <code>.xlsx</code>).
                  </p>
                </div>
              ) : (
                <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ukuran: {formatFileSize(selectedFile.size)} • Format: .xlsx
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Settings */}
            {selectedFile && (
              <div className="border-t border-slate-100 pt-6 space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-base font-bold text-slate-800">
                    Pengaturan Pemecahan
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Chunk Size Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Jumlah Baris Data per File
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={100}
                        max={50000}
                        step={100}
                        value={chunkSize}
                        onChange={(e) => setChunkSize(Math.max(1, Number(e.target.value)))}
                        disabled={isProcessing}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                        baris / file
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Pilihan Cepat:</span>
                      {[500, 1000, 2000, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setChunkSize(val)}
                          disabled={isProcessing}
                          className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                            chunkSize === val
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Prefix Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Awalan Nama File Hasil (Prefix)
                    </label>
                    <input
                      type="text"
                      value={filePrefix}
                      onChange={(e) => setFilePrefix(e.target.value)}
                      disabled={isProcessing}
                      placeholder="Contoh: HRIS_Payroll_Oktober"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Contoh nama file: <code>{filePrefix || 'Master'}_Part_001_Row_1-1000.xlsx</code>
                    </p>
                  </div>
                </div>

                {/* Format Guarantee Checklist */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Kualitas Format Kolom yang Dijamin:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Baris Header (Baris 1) disalin di setiap part</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Format Tanggal (<code>dd/mm/yyyy</code>) tidak berubah</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>NIK & No. Rekening diawali 0 tidak hilang</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Lebar kolom tabel tetap rapi sesuai file asli</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar if processing */}
                {isProcessing && (
                  <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                        {progressMessage}
                      </span>
                      <span className="text-indigo-600 font-mono">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      Mohon jangan menutup halaman ini selama proses pemecahan berlangsung.
                    </p>
                  </div>
                )}

                {/* Error Box */}
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gagal Memproses: </span>
                      {errorMsg}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleStartSplit}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang Memecah File Excel ({progressPercent}%)...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        <span>Mulai Pecah File Excel Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Result Card */}
        {result && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            {/* Header Success */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    File Berhasil Dipecah Menjadi {result.totalChunks} Part!
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diproses dalam {(result.durationMs / 1000).toFixed(1)} detik • Seluruh format kolom 100% identik
                  </p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pecah File Baru</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Baris Data
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
                  {result.totalRows.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">di luar header baris 1</div>
              </div>

              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
                <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                  Jumlah File Part
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-900 mt-1 font-mono">
                  {result.totalChunks} File
                </div>
                <div className="text-[10px] text-indigo-500 mt-0.5">format .xlsx murni</div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Ukuran Tiap Part
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
                  {result.chunkSize.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">baris data per file</div>
              </div>

              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Ukuran File ZIP
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 font-mono">
                  {formatFileSize(result.zipBlob.size)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">kompresi optimal</div>
              </div>
            </div>

            {/* Main ZIP Download Button */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FileArchive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Download Seluruh File ({result.totalChunks} Part) dalam 1 ZIP
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                    {result.zipFileName} ({formatFileSize(result.zipBlob.size)})
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadZip}
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File .ZIP Sekarang</span>
              </button>
            </div>

            {/* List of Individual Parts */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Daftar Rincian File Pecahan ({result.parts.length} File):
                </h4>
                <span className="text-[11px] text-slate-400">
                  Bisa diunduh satu per satu jika diperlukan
                </span>
              </div>

              <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                {result.parts.map((p) => (
                  <div
                    key={p.index}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                        #{p.index}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate font-mono">
                          {p.fileName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Baris {p.startRow.toLocaleString('id-ID')} s/d {p.endRow.toLocaleString('id-ID')} ({p.rowCount.toLocaleString('id-ID')} baris data)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadSinglePart(p)}
                      title={`Unduh part ${p.index}`}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
