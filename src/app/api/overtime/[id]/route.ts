import { NextRequest, NextResponse } from 'next/server';
import { updateOvertimeLog, deleteOvertimeLog } from '@/lib/db';
import { normalizeTimeDot } from '@/lib/overtimeUtils';
import { OvertimeLog } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedUpdates: Partial<OvertimeLog> = {};
    if (body.userProfile !== undefined) allowedUpdates.userProfile = body.userProfile;
    if (body.workDate !== undefined) {
      allowedUpdates.workDate = String(body.workDate);
      allowedUpdates.period = body.period || String(body.workDate).slice(0, 7);
    } else if (body.period !== undefined) {
      allowedUpdates.period = String(body.period);
    }
    if (body.startTime !== undefined) allowedUpdates.startTime = normalizeTimeDot(String(body.startTime));
    if (body.endTime !== undefined) allowedUpdates.endTime = normalizeTimeDot(String(body.endTime));
    if (body.pauseMinutes !== undefined) allowedUpdates.pauseMinutes = Math.max(0, Number(body.pauseMinutes) || 0);
    if (body.durationMinutes !== undefined) allowedUpdates.durationMinutes = Math.max(0, Number(body.durationMinutes) || 0);
    if (body.jobDescription !== undefined) allowedUpdates.jobDescription = String(body.jobDescription).trim();
    if (body.targetDescription !== undefined) allowedUpdates.targetDescription = String(body.targetDescription).trim();
    if (body.reason !== undefined) allowedUpdates.reason = String(body.reason).trim();
    if (Array.isArray(body.checklist)) allowedUpdates.checklist = body.checklist;

    const updated = await updateOvertimeLog(id, allowedUpdates);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Catatan lembur tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Catatan lembur berhasil diperbarui.',
    });
  } catch (err: unknown) {
    console.error('Failed to update overtime log:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal memperbarui catatan lembur.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteOvertimeLog(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: 'Catatan lembur tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Catatan lembur berhasil dihapus.',
    });
  } catch (err: unknown) {
    console.error('Failed to delete overtime log:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal menghapus catatan lembur.',
      },
      { status: 500 }
    );
  }
}
