import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const serverPin = process.env.DASHBOARD_PIN || process.env.NEXT_PUBLIC_DASHBOARD_PIN || '197704';

    if (!pin || String(pin).trim() !== String(serverPin).trim()) {
      return NextResponse.json(
        { success: false, message: 'PIN yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // Set cookie sesi terautentikasi (berlaku 7 hari)
    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi PIN berhasil.',
    });

    response.cookies.set('payroll_auth_session', 'authenticated', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan server.' },
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
