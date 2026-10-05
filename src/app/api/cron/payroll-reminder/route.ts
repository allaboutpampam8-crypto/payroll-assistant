import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    // Verifikasi CRON_SECRET jika dikonfigurasi
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await getSettings();

    // Pastikan zona waktu Asia/Jakarta (WIB)
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dateFormatted = nowWib.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message =
      `🔔 <b>PENGINGAT UPLOAD DATA PAYROLL BULANAN</b>\n` +
      `🤖 <i>Asisten Intelijen Payroll ${settings.companyName}</i>\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `👋 <b>Halo, Pak Pampam!</b>\n` +
      `Hari ini adalah <b>${dateFormatted} (Tanggal 26)</b>.\n\n` +
      `Proses cut-off payroll periode <b>${settings.activePeriod}</b> telah selesai. ` +
      `Silakan ekspor file rekapitulasi gaji 17.000+ pegawai dari ERP kantor dan unggah ke dashboard web:\n\n` +
      `📥 <b>Langkah yang Perlu Dilakukan:</b>\n` +
      `1. Buka dashboard web asisten Anda.\n` +
      `2. Klik menu <b>"Data Payroll"</b>.\n` +
      `3. Unggah file spreadsheet (Excel / CSV).\n\n` +
      `✨ <b>Manfaat Setelah Diunggah:</b>\n` +
      `• Asisten Telegram siap menjawab pertanyaan rincian gaji (<code>/cek [NRP]</code>).\n` +
      `• Analisis otomatis selisih gaji antar bulan langsung aktif (<code>/banding [NRP]</code>).\n` +
      `• Data makro siap untuk laporan rapat direksi (<code>/total</code> & <code>/bandingtotal</code>).\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Semoga proses payroll bulan ini berjalan lancar dan tuntas! Semangat bekerja, Pak Pampam! 💪💼</i>`;

    const sent = await sendTelegramNotification(message);

    return NextResponse.json({
      success: sent,
      timestamp: nowWib.toISOString(),
      message: sent
        ? 'Notifikasi pengingat upload tanggal 26 berhasil dikirim ke Telegram.'
        : 'Gagal mengirim notifikasi Telegram. Periksa token dan chat ID.',
    });
  } catch (err: unknown) {
    console.error('Payroll reminder cron error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
