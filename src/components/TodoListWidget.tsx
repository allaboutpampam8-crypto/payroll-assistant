'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { PayrollTodo, Priority } from '@/lib/types';

export type TodoFilterType = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'TODAY';

interface TodoListWidgetProps {
  todos: PayrollTodo[];
  initialFilter?: TodoFilterType;
  onRefresh: () => void;
}

export default function TodoListWidget({
  todos,
  initialFilter = 'ACTIVE',
  onRefresh,
}: TodoListWidgetProps) {
  const [filter, setFilter] = useState<TodoFilterType>(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('NORMAL');
  const [newDueDate, setNewDueDate] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
      setCurrentPage(1);
    }
  }, [initialFilter]);

  const handleFilterChange = (newFilter: TodoFilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

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

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTodos = todos.filter((t) => {
    if (filter === 'ACTIVE') return !t.isCompleted;
    if (filter === 'COMPLETED') return t.isCompleted;
    if (filter === 'OVERDUE') return !t.isCompleted && Boolean(t.dueDate && t.dueDate < todayStr);
    if (filter === 'TODAY') return !t.isCompleted && t.dueDate === todayStr;
    return true;
  });

  const totalPages = Math.ceil(filteredTodos.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTodos.length);
  const paginatedTodos = filteredTodos.slice(startIndex, startIndex + pageSize);

  const activeCount = todos.filter((t) => !t.isCompleted).length;
  const completedCount = todos.filter((t) => t.isCompleted).length;
  const overdueCount = todos.filter((t) => !t.isCompleted && Boolean(t.dueDate && t.dueDate < todayStr)).length;
  const dueTodayCount = todos.filter((t) => !t.isCompleted && t.dueDate === todayStr).length;

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-bold text-slate-900">
              To-Do List & Agenda Saya
            </h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {activeCount} tugas aktif
            </span>
            {overdueCount > 0 && (
              <span className="rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-extrabold text-rose-700 animate-pulse flex items-center gap-1">
                <Flame className="h-3 w-3 text-rose-600" />
                <span>{overdueCount} Terlambat!</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan rencana kerja pribadi Anda: koordinasi, rekap data, dan follow-up payroll.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="w-full sm:w-auto overflow-x-auto flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => handleFilterChange('ACTIVE')}
            className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'ACTIVE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="sm:hidden">Aktif ({activeCount})</span>
            <span className="hidden sm:inline">Perlu Dikerjakan ({activeCount})</span>
          </button>

          {overdueCount > 0 && (
            <button
              onClick={() => handleFilterChange('OVERDUE')}
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'bg-rose-100/80 text-rose-800 hover:bg-rose-200 font-bold'
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>Terlambat ({overdueCount})</span>
            </button>
          )}

          {dueTodayCount > 0 && (
            <button
              onClick={() => handleFilterChange('TODAY')}
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'TODAY'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              Hari Ini ({dueTodayCount})
            </button>
          )}

          <button
            onClick={() => handleFilterChange('COMPLETED')}
            className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'COMPLETED'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Selesai ({completedCount})
          </button>
          <button
            onClick={() => handleFilterChange('ALL')}
            className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
                : filter === 'OVERDUE'
                ? 'Hebat! Tidak ada to-do yang terlambat. 🎉'
                : filter === 'TODAY'
                ? 'Tidak ada to-do dengan deadline hari ini.'
                : 'Belum ada to-do di kategori ini.'}
            </p>
          </div>
        ) : (
          paginatedTodos.map((todo) => {
            const isOverdue =
              todo.dueDate && todo.dueDate < todayStr && !todo.isCompleted;
            const isDueToday = todo.dueDate === todayStr && !todo.isCompleted;

            return (
              <div
                key={todo.id}
                className={`group flex items-start justify-between gap-3 p-3 sm:px-4 rounded-xl border transition-all ${
                  todo.isCompleted
                    ? 'bg-slate-50/60 border-slate-200/60 text-slate-400'
                    : isOverdue
                    ? 'bg-rose-50/70 border-rose-300 shadow-xs ring-1 ring-rose-200'
                    : isDueToday
                    ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
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
                          : isOverdue
                          ? 'text-rose-950 font-bold'
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
                              ? 'bg-rose-600 text-white font-extrabold shadow-2xs'
                              : isDueToday
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Calendar className="h-2.5 w-2.5" />
                          <span>
                            {new Date(todo.dueDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {isOverdue && ' (TERLAMBAT)'}
                            {isDueToday && ' (HARI INI)'}
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
                          Selesai:{' '}
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
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1 transition-all cursor-pointer"
                  title="Hapus To-Do"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination & Footer Counter */}
      {filteredTodos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan {startIndex + 1} - {endIndex} dari {filteredTodos.length} to-do
            </span>

            {/* Pilihan jumlah baris */}
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 outline-none focus:border-indigo-600"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
              <option value={20}>20 baris</option>
            </select>
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            {/* Indikator Tombol Nomor Halaman */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - safeCurrentPage) <= 1
                  );
                })
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && page - prev > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-1 text-xs text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          safeCurrentPage === page
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-white border border-transparent hover:border-slate-200'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safeCurrentPage === totalPages || totalPages === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
