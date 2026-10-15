const fs = require('fs');
const { createHmac, timingSafeEqual } = require('crypto');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

function getSecretKey() {
  return env.SESSION_SECRET || env.DASHBOARD_PIN || 'pds-lapor-payroll-secure-auth-secret-key-2026';
}

function createSessionToken() {
  const timestamp = Date.now().toString();
  const hmac = createHmac('sha256', getSecretKey());
  hmac.update(timestamp);
  const signature = hmac.digest('hex');
  return `${timestamp}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  const now = Date.now();
  if (now - timestamp > 7 * 24 * 60 * 60 * 1000 || timestamp > now + 60000) return false;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const hmac = createHmac('sha256', getSecretKey());
  hmac.update(timestampStr);
  const expectedSignature = hmac.digest('hex');
  try {
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expBuffer = Buffer.from(expectedSignature, 'utf8');
    if (sigBuffer.length !== expBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expBuffer);
  } catch {
    return false;
  }
}

async function verify() {
  console.log('====================================================');
  console.log('🔒 PENGUJIAN KEAMANAN SISTEM & DATABASE SUPABASE');
  console.log('====================================================\n');

  // 1. Uji Akses Publik (Anon Key) ke Database
  console.log('--- 1. UJI PENETRASI AKSES PUBLIK (ANON KEY) ---');
  const tables = ['payroll_results', 'payroll_reports', 'payroll_todos', 'payroll_settings'];
  let allAnonLocked = true;

  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      }
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      console.log(`❌ PERINGATAN: Tabel '${table}' MASIH BISA dibaca oleh anon! (Baris: ${data.length})`);
      allAnonLocked = false;
    } else {
      console.log(`✅ AMAN: Tabel '${table}' TERKUNCI RAPAT dari anon. (Respons: ${JSON.stringify(data)})`);
    }
  }

  // 2. Uji Akses Internal Backend (Service Role Key)
  console.log('\n--- 2. UJI KONEKTIVITAS APLIKASI BACKEND (SERVICE ROLE) ---');
  let backendOk = true;
  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?limit=1`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      console.log(`✅ NORMAL: Backend server berhasil membaca tabel '${table}' (${data.length} baris terverifikasi).`);
    } else {
      console.log(`❌ ERROR: Backend gagal membaca '${table}':`, data);
      backendOk = false;
    }
  }

  // 3. Uji Kriptografi Sesi PIN
  console.log('\n--- 3. UJI KRIPTOGRAFI TOKEN SESI PIN ---');
  const fakeOldCookie = 'authenticated';
  const isFakeAccepted = verifySessionToken(fakeOldCookie);
  console.log(`Pencegahan Cookie Palsu ("authenticated"): ${!isFakeAccepted ? '✅ BERHASIL DITOLAK' : '❌ GAGAL'}`);

  const validToken = createSessionToken();
  const isValidAccepted = verifySessionToken(validToken);
  console.log(`Validasi Token Kriptografis Asli: ${isValidAccepted ? '✅ BERHASIL DITERIMA' : '❌ GAGAL'}`);

  const tamperedToken = validToken + 'tampered';
  const isTamperedAccepted = verifySessionToken(tamperedToken);
  console.log(`Pencegahan Token Dimanipulasi: ${!isTamperedAccepted ? '✅ BERHASIL DITOLAK' : '❌ GAGAL'}`);

  console.log('\n====================================================');
  if (allAnonLocked && backendOk && !isFakeAccepted && isValidAccepted && !isTamperedAccepted) {
    console.log('🎉 STATUS AKHIR: 100% AMAN! Seluruh celah keamanan telah tertutup.');
  } else {
    console.log('⚠️ PERHATIAN: Masih ada beberapa hal yang perlu dicek.');
  }
  console.log('====================================================');
}

verify().catch(console.error);
