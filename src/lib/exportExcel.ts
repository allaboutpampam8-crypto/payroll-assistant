import * as XLSX from 'xlsx';
import { PayrollReport, CATEGORY_LABELS, STATUS_CONFIG } from './types';

export function exportReportsToExcel(reports: PayrollReport[], periodName: string) {
  const rows = reports.map((r, index) => {
    return {
      'No.': index + 1,
      'No. Tiket': r.ticketNumber,
      'Tanggal Lapor': new Date(r.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      'Nama Pegawai': r.employeeName,
      'NRP': r.employeeNik,
      'Project': r.department,
      'No. WhatsApp': r.phoneNumber || '-',
      'Kategori': CATEGORY_LABELS[r.category] || r.category,
      'Estimasi Selisih (Rp)': r.discrepancyAmount || 0,
      'Status': STATUS_CONFIG[r.actionStatus]?.label || r.actionStatus,
      'Prioritas': r.priority,
      'Target Selesai': r.dueDate || '-',
      'Deskripsi / Keterangan': r.description,
      'Catatan Solusi / Crosscheck': r.resolutionNotes || '-',
      'Sumber Laporan': r.source === 'FORM_KARYAWAN' ? 'Form Mandiri' : 'Dicatat PIC',
      'Tanggal Selesai': r.resolvedAt
        ? new Date(r.resolvedAt).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const colWidths = [
    { wch: 5 },  // No
    { wch: 18 }, // No Tiket
    { wch: 14 }, // Tgl
    { wch: 22 }, // Nama Pegawai
    { wch: 16 }, // NRP
    { wch: 28 }, // Project
    { wch: 16 }, // WA
    { wch: 22 }, // Kategori
    { wch: 20 }, // Nominal Selisih
    { wch: 14 }, // Status
    { wch: 12 }, // Prioritas
    { wch: 14 }, // Target Selesai
    { wch: 35 }, // Deskripsi
    { wch: 35 }, // Solusi
    { wch: 16 }, // Sumber
    { wch: 14 }, // Tgl Selesai
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Payroll PDS');

  const safePeriod = periodName.replace(/\s+/g, '_');
  const filename = `Rekap_Payroll_PDS_${safePeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
