import { NextResponse } from 'next/server';
import { savePayrollResultsBatch } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data results kosong atau tidak valid.' },
        { status: 400 }
      );
    }

    if (results.length > 2500) {
      return NextResponse.json(
        { success: false, message: 'Ukuran batch melebihi batas aman (maksimum 2.500 baris per batch request).' },
        { status: 400 }
      );
    }

    const { count } = await savePayrollResultsBatch(results);

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan ${count} data payroll.`,
      count,
    });
  } catch (err: unknown) {
    console.error('Failed to upload payroll results:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
