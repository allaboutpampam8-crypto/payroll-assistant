import { NextResponse } from 'next/server';
import { getReportById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getReportById(id);

    if (!report || !report.attachmentUrl) {
      return new NextResponse('File tidak ditemukan', { status: 404 });
    }

    const { attachmentUrl, attachmentName } = report;

    // Jika base64 data URI
    if (attachmentUrl.startsWith('data:')) {
      const matches = attachmentUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${attachmentName || 'dokumen.pdf'}"`,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // Jika external URL biasa
    return NextResponse.redirect(attachmentUrl);
  } catch (error) {
    console.error('Failed to stream attachment:', error);
    return new NextResponse('Gagal memuat lampiran', { status: 500 });
  }
}
