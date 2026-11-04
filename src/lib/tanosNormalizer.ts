import * as XLSX from 'xlsx';
import tanosDefaultDict from '../data/tanosDictionary.json';

export type ComponentCategory = 'identity' | 'allowance' | 'deduction' | 'contribution' | 'other' | 'summary';

export interface ColumnMappingInfo {
  originalHeader: string;
  cleanName: string;
  category: ComponentCategory;
  colIndex: number;
}

export interface NormalizerSummary {
  totalRows: number;
  validEmployeeRows: number;
  filteredTotalRows: number;
  totalColumns: number;
  identityCount: number;
  allowanceCount: number;
  deductionCount: number;
  contributionCount: number;
  otherCount: number;
  unknownHeaders: string[];
}

export const STANDARD_IDENTITY_HEADERS = [
  'bank',
  'account no',
  'account name',
  'employee number',
  'employee',
  'status',
  'job formation',
  'unit',
  'regional',
  'job class',
  'cost center',
  'doc. no',
  'ext. no',
  'payroll id',
];

/**
 * Menganalisis header file Excel mentah dari Tanos dan memetakan ke kategori masing-masing
 */
export function analyzeTanosHeaders(
  headers: string[],
  customDict?: Record<string, { name: string; type: string }>
): {
  mappings: ColumnMappingInfo[];
  summary: NormalizerSummary;
} {
  const dict = { ...tanosDefaultDict, ...(customDict || {}) };
  const mappings: ColumnMappingInfo[] = [];
  const unknownHeaders: string[] = [];

  let identityCount = 0;
  let allowanceCount = 0;
  let deductionCount = 0;
  let contributionCount = 0;
  let otherCount = 0;

  headers.forEach((h, colIndex) => {
    const clean = String(h || '').trim();
    if (!clean) return;
    const lower = clean.toLowerCase();

    // 1. Cek apakah kolom identitas
    if (STANDARD_IDENTITY_HEADERS.includes(lower)) {
      mappings.push({ originalHeader: h, cleanName: clean, category: 'identity', colIndex });
      identityCount++;
      return;
    }

    // 2. Cek apakah kolom sistem yang dilewati / total bawaan
    if (lower === 'total') {
      mappings.push({ originalHeader: h, cleanName: clean, category: 'summary', colIndex });
      return;
    }

    // 3. Cek di kamus komponen Tanos
    const match = (dict as Record<string, { name: string; type: string }>)[lower];
    if (match) {
      const cat = match.type as ComponentCategory;
      mappings.push({ originalHeader: h, cleanName: clean, category: cat, colIndex });
      if (cat === 'allowance') allowanceCount++;
      else if (cat === 'deduction') deductionCount++;
      else if (cat === 'contribution') contributionCount++;
      else otherCount++;
      return;
    }

    // 4. Fallback jika ada kata 'contribution' di nama header
    if (lower.includes('contribution')) {
      mappings.push({ originalHeader: h, cleanName: clean, category: 'contribution', colIndex });
      contributionCount++;
      return;
    }

    // 5. Belum terpetakan
    unknownHeaders.push(clean);
    mappings.push({ originalHeader: h, cleanName: clean, category: 'allowance', colIndex }); // Default aman ke allowance
  });

  return {
    mappings,
    summary: {
      totalRows: 0,
      validEmployeeRows: 0,
      filteredTotalRows: 0,
      totalColumns: headers.length,
      identityCount,
      allowanceCount,
      deductionCount,
      contributionCount,
      otherCount,
      unknownHeaders,
    },
  };
}

/**
 * Memproses dan menyusun ulang seluruh data mentah Excel Tanos menjadi struktur rapi
 */
