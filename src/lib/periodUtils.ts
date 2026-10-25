export const INDONESIAN_MONTHS = [
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
 * Menghasilkan periode bulan berikutnya dan tanggal cut-off otomatis.
 * Contoh: "Oktober 2026" & "2026-10-23" -> { nextPeriod: "November 2026", nextCutoff: "2026-11-23" }
 */
export function getNextPeriodSuggestion(
  currentPeriod: string,
  currentCutoff: string
): { nextPeriod: string; nextCutoff: string } {
  const parts = (currentPeriod || '').trim().split(' ');
  let monthIndex = -1;
  let year = new Date().getFullYear();

  if (parts.length >= 2) {
    const mName = parts[0];
    monthIndex = INDONESIAN_MONTHS.findIndex(
      (m) => m.toLowerCase() === mName.toLowerCase()
    );
    const parsedYear = parseInt(parts[1], 10);
    if (!isNaN(parsedYear)) year = parsedYear;
  }

  if (monthIndex === -1) {
    const now = new Date();
    monthIndex = now.getMonth();
    year = now.getFullYear();
  }

  // Bulan berikutnya
  let nextMonthIndex = monthIndex + 1;
  let nextYear = year;
  if (nextMonthIndex > 11) {
    nextMonthIndex = 0;
    nextYear += 1;
  }

  const nextPeriod = `${INDONESIAN_MONTHS[nextMonthIndex]} ${nextYear}`;

  // Pertahankan tanggal cut-off yang sama (contoh tanggal 23)
  let cutoffDay = 23;
  if (currentCutoff) {
    const day = parseInt(currentCutoff.split('-')[2], 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      cutoffDay = day;
    }
  }

  // Sesuaikan jika jumlah hari dalam bulan lebih sedikit (misal Februari)
  const maxDays = new Date(nextYear, nextMonthIndex + 1, 0).getDate();
  const validDay = Math.min(cutoffDay, maxDays);
  const mmStr = String(nextMonthIndex + 1).padStart(2, '0');
  const ddStr = String(validDay).padStart(2, '0');
  const nextCutoff = `${nextYear}-${mmStr}-${ddStr}`;

  return { nextPeriod, nextCutoff };
}

/**
 * Mengonversi format periode teks bebas (misal "Oktober 2026", "oktober 2026", "2026/10", "10-2026")
 * ke format standar ISO YYYY-MM (misal "2026-10") untuk tabel payroll_results.
 */
export function formatPeriodToIso(periodStr: string): string {
  if (!periodStr) return '';
  const clean = periodStr.trim();

  // Sudah format YYYY-MM
  if (/^\d{4}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Format YYYY/MM
  if (/^\d{4}\/\d{2}$/.test(clean)) {
    return clean.replace('/', '-');
  }

  // Format MM-YYYY atau MM/YYYY
  const mmyyyy = clean.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmyyyy) {
    const mm = mmyyyy[1].padStart(2, '0');
    return `${mmyyyy[2]}-${mm}`;
  }

  // Format NamaBulan Tahun (contoh: "Oktober 2026")
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const monthName = parts[0].toLowerCase();
    const yearStr = parts[1];
    const monthIdx = INDONESIAN_MONTHS.findIndex((m) =>
      m.toLowerCase().startsWith(monthName.slice(0, 3))
    );
    if (monthIdx !== -1 && /^\d{4}$/.test(yearStr)) {
      const mm = String(monthIdx + 1).padStart(2, '0');
      return `${yearStr}-${mm}`;
    }
  }

  // Format Tahun NamaBulan (contoh: "2026 Oktober")
  if (parts.length >= 2 && /^\d{4}$/.test(parts[0])) {
    const yearStr = parts[0];
    const monthName = parts[1].toLowerCase();
    const monthIdx = INDONESIAN_MONTHS.findIndex((m) =>
      m.toLowerCase().startsWith(monthName.slice(0, 3))
    );
    if (monthIdx !== -1) {
      const mm = String(monthIdx + 1).padStart(2, '0');
      return `${yearStr}-${mm}`;
    }
  }

  return clean;
}

/**
 * Mengonversi format ISO YYYY-MM (misal "2026-10") ke tampilan formal (misal "Oktober 2026")
 */
export function formatIsoToPeriod(isoPeriod: string): string {
  if (!isoPeriod) return '-';
  const parts = isoPeriod.trim().split('-');
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${INDONESIAN_MONTHS[monthIdx]} ${parts[0]}`;
    }
  }
  return isoPeriod;
}
