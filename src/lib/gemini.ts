import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import {
  getPayrollResultByNik,
  getPayrollResultsByName,
  comparePayrollResults,
  getAllReports,
  updateReport,
  getAllTodos,
  getPayrollResultsByDepartment,
  getPayrollDepartments,
  getPayrollPeriodSummary,
  comparePayrollPeriodSummaries,
  getEmployeeCumulativePayrollSummary,
  getSettings,
} from './db';
import { ActionStatus } from './types';
import { angkaKeTerbilang, formatTerbilang } from './terbilang';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Definisi Tools untuk Gemini
const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'cek_gaji_pegawai',
    description:
      'Mencari data rincian gaji pegawai (gaji pokok, lembur, 92 tunjangan, potongan BPJS/TGR/Pajak, Take Home Pay) berdasarkan NRP atau Nama Pegawai.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'NRP (contoh: 19770419494) atau Nama Pegawai (contoh: Nuryadi)',
        },
        periode: {
          type: Type.STRING,
          description: 'Periode gaji opsional (contoh: 2026-09 atau Oktober 2026)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'komparasi_gaji_pegawai',
    description:
      'Menganalisis selisih kenaikan atau penurunan gaji seorang pegawai antar-bulan (bulan ini vs bulan sebelumnya) per komponen tunjangan, lembur, dan potongan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nrp: {
          type: Type.STRING,
          description: 'NRP pegawai (contoh: 19770419494)',
        },
        periode1: {
          type: Type.STRING,
          description: 'Periode lama (opsional)',
        },
        periode2: {
          type: Type.STRING,
          description: 'Periode baru (opsional)',
        },
      },
      required: ['nrp'],
    },
  },
  {
    name: 'rekap_laporan_kendala',
    description:
      'Mengecek status tiket kendala payroll yang dilaporkan pegawai atau PIC (misal: jumlah tiket OPEN, tiket URGENT, kendala lembur, atau riwayat tiket).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Status tiket: OPEN, CROSSCHECK, CLOSE, atau ALL (default ALL)',
        },
        kategori: {
          type: Type.STRING,
          description: 'Kategori kendala opsional (contoh: LEMBUR, KOREKSI_GAJI, SLIP_GAJI, BPJS)',
        },
      },
    },
  },
  {
    name: 'rekap_todo_asisten',
    description: 'Melihat agenda to-do list tugas harian PIC Payroll yang aktif atau belum selesai.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'rekap_project_payroll',
    description:
      'Melihat total headcount (jumlah pegawai), total take home pay, dan total lembur di suatu project/divisi.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nama_project: {
          type: Type.STRING,
          description: 'Nama atau kata kunci project (contoh: Koja, Priok, Bitung, Jasa, dll)',
        },
        periode: {
          type: Type.STRING,
          description: 'Periode gaji opsional',
        },
      },
      required: ['nama_project'],
    },
  },
  {
    name: 'komparasi_makro_perusahaan',
    description:
      'Melihat perbandingan beban total payroll perusahaan PT Pelindo Daya Sejahtera antara 2 bulan untuk keperluan rapat manajemen/direksi.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        periode1: {
          type: Type.STRING,
          description: 'Bulan pertama (contoh: 2026-08)',
        },
        periode2: {
          type: Type.STRING,
          description: 'Bulan kedua (contoh: 2026-09)',
        },
      },
      required: ['periode1', 'periode2'],
    },
  },
  {
    name: 'update_status_tiket',
    description:
      'Mengubah status tiket kendala payroll (misal dari OPEN menjadi CROSSCHECK atau CLOSE). Bisa untuk tiket tertentu (sebutkan nomor tiket atau nama pegawai) atau sekaligus untuk SEMUA tiket yang saat ini OPEN.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: {
          type: Type.STRING,
          description:
            'Nomor tiket (contoh PR-202610-001), nama pegawai, atau kata "SEMUA" jika ingin mengubah semua tiket yang statusnya OPEN.',
        },
        status_baru: {
          type: Type.STRING,
          description: 'Status tujuan baru: CROSSCHECK, CLOSE, atau OPEN (huruf besar)',
        },
        status_asal: {
          type: Type.STRING,
          description: 'Status awal tiket yang ingin diubah (default: OPEN)',
        },
        catatan: {
          type: Type.STRING,
          description: 'Catatan resolusi atau alasan perubahan status (opsional)',
        },
      },
      required: ['status_baru'],
    },
  },
  {
    name: 'rekap_gaji_kumulatif_pegawai',
    description:
      'Merekap pendapatan gaji seorang pegawai untuk beberapa bulan (misal Januari s/d Oktober atau tahun berjalan). Catatan: Upah lembur dimasukkan sebagai bagian dari kelompok Tunjangan. Defaultnya: tampilkan ringkasan TOTAL saja di chat (Total THP, Total Gaji Pokok, Total Tunjangan, Total Potongan, dan Rata-rata per bulan) agar ringkas dan cepat dibaca. Jika diminta rincian komponen, baru sertakan breakdown tunjangan dan potongannya.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'NRP atau Nama Pegawai (contoh: 19770419494 atau Ahmad Maulana)',
        },
        periode_mulai: {
          type: Type.STRING,
          description: 'Periode awal opsional (contoh: 2026-01)',
        },
        periode_selesai: {
          type: Type.STRING,
          description: 'Periode akhir opsional (contoh: 2026-10)',
        },
        minta_rincian_komponen: {
          type: Type.BOOLEAN,
          description:
            'True jika pengguna secara khusus meminta rincian per komponen tunjangan/potongan, false jika hanya minta total/ringkasan (default: false)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'export_excel_rekap_pegawai',
    description:
      'Membuatkan dan memberikan link download file Excel (.xlsx) rekapitulasi gaji per komponen bulanan (Januari s.d. Oktober) saat pengguna meminta dibuatkan file Excel.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'NRP atau Nama Pegawai (contoh: 19770419494 atau Ahmad Maulana)',
        },
        periode_mulai: {
          type: Type.STRING,
          description: 'Periode awal opsional (contoh: 2026-01)',
        },
        periode_selesai: {
          type: Type.STRING,
          description: 'Periode akhir opsional (contoh: 2026-10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'konversi_terbilang',
    description:
      'Mengonversi angka/nominal rupiah menjadi kalimat terbilang resmi Bahasa Indonesia untuk keperluan pembuatan Nota Dinas, Berita Acara, atau Memorandum Keuangan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nominal: {
          type: Type.STRING,
          description: 'Angka nominal yang ingin dikonversi ke kalimat terbilang (contoh: 1450750200 atau 5.750.000)',
        },
      },
      required: ['nominal'],
    },
  },
];

