import { NextRequest, NextResponse } from 'next/server';
import { getOvertimeDocConfig, saveOvertimeDocConfig } from '@/lib/db';
import { OvertimeDocConfig, DEFAULT_OVERTIME_DOC_CONFIG } from '@/lib/types';

export async function GET() {
  try {
    const config = await getOvertimeDocConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (err: unknown) {
    console.error('Failed to get overtime doc config:', err);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat konfigurasi surat lembur.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const cleanConfig: OvertimeDocConfig = {
      leaderName: String(body.leaderName || DEFAULT_OVERTIME_DOC_CONFIG.leaderName).trim(),
      leaderNipp: String(body.leaderNipp || DEFAULT_OVERTIME_DOC_CONFIG.leaderNipp).trim(),
      leaderPosition: String(body.leaderPosition || DEFAULT_OVERTIME_DOC_CONFIG.leaderPosition).trim(),
      city: String(body.city || DEFAULT_OVERTIME_DOC_CONFIG.city).trim(),
      defaultReason: String(body.defaultReason || DEFAULT_OVERTIME_DOC_CONFIG.defaultReason).trim(),
      employees:
        body.employees && typeof body.employees === 'object'
          ? body.employees
          : DEFAULT_OVERTIME_DOC_CONFIG.employees,
    };
    const saved = await saveOvertimeDocConfig(cleanConfig);
    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Konfigurasi identitas surat lembur berhasil disimpan.',
    });
  } catch (err: unknown) {
    console.error('Failed to save overtime doc config:', err);
    return NextResponse.json(
      { success: false, message: 'Gagal menyimpan konfigurasi surat lembur.' },
      { status: 500 }
    );
  }
}
