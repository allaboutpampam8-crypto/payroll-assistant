import { NextResponse } from 'next/server';
import { getAllTodos, createTodo } from '@/lib/db';

export async function GET() {
  try {
    const todos = await getAllTodos();
    return NextResponse.json({ success: true, data: todos });
  } catch (error) {
    console.error('Failed to get todos:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data To-Do.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, message: 'Judul tugas wajib diisi.' },
        { status: 400 }
      );
    }

    const newTodo = await createTodo({
      title: body.title.trim(),
      isCompleted: body.isCompleted ?? false,
      dueDate: body.dueDate || '',
      priority: body.priority || 'NORMAL',
      relatedTicketNumber: body.relatedTicketNumber || undefined,
    });

    return NextResponse.json(
      { success: true, data: newTodo, message: 'Tugas berhasil ditambahkan ke To-Do List.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create todo:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan tugas.' },
      { status: 500 }
    );
  }
}
