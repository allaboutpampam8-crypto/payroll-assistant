import { NextResponse } from 'next/server';
import { comparePayrollResults } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');
    const period1 = searchParams.get('period1') || undefined;
    const period2 = searchParams.get('period2') || undefined;

    if (!nik) {
      return NextResponse.json(
        { success: false, message: 'Parameter nik wajib diisi.' },
        { status: 400 }
      );
    }

    const comparison = await comparePayrollResults(nik, period1, period2);

    if (!comparison) {
      return NextResponse.json(
        { success: false, message: 'Data payroll untuk pegawai ini tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, comparison });
  } catch (err: unknown) {
    console.error('Failed to compare payroll results:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
