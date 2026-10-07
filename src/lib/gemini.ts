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
  getSettings,
} from './db';
import { ActionStatus } from './types';

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

  const systemInstruction = `Anda adalah "Asisten Intelijen Payroll" pribadi untuk Pak Pampam (PIC Payroll PT Pelindo Daya Sejahtera - PDS).
Perusahaan: ${settings.companyName}
Periode Aktif: ${settings.activePeriod}

Karakter & Gaya Komunikasi:
- Ramah, profesional, ringkas, dan jelas dalam bahasa Indonesia.
- Selalu format angka rupiah dengan format rapi (contoh: Rp 5.729.876).
- Format output pesan Telegram menggunakan tag HTML seperti <b>tebal</b>, <i>miring</i>, dan <code>kode/angka</code>.
- JANGAN PERNAH mengarang angka gaji atau data tiket. Jika ditanya soal angka gaji, jumlah orang, selisih, atau tiket kendala, ANDA HARUS memanggil tools yang disediakan untuk mengambil data faktual dari database.
- Jika pengguna meminta mengubah status tiket (contoh: "ubah tiket ini jadi crosscheck", "jadikan close", "update semua tiket open jadi crosscheck"), PANGGIL tool update_status_tiket dan laporkan hasilnya secara jelas (tiket mana saja yang berhasil diubah dan status barunya apa).
- Jika hasil query tidak ditemukan, sampaikan secara sopan dan sarankan cara pencarian lain (misal periksa ejaan nama atau NRP).`;

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
