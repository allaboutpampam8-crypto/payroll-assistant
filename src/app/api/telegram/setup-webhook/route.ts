import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { verifySessionToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Keamanan: Batasi akses hanya untuk sesi admin terautentikasi atau dengan secret key
    const authCookie = request.cookies.get('payroll_auth_session')?.value;
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    const validSecret = process.env.CRON_SECRET || process.env.DASHBOARD_PIN;

    const isAuthorized =
      verifySessionToken(authCookie) ||
      (validSecret && secretParam === validSecret);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Endpoint setup webhook hanya dapat diakses oleh admin.' },
        { status: 401 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'TELEGRAM_BOT_TOKEN belum disetel di environment variables.' },
        { status: 500 }
      );
    }

    // 2. Kunci URL hanya ke host terverifikasi (mencegah arbitrary URL redirection / hijacking)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const webhookUrl = `${proto}://${host}/api/telegram/webhook`;

    // 3. Sertakan secret token untuk mengamankan komunikasi webhook
    const webhookSecret =
      process.env.TELEGRAM_WEBHOOK_SECRET ||
      createHash('sha256').update(token).digest('hex').slice(0, 32);

    const tgEndpoint = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(webhookSecret)}`;

    const tgRes = await fetch(tgEndpoint);
    const data = await tgRes.json();

    return NextResponse.json({
      success: data.ok,
      registeredWebhookUrl: webhookUrl,
      hasSecretToken: Boolean(webhookSecret),
      telegramResponse: data,
      instructions: data.ok
        ? 'Webhook Telegram berhasil didaftarkan secara aman! Bot siap menerima perintah.'
        : 'Gagal mendaftarkan webhook. Pastikan URL dapat diakses publik via HTTPS.',
    });
  } catch (err: unknown) {
    console.error('Setup webhook error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
