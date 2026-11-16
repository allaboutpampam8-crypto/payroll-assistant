import { OvertimeChecklistItem } from './types';

const INDONESIAN_DAYS_UPPER = [
  'MINGGU',
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
];

const INDONESIAN_MONTHS_UPPER = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
];

const INDONESIAN_MONTHS_TITLE = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format YYYY-MM-DD ke "KAMIS, 15 OKTOBER 2026"
 */
export function formatOvertimeDayDateUpper(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr.toUpperCase();
  const [year, month, day] = parts;
  const dt = new Date(year, month - 1, day);
  const dayName = INDONESIAN_DAYS_UPPER[dt.getDay()] || '';
  const monthName = INDONESIAN_MONTHS_UPPER[month - 1] || '';
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format YYYY-MM-DD ke "12 November 2026" (untuk tanggal tanda tangan)
 */
export function formatIndonesianDateTitle(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const monthName = INDONESIAN_MONTHS_TITLE[month - 1] || '';
  return `${day} ${monthName} ${year}`;
}

/**
 * Format YYYY-MM ke "BULAN OKTOBER 2026"
 */
export function formatPeriodUpperTitle(period: string): string {
  if (!period || !period.includes('-')) return period.toUpperCase();
  const [yearStr, monthStr] = period.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = INDONESIAN_MONTHS_UPPER[monthIdx] || monthStr;
  return `BULAN ${monthName} ${yearStr}`;
}

/**
 * Format YYYY-MM ke "Oktober 2026"
 */
export function formatPeriodTitle(period: string): string {
  if (!period || !period.includes('-')) return period;
  const [yearStr, monthStr] = period.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = INDONESIAN_MONTHS_TITLE[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

/**
 * Format menit ke format surat lembur: "4 JAM" atau "3 JAM 55 MENIT" atau "45 MENIT"
 */
export function formatOvertimeDurationUpper(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours > 0 && remMins > 0) return `${hours} JAM ${remMins} MENIT`;
  if (hours > 0) return `${hours} JAM`;
  return `${remMins} MENIT`;
}

/**
 * Format jam dengan pemisah titik "17.21"
 */
export function formatTimeDot(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}.${mm}`;
}

/**
 * Mengurangi waktu HH.mm dengan sejumlah menit.
 * Contoh: subtractMinutesFromTimeDot("15.00", 30) -> "14.30"
 * Mendukung lewat tengah malam jika diperlukan.
 */
export function subtractMinutesFromTimeDot(
  timeDot: string,
  minutesToSubtract: number
): string {
  if (!timeDot || !minutesToSubtract || minutesToSubtract <= 0) return timeDot;
  const normalized = timeDot.trim().replace(':', '.');
  const parts = normalized.split('.');
  if (parts.length !== 2) return timeDot;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeDot;

  let totalMinutes = h * 60 + m - Math.round(minutesToSubtract);
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}.${String(newM).padStart(2, '0')}`;
}

/**
 * Normalisasi format jam ke "HH.mm" dua digit (contoh "9.00" -> "09.00")
 */
export function normalizeTimeDot(str: string): string {
  if (!str) return '00.00';
  const clean = str.trim().replace(':', '.');
  const parts = clean.split('.');
  if (parts.length === 2 && /^\d{1,2}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}.${mm}`;
  }
  return clean;
}

/**
 * Hitung selisih menit bersih antara startTime (HH.mm / HH:mm) dan endTime (HH.mm / HH:mm)
 * dikurangi pauseMinutes. Mendukung lewat tengah malam.
 */
export function computeDurationMinutes(
  startTime: string,
  endTime: string,
  pauseMinutes = 0
): number {
  const parseHM = (str: string): number | null => {
    if (!str) return null;
    const normalized = str.trim().replace(':', '.');
    const parts = normalized.split('.');
    if (parts.length !== 2) return null;
    if (!/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  };

  const s = parseHM(startTime);
  const e = parseHM(endTime);
  if (s === null || e === null) return 0;

  let diff = e - s;
  if (diff < 0) {
    diff += 24 * 60; // lewat tengah malam
  }
  return Math.max(0, diff - Math.max(0, pauseMinutes));
}

/**
 * Format detik ke HH:MM:SS untuk live timer
 */
export function formatStopwatchSeconds(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Preset siklus kerja lembur outsourcing payroll
 */
export interface OvertimePreset {
  id: string;
  label: string;
  jobTemplate: (monthTitle: string) => string;
  targetTemplate: (monthTitle: string) => string;
  checklist: OvertimeChecklistItem[];
}

export const OVERTIME_PRESETS: OvertimePreset[] = [
  {
    id: 'posting_absensi_pegawai',
    label: 'Posting Absensi & Pergerakan Pegawai',
    jobTemplate: (m) =>
      `Melakukan pengecekan pergerakan pegawai dan posting absensi periode bulan ${m}`,
    targetTemplate: (m) =>
      `Absensi dan pergerakan pegawai bulan ${m} untuk TAD maupun pemborongan dapat diposting`,
    checklist: [
      { id: 'c1', label: 'Cek mutasi / pergerakan pegawai antar project & entitas', done: false },
      { id: 'c2', label: 'Validasi kehadiran, shift, dan data lembur pegawai', done: false },
      { id: 'c3', label: 'Posting absensi dan data kepegawaian ke sistem', done: false },
    ],
  },
  {
    id: 'kalkulasi_gaji',
    label: 'Kalkulasi & Verifikasi Kesesuaian Gaji',
    jobTemplate: (m) =>
      `Melakukan kalkulasi gaji periode bulan ${m}`,
    targetTemplate: (m) =>
      `Kalkulasi gaji bulan ${m} untuk TAD maupun pemborongan dapat di-generate`,
    checklist: [
      { id: 'c1', label: 'Cek kesesuaian upah pokok, tunjangan, & potongan BPJS/TGR', done: false },
      { id: 'c2', label: 'Rekonsiliasi pegawai baru masuk / resign / pindah project', done: false },
      { id: 'c3', label: 'Jalankan kalkulasi dan review anomali nominal gaji', done: false },
    ],
  },
  {
    id: 'simulasi_tanos',
    label: 'Simulasi, Generate & Posting Tanos',
    jobTemplate: (m) =>
      `Melakukan simulasi, generate dan posting gaji periode bulan ${m} pada Tanos`,
    targetTemplate: (m) =>
      `Gaji bulan ${m} untuk TAD maupun Pemborongan dapat diposting di Tanos`,
    checklist: [
      { id: 'c1', label: 'Normalisasi kolom & simulasi perhitungan pada Tanos', done: false },
      { id: 'c2', label: 'Verifikasi total bruto, potongan, dan THP seluruh unit', done: false },
      { id: 'c3', label: 'Generate & posting final gaji pada Tanos', done: false },
    ],
  },
  {
    id: 'custom_tiket',
    label: 'Penanganan Tiket / Koreksi Khusus',
    jobTemplate: (m) =>
      `Melakukan crosscheck laporan kendala dan penyesuaian data gaji bulan ${m}`,
    targetTemplate: (m) =>
      `Seluruh kendala & penyesuaian gaji periode ${m} terselesaikan tepat waktu`,
    checklist: [
      { id: 'c1', label: 'Verifikasi bukti lampiran & riwayat gaji sebelumnya', done: false },
      { id: 'c2', label: 'Hitung selisih kekurangan / koreksi gaji', done: false },
      { id: 'c3', label: 'Update status tiket & dokumentasikan hasil penyelesaian', done: false },
    ],
  },
];
