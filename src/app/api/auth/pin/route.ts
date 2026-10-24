import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';
import { checkRateLimit, recordRateLimitFailure, resetRateLimit } from '@/lib/rateLimit';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimitKey = `pin:${ip}`;

    // Cek jika sedang dalam masa lockout (5 menit)
    const status = await checkRateLimit(rateLimitKey);
    if (status.isLocked) {
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan PIN yang salah. Akses dikunci sementara. Silakan coba lagi dalam ${status.remainingSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    const serverPin = process.env.DASHBOARD_PIN;

    if (!serverPin && process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: DASHBOARD_PIN environment variable belum dikonfigurasi di production.');
      return NextResponse.json(
        {
          success: false,
          message:
            'Konfigurasi keamanan server belum lengkap: DASHBOARD_PIN belum disetel pada Environment Variables Production.',
        },
        { status: 500 }
      );
    }

    const effectivePin = serverPin || '197704';

    if (!pin || String(pin).trim() !== String(effectivePin).trim()) {
      // Jeda buatan (timing safe) untuk meredam serangan automated brute force
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 300));

      const { isLockout, remainingAttempts } = await recordRateLimitFailure(
        rateLimitKey,
        5,
        5 * 60 * 1000 // 5 menit lockout
      );

      const message = isLockout
        ? 'PIN salah 5 kali berturut-turut. Akses dikunci sementara selama 5 menit.'
        : `PIN salah. Sisa kesempatan sebelum terkunci: ${remainingAttempts} kali.`;

      return NextResponse.json({ success: false, message }, { status: 401 });
    }

    // Jika berhasil, reset rate limit untuk IP ini
    await resetRateLimit(rateLimitKey);

    // Set cookie sesi terautentikasi (httpOnly & secure)
    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi PIN berhasil.',
    });

    response.cookies.set('payroll_auth_session', createSessionToken(), {
      httpOnly: true, // Mencegah pencurian cookie via XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Terjadi kesalahan server.';
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesi berhasil dikunci.',
  });

  response.cookies.delete('payroll_auth_session');
  return response;
}
