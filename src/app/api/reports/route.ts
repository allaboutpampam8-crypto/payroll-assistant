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

// In-memory rate limiter untuk form publik: IP -> { count, resetTime }
const reportRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const now = Date.now();
    const rateRecord = reportRateLimitMap.get(ip);

    // Batasi maksimal 15 pengiriman laporan per 10 menit per IP
    if (rateRecord && rateRecord.resetTime > now) {
      if (rateRecord.count >= 15) {
        const remainingMinutes = Math.ceil((rateRecord.resetTime - now) / 60000);
        return NextResponse.json(
          {
            success: false,
            message: `Terlalu banyak laporan dikirim dari koneksi Anda. Silakan tunggu ${remainingMinutes} menit sebelum mengirim lagi.`,
          },
          { status: 429 }
        );
      }
      rateRecord.count += 1;
    } else {
      reportRateLimitMap.set(ip, { count: 1, resetTime: now + 10 * 60 * 1000 });
    }

    const body = await request.json();

    if (!body.employeeName || !body.category || body.discrepancyAmount === undefined) {
      return NextResponse.json(
        { success: false, message: 'Nama karyawan, kategori, dan nominal selisih wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi panjang input teks (mencegah payload bloating)
    const employeeName = String(body.employeeName).trim().slice(0, 150);
    const employeeNik = String(body.employeeNik || '-').trim().slice(0, 50);
    const department = String(body.department || 'Umum').trim().slice(0, 100);
    const phoneNumber = String(body.phoneNumber || '').trim().slice(0, 30);
    const description = String(body.description || '').trim().slice(0, 2000);
    const period = String(body.period || 'Oktober 2026').trim().slice(0, 50);

    // Validasi lampiran (maksimal 7 MB Base64 string setara ~5 MB file asli & MIME type aman)
    let attachmentUrl = body.attachmentUrl;
    if (attachmentUrl) {
      if (typeof attachmentUrl !== 'string' || attachmentUrl.length > 7 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: 'Ukuran lampiran terlalu besar. Maksimal 5 MB.' },
          { status: 413 }
        );
      }
      const isAllowedMime =
        attachmentUrl.startsWith('data:image/jpeg') ||
        attachmentUrl.startsWith('data:image/png') ||
        attachmentUrl.startsWith('data:image/webp') ||
        attachmentUrl.startsWith('data:application/pdf') ||
        attachmentUrl.startsWith('https://');

      if (!isAllowedMime) {
        return NextResponse.json(
          { success: false, message: 'Format lampiran tidak didukung. Harap gunakan gambar (JPG/PNG) atau PDF.' },
          { status: 400 }
        );
      }
    }

    const newReport = await createReport({
      employeeName,
      employeeNik,
      department,
      phoneNumber,
      period,
      category: body.category,
      discrepancyAmount: Math.min(Number(body.discrepancyAmount) || 0, 1000000000), // Max 1 miliar batas masuk akal
      description,
      attachmentUrl,
      attachmentName: body.attachmentName ? String(body.attachmentName).slice(0, 100) : undefined,
      actionStatus: body.actionStatus || 'OPEN',
      priority: body.priority || 'NORMAL',
      dueDate: body.dueDate || '',
      resolutionNotes: body.resolutionNotes || '',
      source: body.source || 'MANUAL_PIC',
      reportedBy: body.reportedBy || '',
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
