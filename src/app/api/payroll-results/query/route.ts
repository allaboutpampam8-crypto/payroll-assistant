import { NextResponse } from 'next/server';
import { getPayrollResultByNik, getPayrollResultsByName } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');
    const name = searchParams.get('name');
    const period = searchParams.get('period') || undefined;

    if (nik) {
      const result = await getPayrollResultByNik(nik, period);
      return NextResponse.json({ success: true, data: result ? [result] : [] });
    }

    if (name) {
      const results = await getPayrollResultsByName(name, period);
      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json(
      { success: false, message: 'Parameter nik atau name wajib diisi.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('Failed to query payroll results:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
