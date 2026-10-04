import { NextResponse } from 'next/server';
import { getReportById, updateReport, deleteReport } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getReportById(id);

    if (!report) {
      return NextResponse.json(
        { success: false, message: 'Laporan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Failed to get report:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil detail laporan.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await updateReport(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Laporan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Status dan catatan laporan berhasil diperbarui.',
    });
  } catch (error) {
    console.error('Failed to update report:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui laporan.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteReport(id);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Laporan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Laporan berhasil dihapus.',
    });
  } catch (error) {
    console.error('Failed to delete report:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus laporan.' },
      { status: 500 }
    );
  }
}
