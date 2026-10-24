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
