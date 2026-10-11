import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware Keamanan Next.js
 * Memproteksi rute API internal agar tidak bisa diakses tanpa sesi PIN yang valid.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Pengecualian rute publik:
  // - Autentikasi PIN (/api/auth/pin)
  // - Form Lapor Publik kirim tiket (/api/reports [POST])
  // - Pencarian publik untuk auto-fill nama di form lapor (/api/payroll-results/query) -> disanitasi di route handler
  // - Cron jobs (memiliki otorisasi CRON_SECRET sendiri)
  // - Telegram Webhook (/api/telegram/*)
  // - Halaman publik (/lapor, aset statis, manifest, favicon, robots.txt)
  if (
    pathname.startsWith('/api/auth/pin') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/telegram/') ||
    (pathname === '/api/reports' && method === 'POST') ||
    pathname.startsWith('/api/payroll-results/query') ||
    (pathname === '/api/settings' && method === 'GET')
  ) {
    return NextResponse.next();
  }

  // 2. Proteksi rute API internal
  if (pathname.startsWith('/api/')) {
    const authCookie = request.cookies.get('payroll_auth_session')?.value;
    const isAuthed = authCookie === 'authenticated';

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
