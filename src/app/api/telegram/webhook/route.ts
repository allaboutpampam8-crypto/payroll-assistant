import { NextResponse } from 'next/server';
import {
  getPayrollResultByNik,
  getPayrollResultsByName,
  comparePayrollResults,
  getPayrollPeriodSummary,
  comparePayrollPeriodSummaries,
  getAllReports,
  getAllTodos,
  getSettings,
} from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';

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
      await sendTelegramMessage(
        chatId,
        '⛔ <b>Akses Ditolak</b>\nBot ini hanya diperuntukkan bagi PIC Payroll PT Pelindo Daya Sejahtera.'
      );
      return NextResponse.json({ ok: true });
    }

    const rawText = message.text.trim();
    const parts = rawText.split(/\s+/);
    const command = parts[0].toLowerCase().split('@')[0];
    const args = parts.slice(1);

    // -------------------------------------------------------------
    // COMMAND: /start, /help, /menu
    // -------------------------------------------------------------
    if (command === '/start' || command === '/help' || command === '/menu') {
      const helpMsg =
        `👋 <b>Halo, Pak Pampam!</b>\n` +
        `🤖 <i>Asisten Intelijen Payroll PT Pelindo Daya Sejahtera</i>\n\n` +
        `Berikut perintah yang siap Anda gunakan kapan saja:\n\n` +
        `🔍 <b>CEK RINCIAN GAJI PEGAWAI:</b>\n` +
        `• <code>/cek [nrp/nama]</code>\n` +
        `  <i>Contoh: /cek 98123 atau /cek Budi</i>\n` +
        `  (Menampilkan rincian Gapok, Lembur, 92 Komponen Tunjangan, Potongan & THP)\n\n` +
        `⚖️ <b>KOMPARASI GAJI PEGAWAI (MULTI-BULAN):</b>\n` +
        `• <code>/banding [nrp]</code>\n` +
        `  <i>Contoh: /banding 98123</i>\n` +
        `  (Menganalisis selisih THP & komponen tunjangan/lembur bulan ini vs lalu)\n\n` +
        `🏢 <b>KOMPARASI MAKRO RAPAT ATASAN:</b>\n` +
        `• <code>/bandingtotal [bulan1] [bulan2]</code>\n` +
        `  <i>Contoh: /bandingtotal 2026-09 2026-10</i>\n` +
        `  (Analisa perbandingan beban payroll perusahaan antar bulan untuk pimpinan)\n\n` +
        `📊 <b>REKAP TOTAL BULANAN:</b>\n` +
        `• <code>/total [periode]</code>\n` +
        `  <i>Contoh: /total atau /total 2026-10</i>\n\n` +
        `📋 <b>MONITORING TIKET & AGENDA:</b>\n` +
        `• <code>/rekap</code> (Ringkasan tiket kendala & cut-off)\n` +
        `• <code>/todo</code> (Daftar to-do list aktif Anda)\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Ketik perintah langsung di chat ini untuk mencoba! 🚀</i>`;

      await sendTelegramMessage(chatId, helpMsg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /cek [nrp atau nama]
    // -------------------------------------------------------------
    if (command === '/cek' || command === '/gaji') {
      if (args.length === 0) {
        await sendTelegramMessage(
          chatId,
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
        await sendTelegramMessage(
          chatId,
          `🔍 <b>Data Tidak Ditemukan</b>\nTidak ditemukan data payroll untuk <code>${query}</code>.\nPastikan NRP/Nama benar atau file payroll bulan terkait sudah diunggah di web.`
        );
        return NextResponse.json({ ok: true });
      }

      // Format Rincian Tunjangan Aktif (> 0)
      const allowances = Object.entries(item.allowanceDetails || {})
        .filter(([, v]) => Number(v) > 0)
        .map(([name, val]) => `• ${name}: <b>${formatRupiah(val)}</b>`);

      // Format Rincian Potongan Aktif (> 0)
      const deductions = Object.entries(item.deductionDetails || {})
        .filter(([, v]) => Number(v) > 0)
        .map(([name, val]) => `• ${name}: -${formatRupiah(val)}`);

      let msg =
        `👤 <b>RINCIAN GAJI PEGAWAI</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Nama:</b> ${item.employeeName}\n` +
        `<b>NRP:</b> <code>${item.employeeNik}</code> ${item.status ? `| ${item.status}` : ''}\n` +
        `<b>Jabatan:</b> ${item.positionTitle || '-'}\n` +
        `<b>Unit / Project:</b> ${item.department || '-'}\n` +
        `<b>Periode:</b> ${item.period}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• <b>Upah Pokok:</b> ${formatRupiah(item.basicSalary)}\n` +
        `• <b>Total Penerimaan (Tunjangan & Lembur):</b> ${formatRupiah(item.allowances)}\n` +
        `• <b>Jumlah Kotor (Bruto):</b> ${formatRupiah(item.grossSalary || (item.basicSalary + item.allowances))}\n` +
        `• <b>Total Potongan:</b> -${formatRupiah(item.totalDeductions)}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>Take Home Pay (THP):</b> <b>${formatRupiah(item.takeHomePay)}</b>\n`;

      if (allowances.length > 0) {
        msg +=
          `\n🎁 <b>RINCIAN PENERIMAAN (TUNJANGAN & LEMBUR):</b>\n` +
          allowances.slice(0, 15).join('\n') +
          (allowances.length > 15 ? `\n<i>...dan ${allowances.length - 15} komponen penerimaan lainnya (cek web)</i>` : '');
      }

      if (deductions.length > 0) {
        msg +=
          `\n\n✂️ <b>RINCIAN POTONGAN:</b>\n` +
          deductions.slice(0, 10).join('\n') +
          (deductions.length > 10 ? `\n<i>...dan ${deductions.length - 10} potongan lainnya</i>` : '');
      }

      msg += `\n\n<i>💡 Ketik <code>/banding ${item.employeeNik}</code> untuk melihat perbandingan dengan bulan lalu.</i>`;

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /banding [nrp] [p1] [p2]
    // -------------------------------------------------------------
    if (command === '/banding' || command === '/komparasi') {
      if (args.length === 0) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Format Perintah:</b>\nKetik: <code>/banding [NRP]</code>\nContoh: <code>/banding 98123</code>'
        );
        return NextResponse.json({ ok: true });
      }

      const nik = args[0].trim();
      const p1 = args[1]?.trim();
      const p2 = args[2]?.trim();

      const comp = await comparePayrollResults(nik, p1, p2);

      if (!comp) {
        await sendTelegramMessage(
          chatId,
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
          `• <b>Upah Pokok:</b> ${formatRupiah(previous.basicSalary)} ➔ ${formatRupiah(current.basicSalary)} ${formatDiff(diff.basicSalary)}\n` +
          `• <b>Total Penerimaan (Tunjangan & Lembur):</b> ${formatRupiah(previous.allowances)} ➔ ${formatRupiah(current.allowances)} ${formatDiff(diff.allowances)}\n` +
          `• <b>Jumlah Kotor (Bruto):</b> ${formatRupiah(previous.grossSalary || (previous.basicSalary + previous.allowances))} ➔ ${formatRupiah(current.grossSalary || (current.basicSalary + current.allowances))} ${formatDiff(diff.grossSalary || 0)}\n` +
          `• <b>Total Potongan:</b> -${formatRupiah(previous.totalDeductions)} ➔ -${formatRupiah(current.totalDeductions)} ${formatDiff(diff.totalDeductions)}\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `💰 <b>Take Home Pay (THP):</b>\n` +
          `• Bulan Lalu (${previous.period}): ${formatRupiah(previous.takeHomePay)}\n` +
          `• Bulan Ini (${current.period}): <b>${formatRupiah(current.takeHomePay)}</b>\n` +
          `• <b>Selisih THP:</b> ${formatDiff(diff.takeHomePay)}\n`;

        // Drill-Down: Detail Perubahan Komponen Penerimaan Spesifik
        const changedAllowances = Object.entries(diff.allowanceDiffs || {})
          .filter(([, d]) => d.diff !== 0)
          .map(([k, d]) => `• <b>${k}:</b> ${formatRupiah(d.prev)} ➔ ${formatRupiah(d.curr)} (${formatDiff(d.diff)})`);

        if (changedAllowances.length > 0) {
          msg +=
            `\n🔍 <b>DETAIL PERUBAHAN PENERIMAAN (TUNJANGAN & LEMBUR):</b>\n` +
            changedAllowances.slice(0, 10).join('\n') +
            (changedAllowances.length > 10 ? `\n<i>...dan ${changedAllowances.length - 10} komponen lainnya</i>` : '');
        }

        // Drill-Down: Detail Perubahan Potongan Spesifik
        const changedDeductions = Object.entries(diff.deductionDiffs || {})
          .filter(([, d]) => d.diff !== 0)
          .map(([k, d]) => `• <b>${k}:</b> ${formatRupiah(d.prev)} ➔ ${formatRupiah(d.curr)} (${formatDiff(d.diff)})`);

        if (changedDeductions.length > 0) {
          msg +=
            `\n\n✂️ <b>DETAIL PERUBAHAN POTONGAN:</b>\n` +
            changedDeductions.slice(0, 5).join('\n');
        }
      }

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // COMMAND: /bandingtotal [bln1] [bln2] (PRD Tabel 4.1)
    // -------------------------------------------------------------
    if (command === '/bandingtotal' || command === '/komparasitotal') {
      if (args.length < 2) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Format Perintah:</b>\nKetik: <code>/bandingtotal [Bulan1] [Bulan2]</code>\nContoh: <code>/bandingtotal 2026-09 2026-10</code>'
        );
        return NextResponse.json({ ok: true });
      }

      const p1 = args[0].trim();
      const p2 = args[1].trim();

      const comp = await comparePayrollPeriodSummaries(p1, p2);
      if (!comp) {
        await sendTelegramMessage(
          chatId,
          `📊 <b>Data Belum Lengkap</b>\nTidak dapat menemukan data rekap untuk salah satu/kedua periode: <code>${p1}</code> atau <code>${p2}</code>.\nPastikan file Excel kedua bulan tersebut sudah diunggah di web.`
        );
        return NextResponse.json({ ok: true });
      }

      const { p1Summary, p2Summary, diff } = comp;
      const formatDiff = (val: number) => {
        if (val === 0) return '<i>(Tetap)</i>';
        if (val > 0) return `🔺 <b>+${formatRupiah(val)}</b>`;
        return `🔻 <b>-${formatRupiah(Math.abs(val))}</b>`;
      };

      const msg =
        `🏢 <b>KOMPARASI MAKRO PAYROLL PERUSAHAAN</b>\n` +
        `<b>Periode:</b> ${p1Summary.period} ➔ ${p2Summary.period}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• 👥 <b>Jumlah Pegawai:</b> ${p1Summary.totalEmployees.toLocaleString('id-ID')} ➔ ${p2Summary.totalEmployees.toLocaleString('id-ID')} (${diff.totalEmployees >= 0 ? `+${diff.totalEmployees}` : diff.totalEmployees})\n` +
        `• 💵 <b>Total Gaji Pokok:</b> ${formatRupiah(p1Summary.totalBasicSalary)} ➔ ${formatRupiah(p2Summary.totalBasicSalary)} ${formatDiff(diff.totalBasicSalary)}\n` +
        `• 🎁 <b>Total Tunjangan:</b> ${formatRupiah(p1Summary.totalAllowances)} ➔ ${formatRupiah(p2Summary.totalAllowances)} ${formatDiff(diff.totalAllowances)}\n` +
        `• ⏰ <b>Total Upah Lembur:</b> ${formatRupiah(p1Summary.totalOvertime)} ➔ ${formatRupiah(p2Summary.totalOvertime)} ${formatDiff(diff.totalOvertime)}\n` +
        `• ✂️ <b>Total Potongan:</b> -${formatRupiah(p1Summary.totalDeductions)} ➔ -${formatRupiah(p2Summary.totalDeductions)} ${formatDiff(diff.totalDeductions)}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>TOTAL PENGELUARAN THP:</b>\n` +
        `• ${p1Summary.period}: ${formatRupiah(p1Summary.totalTakeHomePay)}\n` +
        `• ${p2Summary.period}: <b>${formatRupiah(p2Summary.totalTakeHomePay)}</b>\n` +
        `• <b>Selisih Beban:</b> ${formatDiff(diff.totalTakeHomePay)}\n\n` +
        `<i>💡 Analisis siap digunakan sebagai bahan laporan dan rapat direksi/atasan.</i>`;

      await sendTelegramMessage(chatId, msg);
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
        await sendTelegramMessage(
          chatId,
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

      await sendTelegramMessage(chatId, msg);
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

      await sendTelegramMessage(chatId, msg);
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

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // Default unknown command
    await sendTelegramMessage(
      chatId,
      `❓ <b>Perintah Tidak Dikenal</b>\nKetik <code>/help</code> untuk melihat daftar perintah yang tersedia.`
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
