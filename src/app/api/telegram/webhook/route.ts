import { NextResponse } from 'next/server';
import {
  getPayrollResultByNik,
  getPayrollResultsByName,
  comparePayrollResults,
  getPayrollPeriodSummary,
  getAllReports,
  getAllTodos,
  getSettings,
} from '@/lib/db';
import { sendTelegramNotification } from '@/lib/telegram';

function formatRupiah(num: number): string {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const message = update?.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const authorizedChatId = process.env.TELEGRAM_CHAT_ID;

    // Keamanan: Hanya respon jika dikirim oleh pemilik akun bot (Pak Pampam)
    if (authorizedChatId && chatId !== authorizedChatId) {
      await sendTelegramNotification(
        '⛔ <b>Akses Ditolak</b>\nBot ini hanya diperuntukkan bagi PIC Payroll PT Pelindo Daya Sejahtera.'
      );
      return NextResponse.json({ ok: true });
    }

    const rawText = message.text.trim();
    const parts = rawText.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // -------------------------------------------------------------
    // COMMAND: /start atau /help
    // -------------------------------------------------------------
    if (command === '/start' || command === '/help' || command === '/menu') {
      const helpMsg =
        `👋 <b>Halo, Pak Pampam!</b>\n` +
        `🤖 <i>Asisten Intelijen Payroll PT Pelindo Daya Sejahtera</i>\n\n` +
        `Berikut perintah yang siap Anda gunakan kapan saja:\n\n` +
        `🔍 <b>CEK GAJI PEGAWAI:</b>\n` +
        `• <code>/cek [nrp/nama]</code>\n` +
        `  <i>Contoh: /cek 98123 atau /cek Budi</i>\n\n` +
        `⚖️ <b>KOMPARASI GAJI MULTI-BULAN:</b>\n` +
        `• <code>/banding [nrp]</code>\n` +
        `  <i>Contoh: /banding 98123</i>\n` +
        `  (Menganalisis selisih komponen gaji bulan ini vs bulan lalu)\n\n` +
        `📊 <b>REKAP TOTAL BULANAN:</b>\n` +
        `• <code>/total [periode]</code>\n` +
        `  <i>Contoh: /total atau /total 2026-10</i>\n\n` +
        `📋 <b>MONITORING TIKET & AGENDA:</b>\n` +
        `• <code>/rekap</code> (Ringkasan tiket kendala & cut-off)\n` +
        `• <code>/todo</code> (Daftar to-do list aktif Anda)\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Ketik perintah langsung di chat ini untuk mencoba! 🚀</i>`;

      await sendTelegramNotification(helpMsg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /cek [nrp atau nama]
    // -------------------------------------------------------------
    if (command === '/cek' || command === '/gaji') {
      if (args.length === 0) {
        await sendTelegramNotification(
          '⚠️ <b>Format Perintah:</b>\nKetik: <code>/cek [NRP atau Nama]</code>\nContoh: <code>/cek 98123</code> atau <code>/cek Budi</code>'
        );
        return NextResponse.json({ ok: true });
      }

      const query = args.join(' ').trim();
      const isNik = /^\d+$/.test(query);

      let item = null;
      if (isNik) {
        item = await getPayrollResultByNik(query);
      } else {
        const list = await getPayrollResultsByName(query);
        if (list.length > 0) item = list[0];
      }

      if (!item) {
        await sendTelegramNotification(
          `🔍 <b>Data Tidak Ditemukan</b>\nTidak ditemukan data payroll untuk <code>${query}</code>.\nPastikan NRP/Nama benar atau file payroll bulan terkait sudah diunggah di web.`
        );
        return NextResponse.json({ ok: true });
      }

      const msg =
        `👤 <b>RINCIAN GAJI PEGAWAI</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Nama:</b> ${item.employeeName}\n` +
        `<b>NRP:</b> <code>${item.employeeNik}</code>\n` +
        `<b>Project:</b> ${item.department || '-'}\n` +
        `<b>Periode:</b> ${item.period}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• <b>Gaji Pokok:</b> ${formatRupiah(item.basicSalary)}\n` +
        `• <b>Tunjangan:</b> ${formatRupiah(item.allowances)}\n` +
        `• <b>Lembur:</b> ${formatRupiah(item.overtimeAmount)}\n` +
        `• <b>Potongan BPJS:</b> -${formatRupiah(item.deductionsBpjs)}\n` +
        `• <b>Potongan TGR/Lain:</b> -${formatRupiah(item.deductionsTgr + item.deductionsOther)}\n` +
        `• <b>Total Potongan:</b> -${formatRupiah(item.totalDeductions)}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>Take Home Pay (THP):</b> <b>${formatRupiah(item.takeHomePay)}</b>\n\n` +
        `<i>💡 Ketik <code>/banding ${item.employeeNik}</code> untuk melihat perbandingan dengan bulan lalu.</i>`;

      await sendTelegramNotification(msg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /banding [nrp] [p1] [p2]
    // -------------------------------------------------------------
    if (command === '/banding' || command === '/komparasi') {
      if (args.length === 0) {
        await sendTelegramNotification(
          '⚠️ <b>Format Perintah:</b>\nKetik: <code>/banding [NRP]</code>\nContoh: <code>/banding 98123</code>'
        );
        return NextResponse.json({ ok: true });
      }

      const nik = args[0].trim();
      const p1 = args[1]?.trim();
      const p2 = args[2]?.trim();

      const comp = await comparePayrollResults(nik, p1, p2);

      if (!comp) {
        await sendTelegramNotification(
          `🔍 <b>Data Tidak Ditemukan</b>\nTidak ditemukan histori data payroll untuk NRP <code>${nik}</code>.`
        );
        return NextResponse.json({ ok: true });
      }

      const { current, previous, diff } = comp;

      const formatDiff = (val: number) => {
        if (val === 0) return '<i>(Tetap)</i>';
        if (val > 0) return `🔺 <b>+${formatRupiah(val)}</b>`;
        return `🔻 <b>-${formatRupiah(Math.abs(val))}</b>`;
      };

      let msg =
        `⚖️ <b>KOMPARASI GAJI: ${current.employeeName}</b>\n` +
        `<b>NRP:</b> <code>${current.employeeNik}</code> • <b>Project:</b> ${current.department || '-'}\n` +
        `<b>Periode:</b> ${previous ? `${previous.period} ➔ ${current.period}` : current.period}\n` +
        `━━━━━━━━━━━━━━━━━━━\n`;

      if (!previous) {
        msg +=
          `<i>Hanya ditemukan data untuk periode ${current.period}. Data bulan sebelumnya belum diunggah.</i>\n\n` +
          `• <b>THP Periode Ini:</b> ${formatRupiah(current.takeHomePay)}`;
      } else {
        msg +=
          `• <b>Gaji Pokok:</b> ${formatRupiah(previous.basicSalary)} ➔ ${formatRupiah(current.basicSalary)} ${formatDiff(diff.basicSalary)}\n` +
          `• <b>Tunjangan:</b> ${formatRupiah(previous.allowances)} ➔ ${formatRupiah(current.allowances)} ${formatDiff(diff.allowances)}\n` +
          `• <b>Upah Lembur:</b> ${formatRupiah(previous.overtimeAmount)} ➔ ${formatRupiah(current.overtimeAmount)} ${formatDiff(diff.overtimeAmount)}\n` +
          `• <b>Total Potongan:</b> -${formatRupiah(previous.totalDeductions)} ➔ -${formatRupiah(current.totalDeductions)} ${formatDiff(diff.totalDeductions)}\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `💰 <b>Take Home Pay (THP):</b>\n` +
          `• Bulan Lalu (${previous.period}): ${formatRupiah(previous.takeHomePay)}\n` +
          `• Bulan Ini (${current.period}): <b>${formatRupiah(current.takeHomePay)}</b>\n` +
          `• <b>Selisih THP:</b> ${formatDiff(diff.takeHomePay)}\n\n` +
          `<i>💡 Rekomendasi: Periksa pos lembur atau potongan jika terdapat penurunan THP.</i>`;
      }

      await sendTelegramNotification(msg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /total [periode]
    // -------------------------------------------------------------
    if (command === '/total' || command === '/rekapgaji') {
      let period = args[0]?.trim();
      if (!period) {
        const settings = await getSettings();
        period = settings.activePeriod;
      }

      const summary = await getPayrollPeriodSummary(period);

      if (!summary) {
        await sendTelegramNotification(
          `📊 <b>Data Belum Tersedia</b>\nBelum ada data hasil payroll yang diunggah untuk periode <code>${period}</code>.\nSilakan unggah file Excel melalui dashboard web terlebih dahulu.`
        );
        return NextResponse.json({ ok: true });
      }

      const msg =
        `📊 <b>REKAP EKSEKUTIF PAYROLL</b>\n` +
        `<b>Periode:</b> ${summary.period}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• 👥 <b>Total Pegawai Dibayar:</b> ${summary.totalEmployees.toLocaleString('id-ID')} orang\n` +
        `• 💵 <b>Total Gaji Pokok:</b> ${formatRupiah(summary.totalBasicSalary)}\n` +
        `• 🎁 <b>Total Tunjangan:</b> ${formatRupiah(summary.totalAllowances)}\n` +
        `• ⏰ <b>Total Upah Lembur:</b> ${formatRupiah(summary.totalOvertime)}\n` +
        `• ✂️ <b>Total Seluruh Potongan:</b> -${formatRupiah(summary.totalDeductions)}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>TOTAL PENGELUARAN THP:</b>\n` +
        `<b>${formatRupiah(summary.totalTakeHomePay)}</b>`;

      await sendTelegramNotification(msg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /rekap (Tiket Kendala & Cutoff)
    // -------------------------------------------------------------
    if (command === '/rekap' || command === '/tiket') {
      const [reports, settings] = await Promise.all([getAllReports(), getSettings()]);

      const openReports = reports.filter((r) => r.actionStatus === 'OPEN');
      const crosscheckReports = reports.filter((r) => r.actionStatus === 'CROSSCHECK');
      const closeReports = reports.filter((r) => r.actionStatus === 'CLOSE');
      const urgentReports = reports.filter(
        (r) => r.priority === 'URGENT' && r.actionStatus !== 'CLOSE'
      );

      const msg =
        `📋 <b>STATUS TIKET KENDALA PAYROLL</b>\n` +
        `<b>Periode:</b> ${settings.activePeriod}\n` +
        `<b>Cut-Off:</b> ${settings.cutoffDate}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• 🟡 <b>Open (Perlu Ditindaklanjuti):</b> ${openReports.length} tiket\n` +
        `• 🔵 <b>Crosscheck (Sedang Konfirmasi):</b> ${crosscheckReports.length} tiket\n` +
        `• 🟢 <b>Close (Selesai):</b> ${closeReports.length} tiket\n` +
        (urgentReports.length > 0
          ? `• 🚨 <b>Prioritas Urgent:</b> ${urgentReports.length} tiket!\n`
          : '') +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Buka dashboard untuk detail laporan lengkap.</i>`;

      await sendTelegramNotification(msg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /todo
    // -------------------------------------------------------------
    if (command === '/todo' || command === '/agenda') {
      const todos = await getAllTodos();
      const activeTodos = todos.filter((t) => !t.isCompleted);

      let msg =
        `📝 <b>AGENDA TO-DO LIST AKTIF</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n`;

      if (activeTodos.length === 0) {
        msg += `<i>Semua agenda kerja sudah selesai! Tidak ada to-do aktif. 🎉</i>`;
      } else {
        activeTodos.slice(0, 5).forEach((t, idx) => {
          const priority = t.priority === 'URGENT' ? ' 🔴' : t.priority === 'TINGGI' ? ' 🟡' : '';
          msg += `${idx + 1}. ${t.title}${priority}\n`;
        });
        if (activeTodos.length > 5) {
          msg += `<i>...dan ${activeTodos.length - 5} tugas lainnya di dashboard.</i>`;
        }
      }

      await sendTelegramNotification(msg);
      return NextResponse.json({ ok: true });
    }

    // Default unknown command
    await sendTelegramNotification(
      `❓ <b>Perintah Tidak Dikenal</b>\nKetik <code>/help</code> untuk melihat daftar perintah yang tersedia.`
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
