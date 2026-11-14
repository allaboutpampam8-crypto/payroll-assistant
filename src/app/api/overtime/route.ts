import { NextRequest, NextResponse } from 'next/server';
import { getOvertimeLogs, createOvertimeLog } from '@/lib/db';
import { normalizeTimeDot, computeDurationMinutes } from '@/lib/overtimeUtils';
import { APP_USER_PROFILES, AppUserProfile } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || undefined;
    const user = searchParams.get('user') || undefined;

    const { logs, tableMissing } = await getOvertimeLogs(period, user);
    return NextResponse.json({
      success: true,
      data: logs,
      tableMissing: Boolean(tableMissing),
    });
  } catch (err: unknown) {
    console.error('Failed to fetch overtime logs:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal memuat riwayat lembur.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userProfile,
      workDate,
      period,
      startTime,
      endTime,
      pauseMinutes,
      durationMinutes,
      jobDescription,
      targetDescription,
      reason,
      checklist,
    } = body;

    if (!userProfile || !workDate || !startTime || !endTime || !jobDescription) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data tanggal, jam mulai/selesai, dan pekerjaan wajib diisi.',
        },
        { status: 400 }
      );
    }

    if (!APP_USER_PROFILES.some((p) => p.id === userProfile)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Profil user tidak valid.',
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(workDate))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Format tanggal harus YYYY-MM-DD.',
        },
        { status: 400 }
      );
    }

    const cleanStart = normalizeTimeDot(String(startTime));
    const cleanEnd = normalizeTimeDot(String(endTime));
    const cleanPause = Math.max(0, Number(pauseMinutes) || 0);
    const cleanDuration = computeDurationMinutes(cleanStart, cleanEnd, cleanPause);

    if (cleanDuration <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Format jam tidak valid atau durasi lembur 0 menit.',
        },
        { status: 400 }
      );
    }

    const derivedPeriod = period || String(workDate).slice(0, 7);

    const { log, tableMissing } = await createOvertimeLog({
      userProfile: userProfile as AppUserProfile,
      workDate: String(workDate),
      period: derivedPeriod,
      startTime: cleanStart,
      endTime: cleanEnd,
      pauseMinutes: cleanPause,
      durationMinutes: cleanDuration,
      jobDescription: String(jobDescription).trim(),
      targetDescription: String(targetDescription || '').trim(),
      reason: String(reason || '').trim(),
      checklist: Array.isArray(checklist) ? checklist : [],
    });

    return NextResponse.json({
      success: true,
      data: log,
      tableMissing: Boolean(tableMissing),
      message: tableMissing
        ? 'Catatan lembur tersimpan lokal (tabel Supabase belum dibuat).'
        : 'Catatan lembur berhasil disimpan.',
    });
  } catch (err: unknown) {
    console.error('Failed to create overtime log:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal menyimpan catatan lembur.',
      },
      { status: 500 }
    );
  }
}
