const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Baca environment Supabase
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL atau Key tidak ditemukan di .env.local!');
  process.exit(1);
}

// Helper parser yang telah diperbaiki
function parsePayrollFile(filePath, period) {
  console.log(`\n======================================================`);
  console.log(`Membaca file untuk Periode ${period}:`);
  console.log(`Path: ${filePath}`);

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (aoa.length === 0) {
    console.warn(`File ${filePath} kosong!`);
    return [];
  }

  // Cari baris header utama (bisa row 0, 1, 2) berdasarkan bobot identitas pegawai & upah
  let headerRowIdx = 0;
  let maxScore = -1;
  for (let r = 0; r < Math.min(10, aoa.length); r++) {
    const row = aoa[r] || [];
    let score = 0;
    const hasId = row.some((c) => {
      const s = String(c || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return s === 'nrp' || s === 'nik' || s === 'employeenumber' || s === 'nopeg' || s === 'nip' || s === 'pegawaiid';
    });
    const hasName = row.some((c) => {
      const s = String(c || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return s === 'employee' || s === 'nama' || s === 'namalengkap' || s === 'employeename';
    });
    const hasSalary = row.some((c) => {
      const s = String(c || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return s.includes('upahpokok') || s.includes('gajipokok') || s.includes('jumlahkotor');
    });

    if (hasId) score += 10;
    if (hasName) score += 5;
    if (hasSalary) score += 5;

    if (score > maxScore) {
      maxScore = score;
      headerRowIdx = r;
    }
  }

  // Susun header kolom yang bersih
  const headerRowsToInspect = aoa.slice(0, headerRowIdx + 1);
  const maxCols = Math.max(...headerRowsToInspect.map((r) => r.length), 0);
  const resolvedHeaders = [];

  for (let c = 0; c < maxCols; c++) {
    let chosen = '';
    for (let r = headerRowIdx; r >= 0; r--) {
      const cellVal = String(aoa[r]?.[c] || '').trim();
      if (
        cellVal &&
        !cellVal.toLowerCase().startsWith('allowance') &&
        !cellVal.toLowerCase().startsWith('deduction') &&
        !cellVal.toLowerCase().startsWith('contribution')
      ) {
        chosen = cellVal;
        break;
      }
    }
    if (!chosen) {
      for (let r = headerRowIdx; r >= 0; r--) {
        const cellVal = String(aoa[r]?.[c] || '').trim();
        if (cellVal) {
          chosen = cellVal;
          break;
        }
      }
    }
    resolvedHeaders.push(chosen || `COL_${c}`);
  }

  const parseNum = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const nonAllowanceCols = [
    'nrp', 'nik', 'employee', 'nama', 'status', 'job formation', 'cost center',
    'upah pokok', 'jumlah kotor', 'jumlah potongan', 'grand total', 'biaya pengelolaan',
    'management fee', 'total', 'thp', 'take home pay', 'employee number', 'unit', 'regional',
    'job class', 'doc no', 'ext no', 'account no', 'account name', 'bank', 'payroll result id',
    'payroll doc no', 'payroll pay date', 'payroll period id', 'payroll type'
  ];

  const dataRows = aoa.slice(headerRowIdx + 1);
  const results = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    const cleanRow = {};
    resolvedHeaders.forEach((header, colIdx) => {
      const rawVal = row[colIdx];
      const trimmedHeader = header.trim();
      if (!trimmedHeader) return;

      const numVal = parseNum(rawVal);
      const existing = cleanRow[trimmedHeader];

      if (existing !== undefined) {
        const existingNum = parseNum(existing);
        if (numVal > 0 && existingNum > 0) {
          cleanRow[trimmedHeader] = existingNum + numVal;
        } else if (numVal > 0 && existingNum === 0) {
          cleanRow[trimmedHeader] = rawVal;
        }
      } else {
        cleanRow[trimmedHeader] = rawVal;
      }
    });

    const keys = Object.keys(cleanRow);
    const getVal = (possibleNames) => {
      // 1. Prioritaskan exact match sesuai urutan preferensi possibleNames
      for (const name of possibleNames) {
        const normN = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const exactKey = keys.find((k) => {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normK === normN;
        });
        if (exactKey && cleanRow[exactKey] !== undefined && String(cleanRow[exactKey]).trim() !== '') {
          return cleanRow[exactKey];
        }
      }

      // 2. Word boundary match sesuai urutan preferensi possibleNames
      for (const name of possibleNames) {
        const normN = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const boundaryKey = keys.find((k) => {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normK.startsWith(normN) || normK.endsWith(normN);
        });
        if (boundaryKey && cleanRow[boundaryKey] !== undefined && String(cleanRow[boundaryKey]).trim() !== '') {
          return cleanRow[boundaryKey];
        }
      }

      return '';
    };

    const nik = String(getVal(['nrp', 'nik', 'nopeg', 'nip', 'pegawai_id', 'employee number', 'employeenumber']) || '').trim();
    const name = String(getVal(['employee', 'nama', 'name', 'nama_lengkap', 'pegawai']) || '').trim();
    const status = String(getVal(['status']) || '').trim();
    const dept = String(getVal(['cost center', 'costcenter', 'project', 'departemen', 'unit', 'divisi']) || '').trim();
    const pos = String(getVal(['job formation', 'jobformation', 'jabatan', 'position']) || '').trim();

    const basic = parseNum(getVal(['upah pokok', 'upahpokok', 'gaji pokok', 'gajipokok', 'gapok', 'pokok', 'basic']));
    const gross = parseNum(getVal(['jumlah kotor', 'jumlahkotor', 'total kotor', 'gross salary']));
    const totalDeductCol = parseNum(getVal(['jumlah potongan', 'jumlahpotongan', 'total potongan', 'totalpotongan']));

    const allowanceDetails = {};
    const deductionDetails = {};
    let overtimeAmount = 0;
    let deductionsBpjs = 0;
    let deductionsTgr = 0;
    let deductionsOther = 0;

    for (const rawCol of keys) {
      const valNum = parseNum(cleanRow[rawCol]);
      const lowerCol = rawCol.toLowerCase();

      // Skip unlabeled columns (e.g. COL_0, COL_100, __EMPTY)
      if (lowerCol.startsWith('col_') || lowerCol.startsWith('__empty')) {
        continue;
      }

      // Skip standard identity and summary columns
      if (
        nonAllowanceCols.some((sc) => lowerCol === sc || lowerCol.replace(/\s+/g, '') === sc.replace(/\s+/g, '')) ||
        lowerCol.includes('jumlah kotor') ||
        lowerCol.includes('jumlah diterima') ||
        lowerCol.includes('jumlah potongan') ||
        lowerCol.includes('total potongan') ||
        lowerCol.includes('grand total') ||
        lowerCol.includes('take home pay') ||
        lowerCol.includes('humanis') ||
        lowerCol.includes('cek') ||
        lowerCol.includes('check')
      ) {
        continue;
      }

      if (lowerCol.includes('contribution') || lowerCol.includes('management fee') || lowerCol.includes('biaya pengelolaan')) {
        continue;
      }
      if (lowerCol.includes('lembur')) {
        if (valNum > 0) {
          overtimeAmount += valNum;
          allowanceDetails[rawCol] = valNum;
        }
        continue;
      }
      if (
        lowerCol.includes('potongan') ||
        lowerCol.includes('jaminan') ||
        lowerCol.includes('bpjs') ||
        lowerCol.includes('hutang') ||
        lowerCol.includes('iuran') ||
        lowerCol.includes('simpanan') ||
        lowerCol.includes('dplk')
      ) {
        if (valNum > 0) {
          deductionDetails[rawCol] = valNum;
          if (lowerCol.includes('jaminan') || lowerCol.includes('bpjs')) {
            deductionsBpjs += valNum;
          } else if (lowerCol.includes('ganti rugi') || lowerCol.includes('tgr')) {
            deductionsTgr += valNum;
          } else {
            deductionsOther += valNum;
          }
        }
        continue;
      }
      if (valNum > 0) {
        allowanceDetails[rawCol] = valNum;
      }
    }

    const totalAllowances = Object.values(allowanceDetails).reduce((acc, curr) => acc + curr, 0);
    const sumDeductions = Object.values(deductionDetails).reduce((acc, curr) => acc + curr, 0);
    const totalDeductions = totalDeductCol > 0 ? totalDeductCol : sumDeductions;
    const grossSalary = gross > 0 ? gross : (basic + totalAllowances);
    const takeHomePay = grossSalary - totalDeductions;

    if (nik && nik !== 'NON-NRP') {
      results.push({
        period,
        employee_nik: nik,
        employee_name: name || 'Tanpa Nama',
        status: status || null,
        department: dept || null,
        position_title: pos || null,
        basic_salary: basic,
        allowances: totalAllowances,
        overtime_amount: overtimeAmount,
        gross_salary: grossSalary,
        deductions_bpjs: deductionsBpjs,
        deductions_tgr: deductionsTgr,
        deductions_other: deductionsOther,
        total_deductions: totalDeductions,
        take_home_pay: takeHomePay,
        allowance_details: allowanceDetails,
        deduction_details: deductionDetails,
      });
    }
  }

  console.log(`Selesai parsing: ${results.length.toLocaleString('id-ID')} baris data valid.`);
  return results;
}

// Helper kirim chunk dengan retry dan fallback split jika timeout
async function sendChunkWithRetry(chunk, maxRetries = 3) {
  const endpoint = `${supabaseUrl}/rest/v1/payroll_results?on_conflict=period,employee_nik`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status} ${errText}`);
      }
      return;
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      } else {
        // Jika masih timeout/gagal, pecah chunk jadi 2 bagian yang lebih kecil
        if (chunk.length > 100) {
          const mid = Math.floor(chunk.length / 2);
          await sendChunkWithRetry(chunk.slice(0, mid));
          await sendChunkWithRetry(chunk.slice(mid));
          return;
        }
        throw err;
      }
    }
  }
}

// Fungsi batch upsert ke Supabase
async function uploadBatchToSupabase(rows) {
  const BATCH_SIZE = 300;
  const total = rows.length;
  let uploaded = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await sendChunkWithRetry(chunk);
    uploaded += chunk.length;
    process.stdout.write(`  -> Tersimpan ${uploaded.toLocaleString('id-ID')} / ${total.toLocaleString('id-ID')} baris...\r`);
  }
  console.log(`\n  ✅ Sukses meng-update seluruh ${total.toLocaleString('id-ID')} data ke Supabase!`);
}

// Seluruh 9 periode (Januari s.d. September 2026)
const periodConfigs = [
  { period: '2026-01', file: 'C:/Users/stypm/Downloads/Payroll Result All/!!! Payroll Result Januari 2026 All.xlsx' },
  { period: '2026-02', file: 'C:/Users/stypm/Downloads/Payroll Result All/!!! Payroll Result Februari 2026 All.xlsx' },
  { period: '2026-03', file: 'C:/Users/stypm/Downloads/Payroll Result All/Payroll Result Maret All.xlsx' },
  { period: '2026-04', file: 'C:/Users/stypm/Downloads/Payroll Result All/!!! Payroll Result April 2026 All.xlsx' },
  { period: '2026-05', file: 'C:/Users/stypm/Downloads/Payroll Result All/!Payroll Result All Mei 2026.xlsx' },
  { period: '2026-06', file: 'C:/Users/stypm/Downloads/Payroll Result All/!Payroll Result All Juni.xlsx' },
  { period: '2026-07', file: 'C:/Users/stypm/Downloads/Payroll Result All/Payroll Result All Juli 2026.xlsx' },
  { period: '2026-08', file: 'C:/Users/stypm/Downloads/Payroll Result All/Payroll Result All Agustus 2026.xlsx' },
  { period: '2026-09', file: 'C:/Users/stypm/Downloads/test_upload_payroll_result_september.xlsx' }
];

async function main() {
  console.log(`Memulai proses update & reparasi data payroll untuk 9 periode...`);
  const startTime = Date.now();

  for (const item of periodConfigs) {
    if (!fs.existsSync(item.file)) {
      console.error(`File tidak ditemukan: ${item.file}`);
      continue;
    }
    const rows = parsePayrollFile(item.file, item.period);
    if (rows.length > 0) {
      await uploadBatchToSupabase(rows);
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Seluruh 9 periode berhasil diperbarui dalam ${durationSec} detik!`);

  // Verifikasi hasil untuk pegawai 19940405437
  console.log(`\nMemverifikasi data Pegawai NRP 19940405437 di Supabase...`);
  const verifyRes = await fetch(
    `${supabaseUrl}/rest/v1/payroll_results?employee_nik=eq.19940405437&select=period,employee_name,basic_salary,allowances,gross_salary,take_home_pay,allowance_details&order=period.asc`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );
  const verifyData = await verifyRes.json();
  console.log(JSON.stringify(verifyData, null, 2));

  // Verifikasi cost center pegawai 19900901877 (MUHAMMAD SYAPRI)
  console.log(`\nMemverifikasi Cost Center Pegawai NRP 19900901877 (MUHAMMAD SYAPRI)...`);
  const verifySyapriRes = await fetch(
    `${supabaseUrl}/rest/v1/payroll_results?employee_nik=eq.19900901877&select=period,employee_nik,employee_name,department,position_title&order=period.asc`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );
  const verifySyapriData = await verifySyapriRes.json();
  console.log(JSON.stringify(verifySyapriData, null, 2));
}

main().catch((err) => {
  console.error('\nTerjadi kesalahan fatal:', err);
  process.exit(1);
});
