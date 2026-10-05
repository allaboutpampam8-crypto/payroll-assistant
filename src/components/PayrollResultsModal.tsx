'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PayrollResult, PayrollComparison, PayrollPeriodSummary } from '@/lib/types';

interface PayrollResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPeriod: string;
}

export default function PayrollResultsModal({
  isOpen,
  onClose,
  defaultPeriod,
}: PayrollResultsModalProps) {
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'SEARCH' | 'SUMMARY'>('UPLOAD');

  // Upload States
  const [uploadPeriod, setUploadPeriod] = useState(defaultPeriod || '2026-10');
  const [parsedRows, setParsedRows] = useState<Omit<PayrollResult, 'id' | 'uploadedAt'>[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');

  // Search & Compare States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PayrollResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<PayrollResult | null>(null);
  const [comparison, setComparison] = useState<PayrollComparison | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Summary States
  const [summaryPeriod, setSummaryPeriod] = useState(defaultPeriod || '2026-10');
  const [summaryData, setSummaryData] = useState<PayrollPeriodSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // HANDLERS: FILE PARSING & BATCH UPLOAD
  // -------------------------------------------------------------

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessingFile(true);
    setUploadErrorMessage('');
    setUploadSuccessMessage('');
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawJson.length === 0) {
          setUploadErrorMessage('File spreadsheet kosong atau tidak berisi data.');
          setIsProcessingFile(false);
          return;
        }

        // Helper normalize keys & dynamic allowance/deduction extractor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Omit<PayrollResult, 'id' | 'uploadedAt'>[] = rawJson.map((row: any) => {
          // Clean keys from trailing/leading whitespace
          const cleanRow: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            cleanRow[key.trim()] = row[key];
          }

          const keys = Object.keys(cleanRow);
          const getVal = (possibleNames: string[]) => {
            const foundKey = keys.find((k) => {
              const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              return possibleNames.some((name) =>
                normalizedK === name.toLowerCase().replace(/[^a-z0-9]/g, '') ||
                normalizedK.includes(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
              );
            });
            return foundKey ? cleanRow[foundKey] : '';
          };

          const parseNum = (val: unknown) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const cleaned = String(val).replace(/[^0-9.-]+/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };

          const nik = String(getVal(['nrp', 'nik', 'nopeg', 'nip', 'pegawai_id']) || '').trim();
          const name = String(getVal(['employee', 'nama', 'name', 'nama_lengkap', 'pegawai']) || '').trim();
          const status = String(getVal(['status']) || '').trim();
          const dept = String(getVal(['cost center', 'costcenter', 'project', 'departemen', 'unit', 'divisi']) || '').trim();
          const pos = String(getVal(['job formation', 'jobformation', 'jabatan', 'position']) || '').trim();

          const basic = parseNum(getVal(['upah pokok', 'upahpokok', 'gaji pokok', 'gajipokok', 'gapok', 'pokok', 'basic']));
          const gross = parseNum(getVal(['jumlah kotor', 'jumlahkotor', 'gross', 'kotor']));
          const totalDeductCol = parseNum(getVal(['jumlah potongan', 'jumlahpotongan', 'total potongan', 'totalpotongan']));

          // Parse dynamic 92 allowances and deductions
          const allowanceDetails: Record<string, number> = {};
          const deductionDetails: Record<string, number> = {};
          let overtimeAmount = 0;
          let deductionsBpjs = 0;
          let deductionsTgr = 0;
          let deductionsOther = 0;

          const nonAllowanceCols = [
            'nrp', 'nik', 'employee', 'nama', 'status', 'job formation', 'cost center',
            'upah pokok', 'jumlah kotor', 'jumlah potongan', 'grand total', 'biaya pengelolaan',
            'management fee', 'total', 'thp', 'take home pay'
          ];

          for (const rawCol of keys) {
            const valNum = parseNum(cleanRow[rawCol]);
            const lowerCol = rawCol.toLowerCase();

            // Skip standard identity and summary columns
            if (nonAllowanceCols.some((sc) => lowerCol === sc || lowerCol.replace(/\s+/g, '') === sc.replace(/\s+/g, ''))) {
              continue;
            }

            // Company contributions / Management Fee (Don't put into personal employee earnings)
            if (lowerCol.includes('contribution') || lowerCol.includes('management fee') || lowerCol.includes('biaya pengelolaan')) {
              continue;
            }

            // Lembur / Overtime columns
            if (lowerCol.includes('lembur')) {
              if (valNum > 0) {
                overtimeAmount += valNum;
                allowanceDetails[rawCol] = valNum;
              }
              continue;
            }

            // Potongan / Deductions columns
            if (
              lowerCol.includes('potongan') ||
              lowerCol.includes('jaminan') ||
              lowerCol.includes('bpjs') ||
              lowerCol.includes('hutang') ||
              lowerCol.includes('iuran') ||
              lowerCol.includes('simpanan') ||
              lowerCol.includes('dplk')
            ) {
              if (valNum > 0) {
                deductionDetails[rawCol] = valNum;
                if (lowerCol.includes('jaminan') || lowerCol.includes('bpjs')) {
                  deductionsBpjs += valNum;
                } else if (lowerCol.includes('ganti rugi') || lowerCol.includes('tgr')) {
                  deductionsTgr += valNum;
                } else {
                  deductionsOther += valNum;
                }
              }
              continue;
            }

            // All other earnings (Tunjangan, Bantuan, Insentif, Premi, Extra Fooding, Rapel, dll.)
            if (valNum > 0) {
              allowanceDetails[rawCol] = valNum;
            }
          }

          // Total allowances is the sum of non-overtime items
          let totalAllowances = 0;
          for (const [k, v] of Object.entries(allowanceDetails)) {
            if (!k.toLowerCase().includes('lembur')) {
              totalAllowances += v;
            }
          }

          const sumDeductions = Object.values(deductionDetails).reduce((acc, curr) => acc + curr, 0);
          const totalDeductions = totalDeductCol > 0 ? totalDeductCol : sumDeductions;
          const grossSalary = gross > 0 ? gross : (basic + totalAllowances + overtimeAmount);
          const takeHomePay = grossSalary - totalDeductions;

          return {
            period: uploadPeriod.trim(),
            employeeNik: nik || 'NON-NRP',
            employeeName: name || 'Tanpa Nama',
            status,
            department: dept,
            positionTitle: pos,
            basicSalary: basic,
            allowances: totalAllowances,
            overtimeAmount,
            grossSalary,
            deductionsBpjs,
            deductionsTgr,
            deductionsOther,
            totalDeductions,
            takeHomePay,
            allowanceDetails,
            deductionDetails,
          };
        });

        // Filter invalid empty rows
        const validRows = mapped.filter((r) => r.employeeNik !== 'NON-NRP' || r.employeeName !== 'Tanpa Nama');
        setParsedRows(validRows);
      } catch (err: unknown) {
        console.error('File parsing error:', err);
        setUploadErrorMessage('Gagal membaca file spreadsheet. Pastikan format .xlsx atau .csv valid.');
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleStartBatchUpload = async () => {
    if (parsedRows.length === 0) return;

    setUploadErrorMessage('');
    setUploadSuccessMessage('');
    const BATCH_SIZE = 1000;
    const total = parsedRows.length;
    let saved = 0;

    setUploadProgress({ current: 0, total });

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = parsedRows.slice(i, i + BATCH_SIZE);
        const res = await fetch('/api/payroll-results/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: chunk }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Gagal menyimpan chunk data.');
        }

        saved += chunk.length;
        setUploadProgress({ current: saved, total });
      }

      setUploadSuccessMessage(
        `Sukses! Seluruh ${total.toLocaleString('id-ID')} data payroll periode ${uploadPeriod} berhasil disimpan ke database cloud.`
      );
      setParsedRows([]);
      setFileName('');
    } catch (err: unknown) {
      console.error('Batch upload error:', err);
      setUploadErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengunggah data ke database.'
      );
    } finally {
      setUploadProgress(null);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: SEARCH & COMPARE
  // -------------------------------------------------------------

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSelectedResult(null);
    setComparison(null);
    try {
      const isNik = /^\d+$/.test(searchQuery.trim());
      const param = isNik ? `nik=${encodeURIComponent(searchQuery.trim())}` : `name=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(`/api/payroll-results/query?${param}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(data.data || []);
        if (data.data?.length === 1) {
          handleSelectResult(data.data[0]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectResult = async (item: PayrollResult) => {
    setSelectedResult(item);
    setCompareLoading(true);
    try {
      const res = await fetch(`/api/payroll-results/compare?nik=${encodeURIComponent(item.employeeNik)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setComparison(data.comparison);
      } else {
        setComparison(null);
      }
    } catch (err) {
      console.error('Compare error:', err);
    } finally {
      setCompareLoading(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: SUMMARY
  // -------------------------------------------------------------

  const handleFetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/payroll-results/summary?period=${encodeURIComponent(summaryPeriod)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSummaryData(data.summary);
      } else {
        setSummaryData(null);
      }
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Pusat Data & Hasil Payroll Bulanan
              </h3>
              <p className="text-xs text-slate-500">
                Kelola hasil payroll 17.000+ pegawai, analisis komparasi gaji, dan data bot.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-5 sm:px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('UPLOAD')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'UPLOAD'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload File Excel</span>
          </button>
          <button
            onClick={() => setActiveTab('SEARCH')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'SEARCH'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Cari & Bandingkan Gaji</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('SUMMARY');
              handleFetchSummary();
            }}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'SUMMARY'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Rekapitulasi Makro</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: UPLOAD FILE EXCEL */}
          {/* ============================================================== */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-5">
              {/* Notifikasi Status */}
              {uploadSuccessMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{uploadSuccessMessage}</p>
                    <p className="text-[11px] text-emerald-700">
                      Sekarang Anda bisa langsung bertanya ke bot Telegram: ketik <code>/cek [nrp]</code> atau <code>/total</code>.
                    </p>
                  </div>
                </div>
              )}

              {uploadErrorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-medium">{uploadErrorMessage}</p>
                </div>
              )}

              {/* Form Input Periode & File */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Periode Gaji (YYYY-MM):
                  </label>
                  <input
                    type="text"
                    value={uploadPeriod}
                    onChange={(e) => setUploadPeriod(e.target.value)}
                    placeholder="Contoh: 2026-10"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Gunakan format YYYY-MM untuk memudahkan perbandingan antar bulan.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pilih File Excel / CSV Hasil Payroll:
                  </label>
                  <label className="flex items-center justify-between border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-2.5 px-4 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all">
                    <div className="flex items-center gap-2 truncate">
                      <FileSpreadsheet className="h-5 w-5 text-indigo-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-600 truncate">
                        {fileName || 'Klik untuk pilih file (.xlsx / .csv)...'}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                      Pilih File
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mendukung file hasil export sistem kantor hingga 20.000+ baris data.
                  </p>
                </div>
              </div>

              {/* Status Parsing File */}
              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  <span>Membaca dan memverifikasi kolom spreadsheet...</span>
                </div>
              )}

              {/* Preview Data & Tombol Eksekusi Upload */}
              {parsedRows.length > 0 && !uploadProgress && (
                <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        File Siap Diunggah: {parsedRows.length.toLocaleString('id-ID')} Data Pegawai Terdeteksi
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Periode: <strong className="text-indigo-600">{uploadPeriod}</strong> • Sistem akan melakukan batch upsert per 1.000 baris.
                      </p>
                    </div>

                    <button
                      onClick={handleStartBatchUpload}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Simpan ke Database Cloud</span>
                    </button>
                  </div>

                  {/* Preview 3 baris teratas */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-2">NRP</th>
                          <th className="p-2">Nama Pegawai</th>
                          <th className="p-2">Project</th>
                          <th className="p-2 text-right">Gaji Pokok</th>
                          <th className="p-2 text-right">Lembur</th>
                          <th className="p-2 text-right">Potongan</th>
                          <th className="p-2 text-right">THP (Gaji Bersih)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 3).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-semibold text-slate-700">{r.employeeNik}</td>
                            <td className="p-2 font-medium text-slate-900">{r.employeeName}</td>
                            <td className="p-2 text-slate-600">{r.department || '-'}</td>
                            <td className="p-2 text-right">{formatRupiah(r.basicSalary)}</td>
                            <td className="p-2 text-right">{formatRupiah(r.overtimeAmount)}</td>
                            <td className="p-2 text-right text-rose-600">-{formatRupiah(r.totalDeductions)}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">{formatRupiah(r.takeHomePay)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Menampilkan contoh 3 dari {parsedRows.length.toLocaleString('id-ID')} baris data.
                  </p>
                </div>
              )}

              {/* Progress Bar Sedang Berjalan */}
              {uploadProgress && (
                <div className="space-y-2 p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      Sedang Mengunggah ke Cloud Supabase...
                    </span>
                    <span>
                      {uploadProgress.current.toLocaleString('id-ID')} / {uploadProgress.total.toLocaleString('id-ID')} ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    Mohon tunggu beberapa detik, proses batching berjalan tanpa membebani server Vercel.
                  </p>
                </div>
              )}

              {/* Info Panduan Kolom */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  💡 Panduan Header Kolom Spreadsheet:
                </h5>
                <p className="text-[11px] leading-relaxed">
                  Sistem kami otomatis mengenali kolom-kolom standar berikut tanpa harus mengubah urutan:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>NRP / NIK</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>Nama Pegawai</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>Project / Unit</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>Gaji Pokok</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>Upah Lembur</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>Tunjangan</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>Total Potongan</strong>
                  </span>
                  <span className="p-1.5 bg-white rounded-lg border border-slate-200">
                    • <strong>THP / Gaji Bersih</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: CARI & BANDINGKAN GAJI */}
          {/* ============================================================== */}
          {activeTab === 'SEARCH' && (
            <div className="space-y-5">
              {/* Form Search */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik NRP atau Nama Pegawai (contoh: 98123 atau Budi)..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading || !searchQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Cari</span>
                </button>
              </form>

              {/* Hasil Pencarian List */}
              {searchResults.length > 1 && !selectedResult && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    Ditemukan {searchResults.length} pegawai. Pilih salah satu untuk melihat rincian:
                  </p>
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="p-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900">{item.employeeName}</p>
                          <p className="text-[11px] text-slate-500">
                            NRP: {item.employeeNik} • {item.department} • Periode: {item.period}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block">THP</span>
                            <span className="text-xs font-bold text-slate-900">{formatRupiah(item.takeHomePay)}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rincian Pegawai Terpilih & Komparasi Multi-Bulan */}
              {selectedResult && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Kartu Profil Pegawai */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          {selectedResult.employeeName}
                        </h4>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200">
                          NRP: {selectedResult.employeeNik}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {selectedResult.department} {selectedResult.positionTitle ? `• ${selectedResult.positionTitle}` : ''}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-indigo-700">Periode Aktif</span>
                      <p className="text-xs font-bold text-slate-900">{selectedResult.period}</p>
                    </div>
                  </div>

                  {/* Komparasi Multi-Bulan */}
                  {compareLoading ? (
                    <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      <span>Memuat histori perbandingan bulan sebelumnya...</span>
                    </div>
                  ) : comparison ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          ⚖️ Analisis Perbandingan: {comparison.previous ? `${comparison.previous.period} ➔ ${comparison.current.period}` : `Periode ${comparison.current.period}`}
                        </h5>
                        {comparison.previous && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              comparison.diff.takeHomePay > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : comparison.diff.takeHomePay < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {comparison.diff.takeHomePay > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : comparison.diff.takeHomePay < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            THP: {comparison.diff.takeHomePay >= 0 ? '+' : ''}{formatRupiah(comparison.diff.takeHomePay)}
                          </span>
                        )}
                      </div>

                      {/* Tabel Komponen Gaji */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] border-b border-slate-100">
                            <tr>
                              <th className="p-3">Komponen Payroll</th>
                              <th className="p-3 text-right">
                                {comparison.previous ? comparison.previous.period : 'Sebelumnya'}
                              </th>
                              <th className="p-3 text-right font-bold text-indigo-900">
                                {comparison.current.period} (Sekarang)
                              </th>
                              <th className="p-3 text-right font-semibold">Selisih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {/* Gaji Pokok */}
                            <tr>
                              <td className="p-3 font-medium text-slate-800">Gaji Pokok</td>
                              <td className="p-3 text-right text-slate-500">
                                {comparison.previous ? formatRupiah(comparison.previous.basicSalary) : '-'}
                              </td>
                              <td className="p-3 text-right font-semibold text-slate-900">
                                {formatRupiah(comparison.current.basicSalary)}
                              </td>
                              <td className="p-3 text-right">
                                {comparison.previous ? (
                                  <span className={comparison.diff.basicSalary !== 0 ? 'font-bold text-indigo-600' : 'text-slate-400'}>
                                    {comparison.diff.basicSalary >= 0 ? '+' : ''}{formatRupiah(comparison.diff.basicSalary)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>

                            {/* Tunjangan */}
                            <tr>
                              <td className="p-3 font-medium text-slate-800">Total Tunjangan</td>
                              <td className="p-3 text-right text-slate-500">
                                {comparison.previous ? formatRupiah(comparison.previous.allowances) : '-'}
                              </td>
                              <td className="p-3 text-right font-semibold text-slate-900">
                                {formatRupiah(comparison.current.allowances)}
                              </td>
                              <td className="p-3 text-right">
                                {comparison.previous ? (
                                  <span className={comparison.diff.allowances !== 0 ? 'font-bold text-indigo-600' : 'text-slate-400'}>
                                    {comparison.diff.allowances >= 0 ? '+' : ''}{formatRupiah(comparison.diff.allowances)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>

                            {/* Upah Lembur */}
                            <tr>
                              <td className="p-3 font-medium text-slate-800">Upah Lembur</td>
                              <td className="p-3 text-right text-slate-500">
                                {comparison.previous ? formatRupiah(comparison.previous.overtimeAmount) : '-'}
                              </td>
                              <td className="p-3 text-right font-semibold text-slate-900">
                                {formatRupiah(comparison.current.overtimeAmount)}
                              </td>
                              <td className="p-3 text-right">
                                {comparison.previous ? (
                                  <span className={comparison.diff.overtimeAmount > 0 ? 'font-bold text-emerald-600' : comparison.diff.overtimeAmount < 0 ? 'font-bold text-rose-600' : 'text-slate-400'}>
                                    {comparison.diff.overtimeAmount >= 0 ? '+' : ''}{formatRupiah(comparison.diff.overtimeAmount)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>

                            {/* Total Potongan */}
                            <tr>
                              <td className="p-3 font-medium text-rose-700">Total Potongan (BPJS/TGR/Lain)</td>
                              <td className="p-3 text-right text-slate-500">
                                {comparison.previous ? `-${formatRupiah(comparison.previous.totalDeductions)}` : '-'}
                              </td>
                              <td className="p-3 text-right font-semibold text-rose-700">
                                -{formatRupiah(comparison.current.totalDeductions)}
                              </td>
                              <td className="p-3 text-right">
                                {comparison.previous ? (
                                  <span className={comparison.diff.totalDeductions > 0 ? 'font-bold text-rose-600' : comparison.diff.totalDeductions < 0 ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                                    {comparison.diff.totalDeductions > 0 ? 'Naik ' : 'Turun '}
                                    {formatRupiah(Math.abs(comparison.diff.totalDeductions))}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>

                            {/* Take Home Pay */}
                            <tr className="bg-slate-50/80 font-bold">
                              <td className="p-3 text-slate-900">Take Home Pay (THP Bersih)</td>
                              <td className="p-3 text-right text-slate-600">
                                {comparison.previous ? formatRupiah(comparison.previous.takeHomePay) : '-'}
                              </td>
                              <td className="p-3 text-right text-indigo-700 text-sm">
                                {formatRupiah(comparison.current.takeHomePay)}
                              </td>
                              <td className="p-3 text-right">
                                {comparison.previous ? (
                                  <span className={comparison.diff.takeHomePay > 0 ? 'text-emerald-700' : comparison.diff.takeHomePay < 0 ? 'text-rose-700' : 'text-slate-500'}>
                                    {comparison.diff.takeHomePay >= 0 ? '+' : ''}{formatRupiah(comparison.diff.takeHomePay)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Rincian Komponen Tunjangan Terinci (92 Jenis) */}
                      {selectedResult.allowanceDetails && Object.keys(selectedResult.allowanceDetails).length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                          <h6 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            🎁 Rincian Komponen Tunjangan yang Diterima ({Object.keys(selectedResult.allowanceDetails).length} jenis)
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(selectedResult.allowanceDetails).map(([name, val]) => {
                              const diffInfo = comparison?.diff?.allowanceDiffs?.[name];
                              return (
                                <div
                                  key={name}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                                >
                                  <span className="font-medium text-slate-700 truncate pr-2" title={name}>
                                    {name}
                                  </span>
                                  <div className="text-right shrink-0">
                                    <span className="font-bold text-slate-900">{formatRupiah(val)}</span>
                                    {diffInfo && diffInfo.diff !== 0 && (
                                      <span
                                        className={`ml-1.5 text-[10px] font-bold ${
                                          diffInfo.diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                      >
                                        {diffInfo.diff > 0 ? '+' : ''}{formatRupiah(diffInfo.diff)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Rincian Komponen Potongan Terinci */}
                      {selectedResult.deductionDetails && Object.keys(selectedResult.deductionDetails).length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                          <h6 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                            ✂️ Rincian Komponen Potongan ({Object.keys(selectedResult.deductionDetails).length} jenis)
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(selectedResult.deductionDetails).map(([name, val]) => {
                              const diffInfo = comparison?.diff?.deductionDiffs?.[name];
                              return (
                                <div
                                  key={name}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100"
                                >
                                  <span className="font-medium text-slate-700 truncate pr-2" title={name}>
                                    {name}
                                  </span>
                                  <div className="text-right shrink-0">
                                    <span className="font-bold text-rose-700">-{formatRupiah(val)}</span>
                                    {diffInfo && diffInfo.diff !== 0 && (
                                      <span
                                        className={`ml-1.5 text-[10px] font-bold ${
                                          diffInfo.diff > 0 ? 'text-rose-600' : 'text-emerald-600'
                                        }`}
                                      >
                                        {diffInfo.diff > 0 ? 'Naik ' : 'Turun '}{formatRupiah(Math.abs(diffInfo.diff))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: REKAPITULASI MAKRO */}
          {/* ============================================================== */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={summaryPeriod}
                  onChange={(e) => setSummaryPeriod(e.target.value)}
                  placeholder="Ketik Periode (misal: 2026-10)..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-600"
                />
                <button
                  onClick={handleFetchSummary}
                  disabled={summaryLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  <span>Tampilkan Rekap</span>
                </button>
              </div>

              {summaryLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span>Memuat rekapitulasi data...</span>
                </div>
              ) : summaryData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Pegawai Dibayar</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">
                      {summaryData.totalEmployees.toLocaleString('id-ID')} orang
                    </h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-600">Total Take Home Pay (THP)</span>
                    <h4 className="text-xl font-bold text-indigo-900 mt-1">
                      {formatRupiah(summaryData.totalTakeHomePay)}
                    </h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Upah Lembur</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">
                      {formatRupiah(summaryData.totalOvertime)}
                    </h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Gaji Pokok</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">
                      {formatRupiah(summaryData.totalBasicSalary)}
                    </h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Total Tunjangan</span>
                    <h4 className="text-xl font-bold text-slate-900 mt-1">
                      {formatRupiah(summaryData.totalAllowances)}
                    </h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-600">Total Seluruh Potongan</span>
                    <h4 className="text-xl font-bold text-rose-900 mt-1">
                      {formatRupiah(summaryData.totalDeductions)}
                    </h4>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl text-xs">
                  Belum ada data payroll yang diunggah untuk periode {summaryPeriod}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