// Eksekutor fungsi faktual dari database
async function executeTool(name: string, args: Record<string, any>): Promise<any> {
  try {
    if (name === 'cek_gaji_pegawai') {
      const q = String(args.query || '').trim();
      const period = args.periode ? String(args.periode) : undefined;
      // Cek apakah query berupa angka (NRP) atau nama
      if (/^\d+$/.test(q)) {
        const result = await getPayrollResultByNik(q, period);
        if (result) return { status: 'found', data: result };
      }
      // Jika bukan angka atau NIK tidak ketemu, cari via nama
      const list = await getPayrollResultsByName(q, period);
      if (list.length > 0) {
        return { status: 'found', data: list.length === 1 ? list[0] : list.slice(0, 3) };
      }
      return { status: 'not_found', message: `Data gaji pegawai '${q}' tidak ditemukan di master payroll.` };
    }

    if (name === 'komparasi_gaji_pegawai') {
      const nrp = String(args.nrp || '').trim();
      const comp = await comparePayrollResults(nrp, args.periode1, args.periode2);
      if (!comp) {
        return { status: 'not_found', message: `Data komparasi pegawai NRP ${nrp} tidak ditemukan.` };
      }
      return {
        status: 'found',
        pegawai: comp.current.employeeName,
        nrp: comp.current.employeeNik,
        project: comp.current.department,
        periode_baru: comp.current.period,
        periode_lama: comp.previous?.period || 'Bulan sebelumnya',
        selisih_thp: comp.diff.takeHomePay,
        selisih_gapok: comp.diff.basicSalary,
        selisih_lembur: comp.diff.overtimeAmount,
        rincian_selisih_tunjangan: comp.diff.allowanceDiffs,
        rincian_selisih_potongan: comp.diff.deductionDiffs,
      };
    }

    if (name === 'rekap_laporan_kendala') {
      const all = await getAllReports();
      const targetStatus = args.status?.toUpperCase() || 'ALL';
      let filtered = all;
      if (targetStatus !== 'ALL') {
        filtered = filtered.filter((r) => r.actionStatus === targetStatus);
      }
      if (args.kategori) {
        const kat = args.kategori.toUpperCase();
        filtered = filtered.filter((r) => r.category.includes(kat));
      }

      return {
        total_tiket_ditemukan: filtered.length,
        ringkasan: filtered.slice(0, 5).map((r) => ({
          ticketNumber: r.ticketNumber,
          nama: r.employeeName,
          project: r.department,
          kategori: r.category,
          status: r.actionStatus,
          prioritas: r.priority,
          estimasi_selisih: r.discrepancyAmount,
          pelapor: r.reportedBy || 'PIC',
          keterangan: r.description,
        })),
      };
    }

    if (name === 'rekap_todo_asisten') {
      const todos = await getAllTodos();
      const active = todos.filter((t) => !t.isCompleted);
      return {
        total_todo_aktif: active.length,
        daftar: active.map((t) => ({
          title: t.title,
          prioritas: t.priority,
          dueDate: t.dueDate || '-',
          relatedTicket: t.relatedTicketNumber || '-',
        })),
      };
    }

    if (name === 'rekap_project_payroll') {
      const searchDept = String(args.nama_project || '').trim();
      const depts = await getPayrollDepartments(searchDept, args.periode);
      if (depts.length === 0) {
        return { status: 'not_found', message: `Project '${searchDept}' tidak ditemukan di database.` };
      }
      const matchedDept = depts[0].department;
      const emps = await getPayrollResultsByDepartment(matchedDept, args.periode);

      let totalThp = 0;
      let totalLembur = 0;
      let totalGapok = 0;
      for (const e of emps) {
        totalThp += e.takeHomePay || 0;
        totalLembur += e.overtimeAmount || 0;
        totalGapok += e.basicSalary || 0;
      }

      return {
        status: 'found',
        project: matchedDept,
        total_pegawai: emps.length,
        total_take_home_pay: totalThp,
        total_lembur: totalLembur,
        total_gaji_pokok: totalGapok,
      };
    }

    if (name === 'komparasi_makro_perusahaan') {
      const comp = await comparePayrollPeriodSummaries(args.periode1, args.periode2);
      if (!comp) {
        return { status: 'not_found', message: 'Data periode tersebut tidak lengkap di database.' };
      }
      return comp;
    }

    if (name === 'update_status_tiket') {
      const all = await getAllReports();
      const rawStatus = String(args.status_baru || 'CROSSCHECK').trim().toUpperCase();
      const statusBaru: ActionStatus =
        rawStatus === 'CLOSE' || rawStatus === 'CLOSED'
          ? 'CLOSE'
          : rawStatus === 'CROSSCHECK'
          ? 'CROSSCHECK'
          : 'OPEN';

      const target = String(args.target || '').trim();
      const statusAsal = String(args.status_asal || 'OPEN').trim().toUpperCase();
      const catatan = args.catatan ? String(args.catatan) : undefined;

      const isSemua =
        !target ||
        target.toUpperCase() === 'SEMUA' ||
        target.toUpperCase() === 'ALL' ||
        target.toUpperCase() === 'SEMUA TIKET' ||
        target.toUpperCase() === 'SEMUANYA';

      if (isSemua) {
        const toUpdate = all.filter((r) => r.actionStatus === statusAsal);
        if (toUpdate.length === 0) {
          return {
            status: 'not_found',
            message: `Tidak ada tiket kendala dengan status '${statusAsal}' yang perlu diubah ke '${statusBaru}'.`,
          };
        }

        const updatedList: string[] = [];
        for (const rep of toUpdate) {
          await updateReport(rep.id, {
            actionStatus: statusBaru,
            ...(catatan ? { resolutionNotes: catatan } : {}),
          });
          updatedList.push(`${rep.ticketNumber} (${rep.employeeName})`);
        }

        return {
          status: 'success',
          jumlah_diupdate: updatedList.length,
          status_sebelumnya: statusAsal,
          status_baru: statusBaru,
          tiket_terupdate: updatedList,
        };
      }

      // Cari tiket spesifik berdasarkan Nomor Tiket atau Nama Pegawai
      const matched = all.filter((r) => {
        const ticketMatch = r.ticketNumber.toLowerCase().includes(target.toLowerCase());
        const nameMatch = r.employeeName.toLowerCase().includes(target.toLowerCase());
        return ticketMatch || nameMatch;
      });

      if (matched.length === 0) {
        return {
          status: 'not_found',
          message: `Tiket dengan kata kunci '${target}' tidak ditemukan di sistem.`,
        };
      }

      const updatedList: string[] = [];
      for (const rep of matched) {
        await updateReport(rep.id, {
          actionStatus: statusBaru,
          ...(catatan ? { resolutionNotes: catatan } : {}),
        });
        updatedList.push(`${rep.ticketNumber} (${rep.employeeName})`);
      }

      return {
        status: 'success',
        jumlah_diupdate: updatedList.length,
        status_baru: statusBaru,
        tiket_terupdate: updatedList,
      };
    }

    if (name === 'rekap_gaji_kumulatif_pegawai') {
      const q = String(args.query || '').trim();
      const start = args.periode_mulai ? String(args.periode_mulai).trim() : undefined;
      const end = args.periode_selesai ? String(args.periode_selesai).trim() : undefined;
      const mintaRincian = Boolean(args.minta_rincian_komponen);

      const summary = await getEmployeeCumulativePayrollSummary(q, start, end);
      if (!summary) {
        return {
          status: 'not_found',
          message: `Data rekapitulasi gaji untuk '${q}' tidak ditemukan dalam database.`,
        };
      }

      const startP = summary.periods[0] || '';
      const endP = summary.periods[summary.periods.length - 1] || '';
      const downloadExcelUrl = `/api/payroll-results/export-ytd?query=${encodeURIComponent(summary.employeeNik)}&start=${encodeURIComponent(startP)}&end=${encodeURIComponent(endP)}`;

      // Sesuai permintaan Pak Pampam: Upah lembur dimasukkan ke kelompok Tunjangan.
      // Default: Tampilkan ringkasan TOTAL saja di chat agar cepat & ringkas dibaca.
      const ringkasan = {
        employeeName: summary.employeeName,
        employeeNik: summary.employeeNik,
        departmentTerakhir: summary.department,
        jabatanTerakhir: summary.positionTitle || '-',
        hasMutation: summary.hasMutation || false,
        riwayatProject: summary.uniqueDepartments || [summary.department],
        riwayatJabatan: summary.uniquePositions || [summary.positionTitle || '-'],
        catatanMutasi: summary.hasMutation
          ? `Pegawai mengalami perpindahan project/jabatan: Project (${(summary.uniqueDepartments || []).join(' -> ')}), Jabatan (${(summary.uniquePositions || []).join(' -> ')})`
          : 'Cost center dan jabatan tetap sepanjang periode',
        rentangPeriode: `${startP} s/d ${endP}`,
        jumlahBulan: summary.totalMonths,
        daftarBulan: summary.periods,
        totalGross: summary.totalGrossSalary,
        totalGajiPokok: summary.totalBasicSalary,
        totalTunjangan: summary.totalAllowances, // sudah include upah lembur
        totalUpahLembur: summary.totalOvertime, // info tambahan jika ingin tahu porsi lemburnya
        totalPotongan: summary.totalDeductions,
        totalTakeHomePay: summary.totalTakeHomePay,
        rataRataThpBulanan: summary.averageTakeHomePay,
        linkDownloadExcel: downloadExcelUrl,
      };

      if (mintaRincian) {
        return {
          status: 'success',
          mode: 'detail_komponen',
          ringkasan,
          rincianTunjangan: summary.allowanceItemTotals,
          rincianPotongan: summary.deductionItemTotals,
          perBulan: summary.monthlyBreakdown.map((m) => ({
            periode: m.period,
            department: m.department,
            jabatan: m.positionTitle,
            gajiPokok: m.basicSalary,
            tunjangan: m.allowances, // include lembur
            lembur: m.overtime,
            potongan: m.deductions,
            thp: m.takeHomePay,
          })),
        };
      }

      return {
        status: 'success',
        mode: 'ringkasan_total',
        ringkasan,
        catatan:
          'Data kumulatif dihitung. Tampilkan TOTAL saja di chat (THP, Gaji Pokok, Tunjangan termasuk lembur, Potongan, & Rata-rata per bulan). Informasikan bahwa file Excel detail per komponen siap digenerate jika dibutuhkan.',
      };
    }

    if (name === 'export_excel_rekap_pegawai') {
      const q = String(args.query || '').trim();
      const start = args.periode_mulai ? String(args.periode_mulai).trim() : undefined;
      const end = args.periode_selesai ? String(args.periode_selesai).trim() : undefined;

      const summary = await getEmployeeCumulativePayrollSummary(q, start, end);
      if (!summary) {
        return {
          status: 'not_found',
          message: `Data rekapitulasi gaji untuk '${q}' tidak ditemukan dalam database.`,
        };
      }

      const startP = summary.periods[0] || '';
      const endP = summary.periods[summary.periods.length - 1] || '';
      const downloadUrl = `/api/payroll-results/export-ytd?query=${encodeURIComponent(summary.employeeNik)}&start=${encodeURIComponent(startP)}&end=${encodeURIComponent(endP)}`;

      return {
        status: 'success',
        pegawai: {
          nama: summary.employeeName,
          nrp: summary.employeeNik,
          departemen: summary.department,
          jabatan: summary.positionTitle || '-',
        },
        rentangPeriode: `${startP} s/d ${endP}`,
        jumlahBulan: summary.totalMonths,
        totalTakeHomePay: summary.totalTakeHomePay,
        downloadUrl,
        downloadLinkHtml: `<a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">📥 <b>Download Excel Rekap Gaji (${summary.employeeName})</b></a>`,
        pesan: `File Excel rekapitulasi gaji per komponen untuk ${summary.employeeName} periode ${startP} s/d ${endP} berhasil disiapkan.`,
      };
    }

    if (name === 'konversi_terbilang') {
      const rawNominal = String(args.nominal || '').trim();
      const clean = rawNominal.replace(/[^0-9]/g, '');
      if (!clean) {
        return { status: 'error', message: 'Nominal angka tidak valid atau kosong.' };
      }
      const terbilangTitle = formatTerbilang(angkaKeTerbilang(clean), 'TITLE');
      const terbilangUpper = formatTerbilang(angkaKeTerbilang(clean), 'UPPER');
      const formattedRupiah = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(Number(clean));
      const templateNotaDinas = `Rp ${new Intl.NumberFormat('id-ID').format(Number(clean))},- (${terbilangTitle})`;

      return {
        status: 'success',
        nominalAngka: clean,
        formatRupiah: formattedRupiah,
        terbilangTitleCase: terbilangTitle,
        terbilangUppercase: terbilangUpper,
        templateNotaDinas,
      };
    }

    return { error: `Tool ${name} tidak dikenali.` };
  } catch (err: any) {
    return { error: err.message || 'Gagal menjalankan tool database.' };
  }
}