export function normalizeTanosWorkbook(
  workbook: XLSX.WorkBook,
  customDict?: Record<string, { name: string; type: string }>
): {
  processedWorkbook: XLSX.WorkBook;
  summary: NormalizerSummary;
} {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawMatrix.length < 2) {
    throw new Error('File Excel tidak memiliki data yang valid.');
  }

  const rawHeaders: string[] = (rawMatrix[0] || []).map((h) => String(h || '').trim());
  const { mappings, summary } = analyzeTanosHeaders(rawHeaders, customDict);
  summary.totalRows = rawMatrix.length - 1;

  // Pisahkan mappings per kelompok urutan
  const identityCols = mappings.filter((m) => m.category === 'identity');
  const allowanceCols = mappings.filter((m) => m.category === 'allowance');
  const deductionCols = mappings.filter((m) => m.category === 'deduction');
  const contributionCols = mappings.filter((m) => m.category === 'contribution');
  const otherCols = mappings.filter((m) => m.category === 'other');

  // Header baru yang terstruktur
  const newHeaderRow: string[] = [];

  // 1. Identitas Pegawai
  identityCols.forEach((m) => newHeaderRow.push(m.cleanName));

  // 2. Allowance
  allowanceCols.forEach((m) => newHeaderRow.push(m.cleanName));
  newHeaderRow.push('Total Allowance'); // Sub-total

  // 3. Deduction
  deductionCols.forEach((m) => newHeaderRow.push(m.cleanName));
  newHeaderRow.push('Total Deduction'); // Sub-total

  // 4. Ringkasan THP
  newHeaderRow.push('Take Home Pay (THP)');

  // 5. Contribution
  contributionCols.forEach((m) => newHeaderRow.push(m.cleanName));
  newHeaderRow.push('Total Contribution'); // Sub-total

  // 6. Absensi & Data Lainnya
  otherCols.forEach((m) => newHeaderRow.push(m.cleanName));

  // Cari index Employee & Employee Number untuk validasi baris pegawai nyata
  const empNameCol = identityCols.find((c) => {
    const l = c.cleanName.toLowerCase();
    return l === 'employee' || l === 'nama' || l === 'nama pegawai';
  });
  const empNumCol = identityCols.find((c) => {
    const l = c.cleanName.toLowerCase();
    return l === 'employee number' || l === 'nik' || l === 'nip';
  });

  // Proses setiap baris data
  const outputRows: any[][] = [newHeaderRow];
  let validEmployeeRows = 0;
  let filteredTotalRows = 0;

  for (let r = 1; r < rawMatrix.length; r++) {
    const rawRow = rawMatrix[r] || [];
    if (rawRow.length === 0 || !rawRow.some((val) => val !== undefined && val !== null && String(val).trim() !== '')) {
      continue; // Lewati baris kosong total
    }

    // Periksa apakah baris ini adalah baris 'Total' bawaan Tanos (bukan data pegawai nyata)
    const empNameVal = empNameCol ? String(rawRow[empNameCol.colIndex] ?? '').trim() : '';
    const empNumVal = empNumCol ? String(rawRow[empNumCol.colIndex] ?? '').trim() : '';

    // Cek jika kolom identitas berisi tulisan 'Total' atau 'Grand Total' (misal di kolom Ext. No)
    const hasTotalInIdentity = identityCols.some((c) => {
      const val = String(rawRow[c.colIndex] ?? '').trim().toLowerCase();
      return val === 'total' || val === 'grand total';
    });

    const isTotalOrInvalidRow =
      (!empNameVal && !empNumVal) ||
      empNameVal.toLowerCase() === 'total' ||
      empNumVal.toLowerCase() === 'total' ||
      hasTotalInIdentity;

    if (isTotalOrInvalidRow) {
      filteredTotalRows++;
      continue; // Hapus / lewati baris total bawaan Tanos ini
    }

    validEmployeeRows++;
    const newRow: any[] = [];

    // Helper hitung angka
    const getNum = (idx: number): number => {
      const v = rawRow[idx];
      if (typeof v === 'number') return v;
      if (!v) return 0;
      const parsed = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    // 1. Identitas (Employee Number, Account No, dll. wajib teks murni agar tidak diberi titik ribuan)
    identityCols.forEach((m) => {
      const val = rawRow[m.colIndex];
      const lower = m.cleanName.toLowerCase();
      if (
        lower === 'employee number' ||
        lower === 'account no' ||
        lower === 'doc. no' ||
        lower === 'ext. no' ||
        lower === 'payroll id'
      ) {
        newRow.push(val !== undefined && val !== null ? String(val).trim() : '');
      } else {
        newRow.push(val ?? '');
      }
    });

    // 2. Allowance
    let sumAllowance = 0;
    allowanceCols.forEach((m) => {
      const val = getNum(m.colIndex);
      newRow.push(val);
      sumAllowance += val;
    });
    newRow.push(sumAllowance);

    // 3. Deduction
    let sumDeduction = 0;
    deductionCols.forEach((m) => {
      const val = getNum(m.colIndex);
      newRow.push(val);
      sumDeduction += val;
    });
    newRow.push(sumDeduction);

    // 4. THP
    const thp = sumAllowance - sumDeduction;
    newRow.push(thp);

    // 5. Contribution
    let sumContribution = 0;
    contributionCols.forEach((m) => {
      const val = getNum(m.colIndex);
      newRow.push(val);
      sumContribution += val;
    });
    newRow.push(sumContribution);

    // 6. Absensi / Data Lain
    otherCols.forEach((m) => {
      newRow.push(rawRow[m.colIndex] ?? '');
    });

    outputRows.push(newRow);
  }

  // Buat Sheet Baru
  const outSheet = XLSX.utils.aoa_to_sheet(outputRows);

  // Kumpulan index kolom identitas (tidak boleh ada format ribuan / titik)
  const identityColIndices = new Set<number>();
  identityCols.forEach((_, idx) => identityColIndices.add(idx));

  // Atur format tampilan cell
  for (const cellKey of Object.keys(outSheet)) {
    if (cellKey.startsWith('!')) continue;
    const cell = outSheet[cellKey];
    if (!cell) continue;

    const { c: colIdx, r: rowIdx } = XLSX.utils.decode_cell(cellKey);
    if (rowIdx === 0) continue; // Baris header lewati

    if (identityColIndices.has(colIdx)) {
      // Kolom identitas (NRP/Employee Number, Rekening, dll): pastikan string murni tanpa titik ribuan
      cell.t = 's';
      cell.v = String(cell.v ?? '');
      cell.z = '@';
    } else if (cell.t === 'n') {
      // Kolom nominal keuangan: berikan format ribuan #,##0
      cell.z = '#,##0';
    }
  }

  // Lebar kolom otomatis agar rapi
  const colWidths = newHeaderRow.map((name) => ({
    wch: Math.max(name.length + 3, 14),
  }));
  outSheet['!cols'] = colWidths;

  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outSheet, 'Payroll Terstruktur Tanos');

  summary.validEmployeeRows = validEmployeeRows;
  summary.filteredTotalRows = filteredTotalRows;

  return {
    processedWorkbook: outWb,
    summary,
  };
}
