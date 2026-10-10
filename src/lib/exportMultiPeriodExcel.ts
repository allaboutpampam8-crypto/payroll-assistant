import * as XLSX from 'xlsx';
import { PayrollResult } from './types';

/**
 * Menghasilkan file Buffer Excel multi-sheet per periode
 * @param periodsData Record dengan key periode (contoh "2026-05") dan value array PayrollResult
 */
export function generateMultiPeriodExcelBuffer(
  periodsData: Record<string, PayrollResult[]>
): Buffer {
  const workbook = XLSX.utils.book_new();
  const sortedPeriods = Object.keys(periodsData).sort();

  // 1. SHEET RINGKASAN MAKRO (Di sheet pertama)
  const summaryHeaders = [
    'No.',
    'Periode Penggajian',
    'Jumlah Pegawai',
    'Total Upah Pokok',
    'Total Tunjangan',
    'Total Upah Lembur',
    'Total Potongan',
    'Total Take Home Pay (THP)',
  ];

  const summaryRows: (string | number)[][] = [
    ['PT PELINDO DAYA SEJAHTERA'],
    ['RINGKASAN REKAPITULASI PENGGAJIAN MULTI-PERIODE'],
    [
      `Rentang Periode: ${sortedPeriods[0] || '-'} s/d ${
        sortedPeriods[sortedPeriods.length - 1] || '-'
      } (${sortedPeriods.length} Bulan)`,
    ],
    [],
    summaryHeaders,
  ];

  sortedPeriods.forEach((period, idx) => {
    const list = periodsData[period] || [];
    const count = list.length;
    const totBasic = list.reduce((acc, r) => acc + (r.basicSalary || 0), 0);
    const totAllow = list.reduce((acc, r) => acc + (r.allowances || 0), 0);
    const totOt = list.reduce((acc, r) => acc + (r.overtimeAmount || 0), 0);
    const totDeduct = list.reduce((acc, r) => acc + (r.totalDeductions || 0), 0);
    const totThp = list.reduce((acc, r) => acc + (r.takeHomePay || 0), 0);

    summaryRows.push([
      idx + 1,
      `Periode ${period}`,
      count,
      totBasic,
      totAllow,
      totOt,
      totDeduct,
      totThp,
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  // Format angka ribuan
  for (const cellKey of Object.keys(summarySheet)) {
    if (cellKey.startsWith('!')) continue;
    const cell = summarySheet[cellKey];
    if (cell && cell.t === 'n') {
      cell.z = '#,##0';
    }
  }

  summarySheet['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 26 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'RINGKASAN');

  // 2. SHEET MASING-MASING PERIODE
  sortedPeriods.forEach((period) => {
    const list = periodsData[period] || [];

    // 1. Ekstrak seluruh komponen tunjangan & potongan yang ada di periode ini
    const allowanceKeysSet = new Set<string>();
    const deductionKeysSet = new Set<string>();

    list.forEach((r) => {
      if (r.allowanceDetails && typeof r.allowanceDetails === 'object') {
        for (const k of Object.keys(r.allowanceDetails)) {
          if (k && k.trim()) allowanceKeysSet.add(k.trim());
        }
      }
      if (r.deductionDetails && typeof r.deductionDetails === 'object') {
        for (const k of Object.keys(r.deductionDetails)) {
          if (k && k.trim()) deductionKeysSet.add(k.trim());
        }
      }
    });

    // Urutkan nama kolom komponen agar rapi dan konsisten
    const allowanceKeys = Array.from(allowanceKeysSet).sort();
    const deductionKeys = Array.from(deductionKeysSet).sort();

    // 2. Susun Header Lengkap Sesuai File Upload
    const headers = [
      'No.',
      'Periode',
      'NRP / NIK',
      'Nama Pegawai',
      'Status',
      'Cost Center / Project',
      'Job Formation / Jabatan',
      'Upah Pokok',
      'Upah Lembur',
      ...allowanceKeys,
      'Total Tunjangan',
      'Jumlah Kotor (Gross)',
      ...deductionKeys,
      'Total Potongan',
      'Take Home Pay (THP)',
    ];

    const dataRows: (string | number)[][] = [headers];

    list.forEach((r, idx) => {
      const gross =
        r.grossSalary ||
        (r.basicSalary || 0) + (r.allowances || 0) + (r.overtimeAmount || 0);

      // Ambil nilai per komponen detail
      const allowanceValues = allowanceKeys.map(
        (key) => Number(r.allowanceDetails?.[key]) || 0
      );
      const deductionValues = deductionKeys.map(
        (key) => Number(r.deductionDetails?.[key]) || 0
      );

      dataRows.push([
        idx + 1,
        r.period,
        r.employeeNik,
        r.employeeName,
        r.status || '-',
        r.department || '-',
        r.positionTitle || '-',
        r.basicSalary || 0,
        r.overtimeAmount || 0,
        ...allowanceValues,
        r.allowances || 0,
        gross,
        ...deductionValues,
        r.totalDeductions || 0,
        r.takeHomePay || 0,
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(dataRows);

    // Format seluruh angka dengan separator #,##0
    for (const cellKey of Object.keys(sheet)) {
      if (cellKey.startsWith('!')) continue;
      const cell = sheet[cellKey];
      if (cell && cell.t === 'n') {
        cell.z = '#,##0';
      }
    }

    // Atur lebar kolom: kolom dasar + kolom dinamis tunjangan + kolom dinamis potongan
    const colsConfig = [
      { wch: 6 },  // No
      { wch: 12 }, // Periode
      { wch: 16 }, // NRP
      { wch: 30 }, // Nama Pegawai
      { wch: 14 }, // Status
      { wch: 32 }, // Project
      { wch: 28 }, // Jabatan
      { wch: 18 }, // Gaji Pokok
      { wch: 16 }, // Lembur
      ...allowanceKeys.map((k) => ({ wch: Math.max(k.length + 4, 16) })),
      { wch: 18 }, // Total Tunjangan
      { wch: 20 }, // Gross
      ...deductionKeys.map((k) => ({ wch: Math.max(k.length + 4, 16) })),
      { wch: 18 }, // Tot Potongan
      { wch: 20 }, // THP
    ];
    sheet['!cols'] = colsConfig;

    // Nama Sheet maksimal 31 karakter di Excel
    const sheetName = `Periode ${period}`;
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName.substring(0, 31));
  });

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
