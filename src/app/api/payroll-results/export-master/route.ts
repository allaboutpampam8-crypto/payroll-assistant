import { NextRequest, NextResponse } from 'next/server';
import { getPayrollResultsForPeriod, getAvailablePayrollPeriods } from '@/lib/db';
import { generateMultiPeriodExcelBuffer } from '@/lib/exportMultiPeriodExcel';
import { PayrollResult } from '@/lib/types';

export const maxDuration = 60; // Timeout 60 detik jika data puluhan ribu

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodsParam = searchParams.get('periods'); // comma separated: 2026-05,2026-07,2026-08,2026-09
    const singlePeriod = searchParams.get('period');

    let targetPeriods: string[] = [];

    if (periodsParam) {
      targetPeriods = periodsParam
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    } else if (singlePeriod) {
      targetPeriods = [singlePeriod.trim()];
    } else {
      // Default: ambil seluruh periode yang ada di database
      targetPeriods = await getAvailablePayrollPeriods();
    }

    if (targetPeriods.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada periode yang dipilih atau tersedia.' },
        { status: 400 }
      );
    }

    // Urutkan periode dari yang terlama ke terbaru
    targetPeriods.sort();

    const periodsData: Record<string, PayrollResult[]> = {};

    for (const p of targetPeriods) {
      const rows = await getPayrollResultsForPeriod(p);
      periodsData[p] = rows;
    }

    const totalRowsCount = Object.values(periodsData).reduce(
      (acc, list) => acc + list.length,
      0
    );

    if (totalRowsCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data gaji pada periode yang dipilih tidak ditemukan dalam database.',
        },
        { status: 404 }
      );
    }

    const buffer = generateMultiPeriodExcelBuffer(periodsData);

    const firstPeriod = targetPeriods[0];
    const lastPeriod = targetPeriods[targetPeriods.length - 1];
    const filename =
      targetPeriods.length === 1
        ? `Master_Payroll_Periode_${firstPeriod}.xlsx`
        : `Master_Payroll_${firstPeriod}_sd_${lastPeriod}_MultiSheet.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export Multi-Period Excel Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membuat file Excel multi-sheet.' },
      { status: 500 }
    );
  }
}
