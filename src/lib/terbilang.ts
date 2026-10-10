/**
 * Utility untuk konversi angka nominal ke kalimat terbilang Bahasa Indonesia
 * Mendukung angka hingga skala Triliun dengan kaidah ejaan resmi (EYD / Tata Naskah Dinas).
 */

const SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

export function angkaKeTerbilang(nilai: number | bigint | string): string {
  // Bersihkan karakter non-digit
  let angkaStr = '';
  if (typeof nilai === 'number' || typeof nilai === 'bigint') {
    angkaStr = nilai.toString();
  } else {
    angkaStr = nilai.replace(/[^0-9]/g, '');
  }

  if (!angkaStr || angkaStr === '0') {
    return 'Nol Rupiah';
  }

  // Buang leading zeros (contoh: 007 -> 7)
  angkaStr = angkaStr.replace(/^0+/, '');
  if (!angkaStr) return 'Nol Rupiah';

  let n: bigint;
  try {
    n = BigInt(angkaStr);
  } catch {
    return 'Format Angka Tidak Valid';
  }

  const B_0 = BigInt(0);
  const B_10 = BigInt(10);
  const B_12 = BigInt(12);
  const B_20 = BigInt(20);
  const B_100 = BigInt(100);
  const B_200 = BigInt(200);
  const B_1000 = BigInt(1000);
  const B_2000 = BigInt(2000);
  const B_1JT = BigInt(1000000);
  const B_1M = BigInt(1000000000);
  const B_1T = BigInt('1000000000000');
  const B_MAX = BigInt('1000000000000000');

  if (n === B_0) return 'Nol Rupiah';

  function terbilangBigInt(num: bigint): string {
    if (num < B_12) {
      return SATUAN[Number(num)];
    }
    if (num < B_20) {
      return `${terbilangBigInt(num - B_10)} Belas`;
    }
    if (num < B_100) {
      const sisa = num % B_10;
      return `${terbilangBigInt(num / B_10)} Puluh ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_200) {
      const sisa = num - B_100;
      return `Seratus ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_1000) {
      const sisa = num % B_100;
      return `${terbilangBigInt(num / B_100)} Ratus ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_2000) {
      const sisa = num - B_1000;
      return `Seribu ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_1JT) {
      const sisa = num % B_1000;
      return `${terbilangBigInt(num / B_1000)} Ribu ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_1M) {
      const sisa = num % B_1JT;
      return `${terbilangBigInt(num / B_1JT)} Juta ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_1T) {
      const sisa = num % B_1M;
      return `${terbilangBigInt(num / B_1M)} Miliar ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    if (num < B_MAX) {
      const sisa = num % B_1T;
      return `${terbilangBigInt(num / B_1T)} Triliun ${sisa > B_0 ? terbilangBigInt(sisa) : ''}`.trim();
    }
    return 'Nominal Terlalu Besar';
  }

  const hasilKata = terbilangBigInt(n);
  // Bersihkan spasi ganda jika ada
  return `${hasilKata.replace(/\s+/g, ' ').trim()} Rupiah`;
}

export type TerbilangCasing = 'TITLE' | 'UPPER' | 'LOWER' | 'SENTENCE';

export function formatTerbilang(terbilangText: string, casing: TerbilangCasing = 'TITLE'): string {
  if (!terbilangText) return '';

  switch (casing) {
    case 'UPPER':
      return terbilangText.toUpperCase();
    case 'LOWER':
      return terbilangText.toLowerCase();
    case 'SENTENCE': {
      const lower = terbilangText.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    case 'TITLE':
    default:
      // Standar kapitalisasi kata
      return terbilangText
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
  }
}
