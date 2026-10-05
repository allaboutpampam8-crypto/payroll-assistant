import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'TELEGRAM_BOT_TOKEN belum disetel di environment variables.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get('url');

    let webhookUrl = customUrl;
    if (!webhookUrl) {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      webhookUrl = `${proto}://${host}/api/telegram/webhook`;
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const data = await tgRes.json();

    return NextResponse.json({
      success: data.ok,
      registeredWebhookUrl: webhookUrl,
      telegramResponse: data,
      instructions: data.ok
        ? 'Webhook Telegram berhasil didaftarkan! Bot @AssistenPampamBot sekarang aktif menerima perintah chat.'
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
