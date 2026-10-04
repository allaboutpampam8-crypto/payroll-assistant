import { NextResponse } from 'next/server';
import { updateTodo, deleteTodo } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await updateTodo(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Tugas tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Tugas berhasil diperbarui.',
    });
  } catch (error) {
    console.error('Failed to update todo:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui tugas.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteTodo(id);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Tugas tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tugas berhasil dihapus.',
    });
  } catch (error) {
    console.error('Failed to delete todo:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus tugas.' },
      { status: 500 }
    );
  }
}
