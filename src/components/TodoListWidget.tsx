'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Tag,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { PayrollTodo, Priority } from '@/lib/types';

interface TodoListWidgetProps {
  todos: PayrollTodo[];
  onRefresh: () => void;
}

export default function TodoListWidget({
  todos,
  onRefresh,
}: TodoListWidgetProps) {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('NORMAL');
  const [newDueDate, setNewDueDate] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoadingAdd(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority,
          dueDate: newDueDate,
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewDueDate('');
        setNewPriority('NORMAL');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add todo:', err);
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleToggleComplete = async (todo: PayrollTodo) => {
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !todo.isCompleted }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === 'ACTIVE') return !t.isCompleted;
    if (filter === 'COMPLETED') return t.isCompleted;
    return true;
  });

  const activeCount = todos.filter((t) => !t.isCompleted).length;
  const completedCount = todos.filter((t) => t.isCompleted).length;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="rounded-2xl bg-white p-5 md:p-6 border border-slate-200/80 shadow-xs space-y-5">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-bold text-slate-900">
              To-Do List & Agenda Saya
            </h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {activeCount} tugas aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan rencana kerja pribadi Anda: koordinasi, rekap data, dan follow-up payroll.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'ACTIVE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Perlu Dikerjakan ({activeCount})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'COMPLETED'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Selesai ({completedCount})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({todos.length})
          </button>
        </div>
      </div>

      {/* Input Tambah To-Do Baru */}
      <form onSubmit={handleAddTodo} className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60">
        <div className="flex items-center gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tambah to-do baru... (contoh: Konfirmasi ke SPV Project Petikemas perihal jam lembur)"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
          />
          <button
            type="submit"
            disabled={loadingAdd || !newTitle.trim()}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            {loadingAdd ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>

        {/* Opsi Tambahan: Prioritas & Due Date */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[11px] font-semibold">Prioritas:</span>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600"
            >
              <option value="NORMAL">Normal</option>
              <option value="TINGGI">Tinggi</option>
              <option value="URGENT">Urgent 🔴</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[11px] font-semibold">Batas Waktu:</span>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      </form>

      {/* Daftar To-Do */}
      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 space-y-1">
            <CheckCircle2 className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">
              {filter === 'ACTIVE'
                ? 'Semua to-do sudah selesai dikerjakan! 🎉'
                : 'Belum ada to-do di kategori ini.'}
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const isOverdue =
              todo.dueDate && todo.dueDate < todayStr && !todo.isCompleted;
            const isDueToday = todo.dueDate === todayStr && !todo.isCompleted;

            return (
              <div
                key={todo.id}
                className={`group flex items-start justify-between gap-3 p-3 sm:px-4 rounded-xl border transition-all ${
                  todo.isCompleted
                    ? 'bg-slate-50/60 border-slate-200/60 text-slate-400'
                    : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                }`}
              >
                {/* Checkbox & Konten */}
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => handleToggleComplete(todo)}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    title={todo.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                  >
                    {todo.isCompleted ? (
                      <CheckSquare className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Square className="h-5 w-5 hover:text-indigo-600" />
                    )}
                  </button>

                  <div className="space-y-1 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium leading-relaxed ${
                        todo.isCompleted
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {todo.title}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {/* Prioritas */}
                      {todo.priority === 'URGENT' && !todo.isCompleted && (
                        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">
                          Urgent
                        </span>
                      )}
                      {todo.priority === 'TINGGI' && !todo.isCompleted && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                          Tinggi
                        </span>
                      )}

                      {/* Batas Waktu */}
                      {todo.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-700 font-bold'
                              : isDueToday
                              ? 'bg-amber-100 text-amber-800 font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Calendar className="h-2.5 w-2.5" />
                          <span>
                            {new Date(todo.dueDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {isOverdue && ' (Terlambat)'}
                            {isDueToday && ' (Hari Ini)'}
                          </span>
                        </span>
                      )}

                      {/* Terkait Tiket */}
                      {todo.relatedTicketNumber && (
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700 border border-indigo-200">
                          Tiket: {todo.relatedTicketNumber}
                        </span>
                      )}

                      {/* Waktu Selesai jika completed */}
                      {todo.isCompleted && todo.completedAt && (
                        <span className="text-slate-400">
                          Selesai pada{' '}
                          {new Date(todo.completedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tombol Hapus */}
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  title="Hapus Tugas"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
