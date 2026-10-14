import { NextRequest, NextResponse } from 'next/server';
import { getUniqueLatestEmployees } from '@/lib/db';
import { generateUniqueEmployeesExcelBuffer } from '@/lib/exportUniqueEmployeesExcel';

export const maxDuration = 120; // Waktu timeout cukup untuk deduplikasi puluhan ribu data

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodsParam = searchParams.get('periods');
    let targetPeriods: string[] | undefined = undefined;

    if (periodsParam) {
      targetPeriods = periodsParam
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }

    const employees = await getUniqueLatestEmployees(targetPeriods);

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            targetPeriods && targetPeriods.length > 0
              ? 'Tidak ada data pegawai yang ditemukan untuk periode yang dipilih.'
              : 'Belum ada data pegawai yang tersimpan di database.',
        },
        { status: 404 }
      );
    }

    const buffer = generateUniqueEmployeesExcelBuffer(employees);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let periodLabel = 'Semua_Periode';
    if (targetPeriods && targetPeriods.length > 0) {
      const sorted = [...targetPeriods].sort();
      if (sorted.length === 1) {
        periodLabel = `Periode_${sorted[0]}`;
      } else {
        periodLabel = `${sorted[0]}_sd_${sorted[sorted.length - 1]}_${sorted.length}Bulan`;
      }
    }

    const filename = `Master_Pegawai_PDS_Terupdate_${periodLabel}_${dateStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('Export Unique Employees Excel Error:', error);
    const msg = error instanceof Error ? error.message : 'Gagal mengekstrak dan mengekspor daftar master pegawai unik.';
    return NextResponse.json(
      {
        success: false,
        message: msg,
      },
      { status: 500 }
    );
  }
}
