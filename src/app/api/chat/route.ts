import { NextRequest, NextResponse } from 'next/server';
import { askPayrollAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Pesan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const reply = await askPayrollAI(message);

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error('API /api/chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kendala saat memproses pertanyaan ke Asisten AI.',
      },
      { status: 500 }
    );
  }
}
