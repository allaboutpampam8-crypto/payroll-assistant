import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
  resetTime: number;
}

// In-memory fallback untuk lingkungan lokal / jika Supabase table belum tersedia
const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Cek status rate limit untuk key (misal: IP atau identifier).
 */
export async function checkRateLimit(
  key: string
): Promise<{ isLocked: boolean; remainingSeconds: number; attempts: number }> {
  const now = Date.now();

  // 1. Cek dari Supabase jika configured (sinkronisasi lintas instance serverless)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('payroll_rate_limits')
        .select('attempts, lockout_until')
        .eq('key', key)
        .maybeSingle();

      if (!error && data) {
        const lockoutUntil = Number(data.lockout_until || 0);
        const attempts = Number(data.attempts || 0);
        if (lockoutUntil > now) {
          const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
          return { isLocked: true, remainingSeconds, attempts };
        }
        return { isLocked: false, remainingSeconds: 0, attempts };
      }
    } catch {
      // Fallback ke memoryStore jika query database gagal
    }
  }

  // 2. Fallback memory store
  const record = memoryStore.get(key);
  if (record && record.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attempts: record.attempts };
  }

  return { isLocked: false, remainingSeconds: 0, attempts: record?.attempts || 0 };
}

/**
 * Catat kegagalan (misal PIN salah) dan hitung apakah perlu lockout.
 */
export async function recordRateLimitFailure(
  key: string,
  maxAttempts: number = 5,
  lockoutDurationMs: number = 5 * 60 * 1000 // default 5 menit lockout
): Promise<{ isLockout: boolean; currentAttempts: number; remainingAttempts: number }> {
  const now = Date.now();
  let currentAttempts = 1;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('payroll_rate_limits')
        .select('attempts, lockout_until')
        .eq('key', key)
        .maybeSingle();

      if (data) {
        const prevLockout = Number(data.lockout_until || 0);
        if (prevLockout <= now) {
          currentAttempts = Number(data.attempts || 0) + 1;
        } else {
          currentAttempts = Number(data.attempts || 0) + 1;
        }
      }

      const isLockout = currentAttempts >= maxAttempts;
      const lockoutUntil = isLockout ? now + lockoutDurationMs : 0;

      await supabase.from('payroll_rate_limits').upsert({
        key,
        attempts: currentAttempts,
        lockout_until: lockoutUntil,
        updated_at: new Date().toISOString(),
      });

      return {
        isLockout,
        currentAttempts,
        remainingAttempts: Math.max(0, maxAttempts - currentAttempts),
      };
    } catch {
      // Fallback ke in-memory jika upsert gagal
    }
  }

  // In-memory fallback
  const memRecord = memoryStore.get(key);
  if (memRecord && memRecord.lockoutUntil <= now) {
    currentAttempts = memRecord.attempts + 1;
  }
  const isLockout = currentAttempts >= maxAttempts;
  const lockoutUntil = isLockout ? now + lockoutDurationMs : 0;

  memoryStore.set(key, {
    attempts: currentAttempts,
    lockoutUntil,
    resetTime: now + lockoutDurationMs,
  });

  return {
    isLockout,
    currentAttempts,
    remainingAttempts: Math.max(0, maxAttempts - currentAttempts),
  };
}

/**
 * Reset rate limit saat berhasil autentikasi.
 */
export async function resetRateLimit(key: string): Promise<void> {
  memoryStore.delete(key);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('payroll_rate_limits').delete().eq('key', key);
    } catch {
      // Ignore
    }
  }
}
