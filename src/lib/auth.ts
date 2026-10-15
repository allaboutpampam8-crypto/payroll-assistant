import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari masa berlaku sesi

function getSecretKey(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.DASHBOARD_PIN ||
    'pds-lapor-payroll-secure-auth-secret-key-2026'
  );
}

/**
 * Membuat token sesi terenkripsi berbasis timestamp dan HMAC-SHA256
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac('sha256', getSecretKey());
  hmac.update(timestamp);
  const signature = hmac.digest('hex');
  return `${timestamp}.${signature}`;
}

/**
 * Memvalidasi keaslian tanda tangan token sesi kriptografi dan masa berlakunya.
 * Aman dari pemalsuan token statis dan timing attacks.
 */
export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  // Tidak boleh expired (maks 7 hari) dan tidak boleh dari masa depan (> 1 menit)
  if (now - timestamp > SESSION_MAX_AGE_MS || timestamp > now + 60 * 1000) {
    return false;
  }

  // Format tanda tangan SHA-256 hex harus tepat 64 karakter heksadesimal
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  // Hitung ulang tanda tangan
  const hmac = createHmac('sha256', getSecretKey());
  hmac.update(timestampStr);
  const expectedSignature = hmac.digest('hex');

  try {
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expBuffer);
  } catch {
    return false;
  }
}
