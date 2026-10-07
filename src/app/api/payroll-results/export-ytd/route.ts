import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeCumulativePayrollSummary } from '@/lib/db';
import { generateEmployeeYtdExcelBuffer } from '@/lib/exportEmployeeYtdExcel';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('nik') || '';
    const startPeriod = searchParams.get('start') || undefined;
    const endPeriod = searchParams.get('end') || undefined;

    if (!query.trim()) {
      return NextResponse.json(
        { success: false, message: 'Parameter query/nik wajib disertakan.' },
        { status: 400 }
      );
    }

    const summary = await getEmployeeCumulativePayrollSummary(
      query,
      startPeriod,
      endPeriod
    );

    if (!summary || summary.totalMonths === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Data riwayat gaji untuk '${query}' tidak ditemukan di sistem.`,
        },
        { status: 404 }
      );
    }

    const buffer = generateEmployeeYtdExcelBuffer(summary);
    const safeName = summary.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
    const startP = summary.periods[0] || 'Mulai';
    const endP = summary.periods[summary.periods.length - 1] || 'Selesai';
    const filename = `Rekap_Gaji_${safeName}_${startP}_sd_${endP}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export YTD Excel Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membuat file Excel.' },
      { status: 500 }
    );
  }
}
