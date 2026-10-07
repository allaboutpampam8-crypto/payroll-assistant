import * as XLSX from 'xlsx';
import { EmployeeCumulativePayrollSummary } from './types';

/**
 * Menghasilkan file Buffer Excel matriks rekapitulasi gaji per komponen per bulan
 */
export function generateEmployeeYtdExcelBuffer(
  summary: EmployeeCumulativePayrollSummary
): Buffer {
  const periods = summary.periods;
  const numMonths = summary.totalMonths;

  // Header tabel kolom
  const headers = [
    'Komponen Penggajian',
    ...periods.map((p) => `Periode ${p}`),
    'TOTAL KUMULATIF',
    'RATA-RATA / BULAN',
  ];

  const dataRows: (string | number)[][] = [];

  // Judul Dokumen
  dataRows.push(['PT PELINDO DAYA SEJAHTERA']);
  dataRows.push([
    `REKAPITULASI PENGGAJIAN KUMULATIF (${periods[0] || ''} s/d ${
      periods[periods.length - 1] || ''
    })`,
  ]);
  dataRows.push([
    `Nama: ${summary.employeeName} | NRP: ${summary.employeeNik} | Project: ${
      summary.department
    } | Jabatan: ${summary.positionTitle || '-'}`,
  ]);
  dataRows.push([]); // Baris kosong pemisah
  dataRows.push(headers);

  const formatAvg = (total: number) => Math.round(total / (numMonths || 1));

  // Helper untuk mencari nilai komponen bulanan
  const getMonthlyVal = (
    accessor: (m: (typeof summary.monthlyBreakdown)[0]) => number
  ) => {
    return periods.map((p) => {
      const found = summary.monthlyBreakdown.find((m) => m.period === p);
      return found ? accessor(found) : 0;
    });
  };

  // --- A. PENDAPATAN ---
  dataRows.push(['A. PENDAPATAN', ...periods.map(() => ''), '', '']);

  // 1. Gaji Pokok
  const monthlyBasic = getMonthlyVal((m) => m.basicSalary);
  dataRows.push([
    '  • Upah Pokok',
    ...monthlyBasic,
    summary.totalBasicSalary,
    formatAvg(summary.totalBasicSalary),
  ]);

  // 2. Tunjangan (Upah Lembur dimasukkan ke kategori Tunjangan)
  dataRows.push([
    '  • TUNJANGAN (Termasuk Upah Lembur):',
    ...periods.map(() => ''),
    '',
    '',
  ]);

  // Upah Lembur sebagai item pertama tunjangan
  const monthlyOvertime = getMonthlyVal((m) => m.overtime);
  dataRows.push([
    '     ├─ Upah Lembur (Bulanan)',
    ...monthlyOvertime,
    summary.totalOvertime,
    formatAvg(summary.totalOvertime),
  ]);

  // Item-item tunjangan dinamis lainnya
  const otherAllowanceKeys = Object.keys(summary.allowanceItemTotals).filter(
    (k) => k !== 'Upah Lembur'
  );

  otherAllowanceKeys.forEach((key, idx) => {
    const isLast = idx === otherAllowanceKeys.length - 1;
    const prefix = isLast ? '     └─ ' : '     ├─ ';
    const monthlyKeyVal = periods.map((p) => {
      const found = summary.monthlyBreakdown.find((m) => m.period === p);
      return found?.allowanceDetails?.[key] || 0;
    });
    const totalKey = summary.allowanceItemTotals[key] || 0;
    dataRows.push([
      `${prefix}${key}`,
      ...monthlyKeyVal,
      totalKey,
      formatAvg(totalKey),
    ]);
  });

  // Subtotal Pendapatan Kotor (Gross)
  const monthlyGross = getMonthlyVal((m) => m.grossSalary);
  dataRows.push([
    'TOTAL PENDAPATAN KOTOR (GROSS)',
    ...monthlyGross,
    summary.totalGrossSalary,
    formatAvg(summary.totalGrossSalary),
  ]);

  dataRows.push([]); // Pemisah

  // --- B. POTONGAN ---
  dataRows.push(['B. POTONGAN', ...periods.map(() => ''), '', '']);

  const deductionKeys = Object.keys(summary.deductionItemTotals);
  deductionKeys.forEach((key) => {
    const monthlyKeyVal = periods.map((p) => {
      const found = summary.monthlyBreakdown.find((m) => m.period === p);
      if (found?.deductionDetails?.[key] !== undefined) {
        return found.deductionDetails[key];
      }
      return 0;
    });
    const totalKey = summary.deductionItemTotals[key] || 0;
    dataRows.push([
      `  • ${key}`,
      ...monthlyKeyVal,
      totalKey,
      formatAvg(totalKey),
    ]);
  });

  // Subtotal Potongan
  const monthlyDeduct = getMonthlyVal((m) => m.deductions);
  dataRows.push([
    'TOTAL POTONGAN',
    ...monthlyDeduct,
    summary.totalDeductions,
    formatAvg(summary.totalDeductions),
  ]);

  dataRows.push([]); // Pemisah

  // --- C. TAKE HOME PAY (THP) ---
  const monthlyThp = getMonthlyVal((m) => m.takeHomePay);
  dataRows.push([
    'TAKE HOME PAY (THP BERSIH DITERIMA)',
    ...monthlyThp,
    summary.totalTakeHomePay,
    summary.averageTakeHomePay,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);

  // Atur lebar kolom
  const colWidths = [
    { wch: 38 }, // Nama Komponen
    ...periods.map(() => ({ wch: 18 })), // Kolom tiap bulan
    { wch: 22 }, // Total Kumulatif
    { wch: 20 }, // Rata-rata per bulan
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Rekap Komponen Gaji'
  );

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
