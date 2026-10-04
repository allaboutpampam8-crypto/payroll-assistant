import { NextResponse } from 'next/server';
import { getAllReports, getAllTodos, getSettings } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    // Optional CRON_SECRET authorization check
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
    const reports = await getAllReports();
    const todos = await getAllTodos();

    // Hitung tanggal & selisih cut-off
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(settings.cutoffDate);
    cutoff.setHours(0, 0, 0, 0);

    const diffTime = cutoff.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let cutoffText = '';
    if (diffDays < 0) {
      cutoffText = `⚠️ Lewat ${Math.abs(diffDays)} hari!`;
    } else if (diffDays === 0) {
      cutoffText = '🚨 HARI INI!';
    } else {
      cutoffText = `sisa ${diffDays} hari lagi`;
    }

    // Format tanggal Indonesia
    const dateFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Analisis laporan
    const openReports = reports.filter((r) => r.actionStatus === 'OPEN');
    const crosscheckReports = reports.filter((r) => r.actionStatus === 'CROSSCHECK');
    const closeReports = reports.filter((r) => r.actionStatus === 'CLOSE');
    const urgentReports = reports.filter(
      (r) => r.priority === 'URGENT' && r.actionStatus !== 'CLOSE'
    );

    // Analisis To-Do
    const activeTodos = todos.filter((t) => !t.isCompleted);

    // Buat template pesan eksekutif yang elegan & rapi
    let message =
      `🌅 <b>SELAMAT PAGI, PAK PAMPAM!</b>\n` +
      `🤖 <i>Daily Briefing Asisten Payroll ${settings.companyName}</i>\n\n` +
      `📅 <b>Hari:</b> ${dateFormatted}\n` +
      `🗓 <b>Periode:</b> ${settings.activePeriod}\n` +
      `⏳ <b>Cut-Off Payroll:</b> ${settings.cutoffDate} (${cutoffText})\n\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📋 <b>STATUS TIKET LAPORAN:</b>\n` +
      `• 🟡 <b>Open (Baru):</b> ${openReports.length} laporan\n` +
      `• 🔵 <b>Crosscheck:</b> ${crosscheckReports.length} laporan\n` +
      `• 🟢 <b>Selesai (Close):</b> ${closeReports.length} laporan\n`;

    if (urgentReports.length > 0) {
      message += `• 🚨 <b>Prioritas Urgent:</b> ${urgentReports.length} laporan butuh atensi segera!\n`;
    }

    message +=
      `\n━━━━━━━━━━━━━━━━━━━\n` +
      `📝 <b>AGENDA TO-DO LIST:</b>\n` +
      `• <b>Tugas Aktif:</b> ${activeTodos.length} tugas belum selesai\n`;

    if (activeTodos.length === 0) {
      message += `  <i>(Semua to-do sudah beres, tidak ada tanggungan aktif) 🎉</i>\n`;
    } else {
      const topTodos = activeTodos.slice(0, 3);
      topTodos.forEach((t, idx) => {
        const priorityTag = t.priority === 'URGENT' ? ' 🔴' : '';
        message += `  ${idx + 1}. ${t.title}${priorityTag}\n`;
      });
      if (activeTodos.length > 3) {
        message += `  <i>...dan ${activeTodos.length - 3} tugas lainnya.</i>\n`;
      }
    }

    message +=
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `👉 <i>Buka aplikasi asisten Anda untuk mulai menindaklanjuti. Semangat bekerja! 💪</i>`;

    const sent = await sendTelegramNotification(message);

    return NextResponse.json({
      success: sent,
      message: sent
        ? 'Daily briefing berhasil dikirim ke Telegram.'
        : 'Gagal mengirim daily briefing.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Failed to run daily briefing cron:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
