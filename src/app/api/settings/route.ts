import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil pengaturan.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updated = await updateSettings(body);
    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Pengaturan berhasil diperbarui.',
    });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui pengaturan.' },
      { status: 500 }
    );
  }
}
