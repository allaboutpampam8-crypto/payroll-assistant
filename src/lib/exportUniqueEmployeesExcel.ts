import * as XLSX from 'xlsx';
import { UniqueEmployeeRecord } from './types';

/**
 * Menghasilkan file Buffer Excel untuk daftar pegawai unik (1 baris per NRP)
 * berdasarkan data periode mutakhir/terakhir aktif beserta periode awal aktifnya.
 */
export function generateUniqueEmployeesExcelBuffer(
  employees: UniqueEmployeeRecord[]
): Buffer {
  const rows = employees.map((emp, index) => ({
    'No': index + 1,
    'NRP / NIK': emp.nik,
    'Nama Pegawai': emp.name,
    'Jabatan Terakhir': emp.position || '-',
    'Cost Center Terakhir': emp.department || '-',
    'Periode Awal Aktif': emp.firstPeriod || emp.period || '-',
    'Periode Terakhir Aktif': emp.period || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Atur lebar kolom agar rapi dan tidak terpotong
  const colWidths = [
    { wch: 6 },  // No
    { wch: 18 }, // NRP / NIK
    { wch: 35 }, // Nama Pegawai
    { wch: 35 }, // Jabatan Terakhir
    { wch: 45 }, // Cost Center Terakhir
    { wch: 22 }, // Periode Awal Aktif
    { wch: 24 }, // Periode Terakhir Aktif
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Master Pegawai Unik'
  );

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
