import { NextResponse } from 'next/server';
import {
  getAllReports,
  createReport,
  getDashboardMetrics,
  getSettings,
} from '@/lib/db';

export async function GET() {
  try {
    const reports = await getAllReports();
    const metrics = await getDashboardMetrics();
    const settings = await getSettings();

    return NextResponse.json({
      success: true,
      data: {
        reports,
        metrics,
        settings,
      },
    });
  } catch (error) {
    console.error('Failed to get reports:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data laporan.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.employeeName || !body.category || body.discrepancyAmount === undefined) {
      return NextResponse.json(
        { success: false, message: 'Nama karyawan, kategori, dan nominal selisih wajib diisi.' },
        { status: 400 }
      );
    }

    const newReport = await createReport({
      employeeName: body.employeeName,
      employeeNik: body.employeeNik || '-',
      department: body.department || 'Umum',
      phoneNumber: body.phoneNumber || '',
      period: body.period || 'Oktober 2026',
      category: body.category,
      discrepancyAmount: Number(body.discrepancyAmount) || 0,
      description: body.description || '',
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
      actionStatus: body.actionStatus || 'OPEN',
      priority: body.priority || 'NORMAL',
      dueDate: body.dueDate || '',
      resolutionNotes: body.resolutionNotes || '',
      source: body.source || 'MANUAL_PIC',
    });

    return NextResponse.json(
      { success: true, data: newReport, message: 'Laporan berhasil dicatat.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create report:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server saat menyimpan laporan.' },
      { status: 500 }
    );
  }
}