/**
 * Memproses pertanyaan teks bebas dari user menggunakan Google Gemini dengan Tool Execution
 */
export async function askPayrollAI(userMessage: string): Promise<string> {
  if (!apiKey) {
    return (
      `⚠️ <b>Kunci API Gemini Belum Dikonfigurasi</b>\n\n` +
      `Fitur AI Natural Language Query siap digunakan, namun Anda belum menyetel <code>GEMINI_API_KEY</code> di file <code>.env.local</code>.\n\n` +
      `💡 <b>Cara Mendapatkan API Key Gratis:</b>\n` +
      `1. Kunjungi: https://aistudio.google.com/app/apikey\n` +
      `2. Buat API key baru (gratis).\n` +
      `3. Tambahkan ke file <code>.env.local</code>:\n` +
      `   <code>GEMINI_API_KEY=AIzaSy...</code>\n\n` +
      `Setelah itu Anda bisa langsung mengobrol bebas dengan bot!`
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const settings = await getSettings();

  const systemInstruction = `Anda adalah "Si PALI" (Payroll Assistant / Asisten Intelijen Payroll) pribadi untuk Pak Pampam (PIC Payroll PT Pelindo Daya Sejahtera - PDS).
Perusahaan: ${settings.companyName}
Periode Aktif: ${settings.activePeriod}

Karakter & Gaya Komunikasi:
- Anda bernama Si PALI. Sapa Pak Pampam dengan ramah, antusias, profesional, ringkas, dan jelas dalam bahasa Indonesia.
- Selalu format angka rupiah dengan format rapi (contoh: Rp 5.729.876).
- Format output pesan Telegram menggunakan tag HTML seperti <b>tebal</b>, <i>miring</i>, dan <code>kode/angka</code>.
- JANGAN PERNAH mengarang angka gaji atau data tiket. Jika ditanya soal angka gaji, jumlah orang, selisih, atau tiket kendala, ANDA HARUS memanggil tools yang disediakan untuk mengambil data faktual dari database.
- Jika pengguna meminta mengubah status tiket (contoh: "ubah tiket ini jadi crosscheck", "jadikan close", "update semua tiket open jadi crosscheck"), PANGGIL tool update_status_tiket dan laporkan hasilnya secara jelas (tiket mana saja yang berhasil diubah dan status barunya apa).
- Jika hasil query tidak ditemukan, sampaikan secara sopan dan sarankan cara pencarian lain (misal periksa ejaan nama atau NRP).

Aturan Khusus Rekap Pendapatan Multi-Bulan & Excel:
1. Komponen Upah Lembur BUKAN lembur terpisah, melainkan komponen penggajian bulanan yang dikategorikan ke dalam Tunjangan.
2. Ketika pengguna meminta rekap gaji beberapa bulan (misal Jan - Okt): Secara DEFAULT di chat, tampilkan ringkasan TOTAL saja (Total Take Home Pay, Total Gaji Pokok, Total Tunjangan [termasuk lembur], Total Potongan, serta Rata-rata THP per bulan) agar ringkas dan cepat dibaca oleh Pak Pampam.
3. Selalu tawarkan atau sertakan link jika Pak Pampam membutuhkan file Excel detail matriks per komponen bulanan.
4. Jika pengguna secara eksplisit meminta file Excel (misal: "buatkan excel rekap gaji pegawai X", "export excel rekap"), PANGGIL tool export_excel_rekap_pegawai dan sertakan link unduh HTML dalam jawaban Anda.
5. Tools Pemecah File Excel HRIS (Batch Splitter): Aplikasi memiliki halaman khusus di "/tools/excel-splitter" untuk memotong file master payroll (hingga 100.000+ baris) menjadi pecahan per 1.000 baris secara offline di laptop tanpa merusak format tanggal dd/mm/yyyy atau teks NIK. Jika Pak Pampam bertanya tentang pemecahan file Excel untuk HRIS baru, berikan panduan singkat dan sertakan tautan ke <a href="/tools/excel-splitter">✂️ Buka Pemecah File Excel HRIS</a>.
6. Kalkulator Terbilang Nota Dinas: Jika pengguna bertanya tentang ejaan kalimat terbilang dari suatu nominal atau pembuatan kalimat nota dinas/kwitansi, PANGGIL tool konversi_terbilang dan berikan kalimat terbilang Title Case beserta format lengkap nota dinas siap pakai.`;

  try {
    // Primary model: gemini-3.5-flash-lite (kecepatan tinggi & kuota free tier besar)
    const modelName = 'gemini-3.5-flash-lite';

    // Step 1: Panggil model dengan tools
    const response = await ai.models.generateContent({
      model: modelName,
      contents: userMessage,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    // Step 2: Cek apakah model meminta pemanggilan tool
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name) {
        const toolResult = await executeTool(call.name, (call.args || {}) as Record<string, any>);
        const modelParts = response.candidates?.[0]?.content?.parts || [{ functionCall: call }];

        // Step 3: Kirim balik hasil tool ke Gemini untuk diformulasikan menjadi jawaban ramah
        const secondResponse = await ai.models.generateContent({
          model: modelName,
          contents: [
            { role: 'user', parts: [{ text: userMessage }] },
            { role: 'model', parts: modelParts as any },
            {
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: { result: toolResult },
                  },
                },
              ],
            },
          ],
          config: {
            systemInstruction,
          },
        });

        return secondResponse.text || 'Maaf Pak, saya tidak dapat merumuskan jawaban saat ini.';
      }
    }

    return response.text || 'Maaf Pak, saya belum memahami pertanyaan tersebut.';
  } catch (error: any) {
    console.error('Gemini AI Query Error:', error);

    // Fallback jika model lite terkena rate-limit, coba gemini-3.5-flash
    if (error.message?.includes('429') || error.status === 429) {
      try {
        const fallbackAi = new GoogleGenAI({ apiKey });
        const res = await fallbackAi.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userMessage,
          config: {
            systemInstruction,
          },
        });
        return res.text || 'Maaf Pak, terjadi kendala saat memproses jawaban.';
      } catch (fallbackErr: any) {
        return `⚠️ Kuota rate limit API tercapai. Silakan coba kembali beberapa saat lagi. (${fallbackErr.message})`;
      }
    }

    return `⚠️ Maaf Pak, terjadi kesalahan saat menghubungi asisten AI: ${error.message}`;
  }
}
