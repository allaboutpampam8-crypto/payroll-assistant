import { NextRequest, NextResponse } from 'next/server';
import { askPayrollAI, ChatHistoryItem, ChatAttachment } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let message = typeof body.message === 'string' ? body.message.trim() : '';
    const userName = typeof body.userName === 'string' ? body.userName.trim() : undefined;

    let attachment: ChatAttachment | undefined;
    if (
      body.attachment &&
      typeof body.attachment === 'object' &&
      typeof body.attachment.mimeType === 'string' &&
      typeof body.attachment.data === 'string'
    ) {
      attachment = {
        mimeType: body.attachment.mimeType,
        data: body.attachment.data,
      };
      if (!message) {
        message = 'Tolong analisa slip gaji terlampir ini secara mendalam.';
      }
    }

    if (!message && !attachment) {
      return NextResponse.json(
        { success: false, error: 'Pesan atau lampiran tidak boleh kosong.' },
        { status: 400 }
      );
    }

    let history: ChatHistoryItem[] | undefined;
    if (Array.isArray(body.history)) {
      history = body.history
        .filter((item: unknown) => item && typeof item === 'object')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          role: item.role === 'model' || item.role === 'assistant' ? ('model' as const) : ('user' as const),
          text: typeof item.text === 'string' ? item.text : '',
        }))
        .filter((item: ChatHistoryItem) => Boolean(item.text));
    }

    const reply = await askPayrollAI(message, userName, history, attachment);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: unknown) {
    console.error('API /api/chat error:', error);
    const errMsg = error instanceof Error ? error.message : 'Terjadi kendala saat memproses pertanyaan ke Asisten AI.';
    return NextResponse.json(
      {
        success: false,
        error: errMsg,
      },
      { status: 500 }
    );
  }
}
