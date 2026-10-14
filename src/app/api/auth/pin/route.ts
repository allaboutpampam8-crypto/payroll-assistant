import { NextRequest, NextResponse } from 'next/server';

// In-memory brute-force protection map: IP -> { attempts, lockoutUntil }
const rateLimitMap = new Map<string, { attempts: number; lockoutUntil: number }>();

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
    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip);

    // Cek jika sedang dalam masa lockout (5 menit)
    if (clientRecord && clientRecord.lockoutUntil > now) {
      const remainingSeconds = Math.ceil((clientRecord.lockoutUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan PIN yang salah. Silakan coba lagi dalam ${remainingSeconds} detik.`,
        },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    const serverPin = process.env.DASHBOARD_PIN || '197704';

    if (!pin || String(pin).trim() !== String(serverPin).trim()) {
      const currentAttempts = (clientRecord && clientRecord.lockoutUntil <= now ? clientRecord.attempts : 0) + 1;
      const isLockout = currentAttempts >= 5;

      rateLimitMap.set(ip, {
        attempts: currentAttempts,
        lockoutUntil: isLockout ? now + 5 * 60 * 1000 : 0, // 5 menit lockout
      });

      const message = isLockout
        ? 'PIN salah 5 kali berturut-turut. Akses dikunci sementara selama 5 menit.'
        : `PIN salah. Sisa kesempatan sebelum terkunci: ${Math.max(0, 5 - currentAttempts)} kali.`;

      return NextResponse.json({ success: false, message }, { status: 401 });
    }

    // Jika berhasil, reset rate limit untuk IP ini
    rateLimitMap.delete(ip);

    // Set cookie sesi terautentikasi (httpOnly & secure)
    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi PIN berhasil.',
    });

    response.cookies.set('payroll_auth_session', 'authenticated', {
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
