import { NextResponse } from 'next/server';
import { getAllReports, getAllTodos, getSettings } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    // Otorisasi CRON_SECRET wajib (Fail-Closed)
    const cronSecret = process.env.CRON_SECRET || process.env.DASHBOARD_PIN;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Token otorisasi CRON tidak valid.' },
        { status: 401 }
      );
    }

    const settings = await getSettings();
    const reports = await getAllReports();
    const todos = await getAllTodos();

    // Hitung tanggal & selisih cut-off menggunakan zona waktu WIB (Asia/Jakarta)
    const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const today = new Date(nowWib);
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

    const isPaymentDay = nowWib.getDate() === 25;

    // Format tanggal Indonesia & tanggal YYYY-MM-DD zona waktu WIB
    const year = nowWib.getFullYear();
    const month = String(nowWib.getMonth() + 1).padStart(2, '0');
    const day = String(nowWib.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const dateFormatted = nowWib.toLocaleDateString('id-ID', {
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
    const overdueReports = reports.filter(
      (r) => r.actionStatus !== 'CLOSE' && r.dueDate && r.dueDate < todayStr
    );
    const dueTodayReports = reports.filter(
      (r) => r.actionStatus !== 'CLOSE' && r.dueDate && r.dueDate === todayStr
    );

    // Analisis To-Do
    const activeTodos = todos.filter((t) => !t.isCompleted);
    const overdueTodos = activeTodos.filter((t) => t.dueDate && t.dueDate < todayStr);
    const dueTodayTodos = activeTodos.filter((t) => t.dueDate && t.dueDate === todayStr);

    // Buat template pesan eksekutif yang elegan & rapi
    let message =
      `🌅 <b>SELAMAT PAGI, PAK PAMPAM!</b>\n` +
      `🤖 <i>Daily Briefing Asisten Payroll ${settings.companyName}</i>\n\n` +
      `📅 <b>Hari:</b> ${dateFormatted}\n` +
      `🗓 <b>Periode:</b> ${settings.activePeriod}\n` +
      `⏳ <b>Cut-Off Payroll:</b> ${settings.cutoffDate} (${cutoffText})\n`;

    // Highlight mencolok jika ada item yang terlambat
    if (overdueTodos.length > 0 || overdueReports.length > 0) {
      message +=
        `\n🚨 <b>PERHATIAN: ITEM TERLEWAT JATUH TEMPO!</b>\n`;
      if (overdueTodos.length > 0) {
        message += `• 🔴 <b>${overdueTodos.length} To-Do Terlewat Deadline:</b>\n`;
        overdueTodos.slice(0, 3).forEach((t) => {
          message += `   - ${t.title} <i>(Due: ${t.dueDate})</i>\n`;
        });
        if (overdueTodos.length > 3) {
          message += `   - <i>...dan ${overdueTodos.length - 3} to-do terlambat lainnya</i>\n`;
        }
      }
      if (overdueReports.length > 0) {
        message += `• ⚠️ <b>${overdueReports.length} Laporan Kendala Melewati Target</b>\n`;
      }
    }

    if (isPaymentDay) {
      message +=
        `\n🔔 <b>JADWAL PENTING HARI INI (TGL 25 - PEMBAYARAN GAJI):</b>\n` +
        `<i>Hari pembayaran gaji pegawai! Waktunya mengunggah rekapitulasi data hasil payroll dari ERP ke dashboard web agar bot & komparasi siap digunakan!</i>\n`;
    }

    message +=
      `\n━━━━━━━━━━━━━━━━━━━\n` +
      `📋 <b>STATUS TIKET LAPORAN:</b>\n` +
      `• 🟡 <b>Open (Baru):</b> ${openReports.length} laporan\n` +
      `• 🔵 <b>Crosscheck:</b> ${crosscheckReports.length} laporan\n` +
      `• 🟢 <b>Selesai (Close):</b> ${closeReports.length} laporan\n`;

    if (overdueReports.length > 0) {
      message += `• 🔴 <b>Terlewat Target:</b> ${overdueReports.length} laporan butuh percepatan!\n`;
    }

    if (dueTodayReports.length > 0) {
      message += `• ⚡ <b>Jatuh Tempo Hari Ini:</b> ${dueTodayReports.length} laporan\n`;
    }

    if (urgentReports.length > 0) {
      message += `• 🚨 <b>Prioritas Urgent:</b> ${urgentReports.length} laporan butuh atensi segera!\n`;
    }

    message +=
      `\n━━━━━━━━━━━━━━━━━━━\n` +
      `📝 <b>AGENDA TO-DO LIST:</b>\n` +
      `• <b>Tugas Aktif:</b> ${activeTodos.length} tugas` +
      (overdueTodos.length > 0 ? ` (🔴 <b>${overdueTodos.length} terlambat</b>)` : '') +
      (dueTodayTodos.length > 0 ? ` (⚡ <b>${dueTodayTodos.length} hari ini</b>)` : '') +
      `\n`;

    if (activeTodos.length === 0) {
      message += `  <i>(Semua to-do sudah beres, tidak ada tanggungan aktif) 🎉</i>\n`;
    } else {
      // Prioritaskan tampilkan tugas terlambat lebih dahulu, lalu hari ini, lalu lainnya
      const sortedActiveTodos = [...activeTodos].sort((a, b) => {
        const aOverdue = Boolean(a.dueDate && a.dueDate < todayStr);
        const bOverdue = Boolean(b.dueDate && b.dueDate < todayStr);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        const aToday = Boolean(a.dueDate && a.dueDate === todayStr);
        const bToday = Boolean(b.dueDate && b.dueDate === todayStr);
        if (aToday && !bToday) return -1;
        if (!aToday && bToday) return 1;
        return 0;
      });

      const topTodos = sortedActiveTodos.slice(0, 5);
      topTodos.forEach((t, idx) => {
        let tag = '';
        if (t.dueDate && t.dueDate < todayStr) {
          tag = ` 🚨 <i>[TERLAMBAT: ${t.dueDate}]</i>`;
        } else if (t.dueDate && t.dueDate === todayStr) {
          tag = ` ⚡ <i>[HARI INI]</i>`;
        } else if (t.priority === 'URGENT') {
          tag = ' 🔴';
        }
        message += `  ${idx + 1}. ${t.title}${tag}\n`;
      });
      if (sortedActiveTodos.length > 5) {
        message += `  <i>...dan ${sortedActiveTodos.length - 5} tugas lainnya.</i>\n`;
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
