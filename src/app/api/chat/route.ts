import { NextRequest, NextResponse } from 'next/server';
import { askPayrollAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const userName = typeof body.userName === 'string' ? body.userName.trim() : undefined;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Pesan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const reply = await askPayrollAI(message, userName);

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
