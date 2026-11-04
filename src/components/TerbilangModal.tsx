'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  FileText,
  Calculator,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { angkaKeTerbilang, formatTerbilang, TerbilangCasing } from '@/lib/terbilang';
import { useToast } from '@/components/ToastProvider';

interface TerbilangModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TerbilangModal({ isOpen, onClose }: TerbilangModalProps) {
  const { toast } = useToast();
  const [rawValue, setRawValue] = useState('1450750200');
  const [casing, setCasing] = useState<TerbilangCasing>('TITLE');
  const [copiedType, setCopiedType] = useState<'KALIMAT' | 'NOTA_DINAS' | null>(null);

  // Kunci Scroll Layar Utama saat modal terbuka
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format rupiah tampilan input
  const cleanDigits = rawValue.replace(/[^0-9]/g, '');
  const formattedRupiah = cleanDigits
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(Number(cleanDigits))
    : 'Rp 0';

  // Hasil konversi terbilang murni
  const terbilangRaw = cleanDigits ? angkaKeTerbilang(cleanDigits) : '';
  const terbilangFormatted = formatTerbilang(terbilangRaw, casing);

  // Template formal nota dinas: Rp 1.450.750.200,- (Satu Miliar Empat Ratus Lima Puluh Juta Tujuh Ratus Lima Puluh Ribu Dua Ratus Rupiah)
  const templateNotaDinas = cleanDigits
    ? `Rp ${new Intl.NumberFormat('id-ID').format(Number(cleanDigits))},- (${terbilangFormatted})`
    : '';

  const handleCopy = (text: string, type: 'KALIMAT' | 'NOTA_DINAS') => {
    if (!text || typeof window === 'undefined') return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success(
      type === 'NOTA_DINAS'
        ? 'Format Nota Dinas resmi berhasil disalin!'
        : 'Teks terbilang berhasil disalin!'
    );
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  const handlePreset = (nominal: string) => {
    setRawValue(nominal);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Modal Harmonis */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Kalkulator Terbilang Nota Dinas
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Resmi ND
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konversi otomatis angka nominal ke ejaan resmi surat dinas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Input Nominal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Masukkan Nominal Angka (Rupiah):
              </label>
              {cleanDigits && (
                <button
                  type="button"
                  onClick={() => setRawValue('')}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                value={cleanDigits ? new Intl.NumberFormat('id-ID').format(Number(cleanDigits)) : ''}
                onChange={(e) => setRawValue(e.target.value)}
                placeholder="Contoh: 1.250.000.000"
                className="w-full rounded-2xl border-2 border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 px-4 py-3 text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-slate-100 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Format Rupiah:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">{formattedRupiah}</span>
            </div>
          </div>

          {/* Quick Presets Nominal Payroll */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Contoh Cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handlePreset('5750000')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                5.75 Juta
              </button>
              <button
                type="button"
                onClick={() => handlePreset('85400000')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                85.4 Juta
              </button>
              <button
                type="button"
                onClick={() => handlePreset('1450750200')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                1.45 Miliar
              </button>
              <button
                type="button"
                onClick={() => handlePreset('15200850000')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                15.2 Miliar
              </button>
            </div>
          </div>

          {/* Format Pilihan Gaya Huruf (Casing) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gaya Huruf Kalimat:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCasing('TITLE')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  casing === 'TITLE'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Title Case
                <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">Satu Juta Rupiah</span>
              </button>

              <button
                type="button"
                onClick={() => setCasing('UPPER')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  casing === 'UPPER'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                HURUF BESAR
                <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">SATU JUTA RUPIAH</span>
              </button>

              <button
                type="button"
                onClick={() => setCasing('SENTENCE')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  casing === 'SENTENCE'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Sentence case
                <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">Satu juta rupiah</span>
              </button>
            </div>
          </div>

          {/* HASIL 1: Kalimat Terbilang Saja */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Kalimat Terbilang:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(terbilangFormatted, 'KALIMAT')}
                disabled={!cleanDigits}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {copiedType === 'KALIMAT' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              {terbilangFormatted || 'Masukkan angka di atas'}
            </p>
          </div>

          {/* HASIL 2: Format Siap Pakai Nota Dinas (Angka + Terbilang) */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                Format Lengkap Nota Dinas:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(templateNotaDinas, 'NOTA_DINAS')}
                disabled={!cleanDigits}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {copiedType === 'NOTA_DINAS' ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Format ND</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 break-words">
              {templateNotaDinas || 'Rp 0,- (Nol Rupiah)'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
