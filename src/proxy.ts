import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

/**
 * Proxy Keamanan Next.js (Next.js 16+ convention)
 * Memproteksi rute API internal agar tidak bisa diakses tanpa sesi PIN kriptografis yang valid.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Pengecualian rute publik:
  // - Autentikasi PIN (/api/auth/pin)
  // - Form Lapor Publik kirim tiket (/api/reports [POST])
  // - Pencarian publik untuk auto-fill nama di form lapor (/api/payroll-results/query) -> disanitasi di route handler
  // - Cron jobs (memiliki otorisasi CRON_SECRET sendiri)
  // - Telegram Webhook (/api/telegram/webhook [POST]) -> diverifikasi via Telegram Secret Token
  // - Pengaturan umum GET (/api/settings [GET]) untuk form publik
  if (
    pathname.startsWith('/api/auth/pin') ||
    pathname.startsWith('/api/cron/') ||
    (pathname === '/api/telegram/webhook' && method === 'POST') ||
    (pathname === '/api/reports' && method === 'POST') ||
    pathname.startsWith('/api/payroll-results/query') ||
    (pathname === '/api/settings' && method === 'GET')
  ) {
    return NextResponse.next();
  }

  // 2. Proteksi rute API internal menggunakan verifikasi token kriptografis
  if (pathname.startsWith('/api/')) {
    const authCookie = request.cookies.get('payroll_auth_session')?.value;
    const isAuthed = verifySessionToken(authCookie);

    if (!isAuthed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses ditolak. Sesi belum terautentikasi atau PIN belum dimasukkan.',
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
