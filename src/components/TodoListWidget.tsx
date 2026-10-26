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
  ChevronDown,
  Flame,
  Crown,
  ListTree,
  CornerDownRight,
  FileText,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { PayrollTodo, SubTodoItem, Priority, AppUserProfile } from '@/lib/types';

export type TodoFilterType = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'TODAY';

interface TodoListWidgetProps {
  todos: PayrollTodo[];
  initialFilter?: TodoFilterType;
  onRefresh: () => void;
  activeUser?: AppUserProfile;
}

export default function TodoListWidget({
  todos,
  initialFilter = 'ACTIVE',
  onRefresh,
  activeUser = 'Pampam',
}: TodoListWidgetProps) {
  const [filter, setFilter] = useState<TodoFilterType>(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form Input To-Do Baru
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [newPriority, setNewPriority] = useState<Priority>('NORMAL');
  const [newDueDate, setNewDueDate] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);

  // Sub-task states
  const [expandedSubTodos, setExpandedSubTodos] = useState<Set<string>>(new Set());
  const [newSubTitles, setNewSubTitles] = useState<Record<string, string>>({});
  const [addingSubTodoId, setAddingSubTodoId] = useState<string | null>(null);

  // Edit State To-Do Utama
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('NORMAL');
  const [editDueDate, setEditDueDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit State Sub-Tugas
  const [editingSubKey, setEditingSubKey] = useState<string | null>(null); // format: `${todoId}_${subId}`
  const [editSubTitle, setEditSubTitle] = useState('');
  const [savingSubEdit, setSavingSubEdit] = useState(false);

  // Actions loading
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Khusus Superintendent (Ucup) bisa menugaskan to-do ke PIC tertentu & memantau to-do PIC
  const [assignedTo, setAssignedTo] = useState<AppUserProfile>('Pampam');
  const [viewUserFilter, setViewUserFilter] = useState<string>('ALL');

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

  const toggleSubTodoSection = (todoId: string) => {
    setExpandedSubTodos((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  const handleAddTodo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const targetUser = activeUser === 'Ucup' ? assignedTo : activeUser;
    const isFromSuper = activeUser === 'Ucup' && assignedTo !== 'Ucup';
    const finalTitle = isFromSuper ? `[Dari Superintendent] ${newTitle.trim()}` : newTitle.trim();

    setLoadingAdd(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          description: newDescription.trim() || undefined,
          priority: newPriority,
          dueDate: newDueDate,
          userName: targetUser,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewDescription('');
        setShowDescriptionInput(false);
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
    setTogglingId(todo.id);
    try {
      const nextCompleted = !todo.isCompleted;
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Tambah Sub-Tugas ke To-Do Utama
  const handleAddSubTodo = async (todo: PayrollTodo) => {
    const subTitle = (newSubTitles[todo.id] || '').trim();
    if (!subTitle) return;

    setAddingSubTodoId(todo.id);
    try {
      const currentSub = todo.subTodos || [];
      const newSubItem: SubTodoItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: subTitle,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };
      const updatedSubTodos = [...currentSub, newSubItem];

      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subTodos: updatedSubTodos }),
      });

      if (res.ok) {
        setNewSubTitles((prev) => ({ ...prev, [todo.id]: '' }));
        // Pastikan dropdown sub-tugas terbuka
        setExpandedSubTodos((prev) => new Set(prev).add(todo.id));
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add sub-todo:', err);
    } finally {
      setAddingSubTodoId(null);
    }
  };

  // Toggle Centang Sub-Tugas
  const handleToggleSubTodo = async (todo: PayrollTodo, subId: string) => {
    const currentSub = todo.subTodos || [];
    const now = new Date().toISOString();
    const updatedSubTodos = currentSub.map((item) => {
      if (item.id === subId) {
        const nextCompleted = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? now : undefined,
        };
      }
      return item;
    });

    // Cek apakah seluruh sub-tugas selesai
    const allCompleted = updatedSubTodos.length > 0 && updatedSubTodos.every((s) => s.isCompleted);

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subTodos: updatedSubTodos,
          // Jika semua sub-tugas selesai, otomatis tandai tugas utama selesai (jika belum)
          ...(allCompleted && !todo.isCompleted ? { isCompleted: true } : {}),
        }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to toggle sub-todo:', err);
    }
  };

  // Hapus Sub-Tugas
  const handleDeleteSubTodo = async (todo: PayrollTodo, subId: string) => {
    const currentSub = todo.subTodos || [];
    const updatedSubTodos = currentSub.filter((item) => item.id !== subId);

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subTodos: updatedSubTodos }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete sub-todo:', err);
    }
  };

  // Handler Mulai & Simpan Edit Tugas Utama
  const handleStartEdit = (todo: PayrollTodo) => {
    setEditingTodoId(todo.id);
    const cleanTitle = todo.title.replace(/^\[Dari Superintendent\]\s*/i, '');
    setEditTitle(cleanTitle);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority || 'NORMAL');
    setEditDueDate(todo.dueDate || '');
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditTitle('');
    setEditDescription('');
    setEditPriority('NORMAL');
    setEditDueDate('');
  };

  const handleSaveEdit = async (todo: PayrollTodo) => {
    if (!editTitle.trim()) return;

    setSavingEdit(true);
    try {
      const isSuperTask = todo.title.includes('[Dari Superintendent]');
      const finalTitle = isSuperTask ? `[Dari Superintendent] ${editTitle.trim()}` : editTitle.trim();

      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          description: editDescription.trim() || undefined,
          priority: editPriority,
          dueDate: editDueDate,
        }),
      });

      if (res.ok) {
        handleCancelEdit();
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update todo:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler Mulai & Simpan Edit Sub-Tugas
  const handleStartSubEdit = (todoId: string, sub: SubTodoItem) => {
    setEditingSubKey(`${todoId}_${sub.id}`);
    setEditSubTitle(sub.title);
  };

  const handleCancelSubEdit = () => {
    setEditingSubKey(null);
    setEditSubTitle('');
  };

  const handleSaveSubEdit = async (todo: PayrollTodo, subId: string) => {
    if (!editSubTitle.trim()) return;

    setSavingSubEdit(true);
    try {
      const currentSub = todo.subTodos || [];
      const updatedSubTodos = currentSub.map((item) =>
        item.id === subId ? { ...item, title: editSubTitle.trim() } : item
      );

      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subTodos: updatedSubTodos }),
      });

      if (res.ok) {
        handleCancelSubEdit();
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update sub-todo:', err);
    } finally {
      setSavingSubEdit(false);
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

  // Filter to-do: Khusus PIC hanya melihat milik mereka; Khusus Ucup bisa memantau semua atau per-PIC
  const userTodos = todos.filter((t) => {
    if (activeUser === 'Ucup') {
      if (viewUserFilter === 'ALL') return true;
      return (t.userName || 'Pampam') === viewUserFilter;
    }
    return !t.userName || t.userName === activeUser;
  });

  const filteredTodos = userTodos.filter((t) => {
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

  const activeCount = userTodos.filter((t) => !t.isCompleted).length;
  const completedCount = userTodos.filter((t) => t.isCompleted).length;
  const overdueCount = userTodos.filter((t) => !t.isCompleted && Boolean(t.dueDate && t.dueDate < todayStr)).length;
  const dueTodayCount = userTodos.filter((t) => !t.isCompleted && t.dueDate === todayStr).length;

  const isSuperintendent = activeUser === 'Ucup';

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              To-Do List Mandiri ({activeUser})
              {isSuperintendent && (
                <span className="rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-bold px-2 py-0.5 inline-flex items-center gap-1 shadow-2xs">
                  <Crown className="h-3 w-3 text-amber-600" /> Superintendent
                </span>
              )}
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
            {isSuperintendent
              ? 'Mode Superintendent: Anda dapat memantau meja kerja semua PIC dan mendelegasikan tugas khusus ke PIC tertentu.'
              : `Meja kerja privat ${activeUser}: Catatan agenda, instruksi lanjutan, dan checklist sub-tugas pribadi.`}
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
            Semua ({userTodos.length})
          </button>
        </div>
      </div>

      {/* Panel Khusus Superintendent: Filter Pantau Meja Kerja PIC */}
      {isSuperintendent && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
          <span className="text-amber-950 font-bold flex items-center gap-1.5 text-xs pr-1">
            <Crown className="h-3.5 w-3.5 text-amber-600" />
            Pantau Meja Kerja:
          </span>
          {(['ALL', 'Pampam', 'Wahid', 'Izul', 'Ucup'] as const).map((userKey) => {
            const count = todos.filter((t) => {
              if (userKey === 'ALL') return true;
              return (t.userName || 'Pampam') === userKey;
            }).filter((t) => !t.isCompleted).length;

            const label =
              userKey === 'ALL'
                ? '👥 Semua PIC'
                : userKey === 'Ucup'
                ? '👑 Ucup (Agenda Saya)'
                : `👤 PIC ${userKey}`;
            const isSelected = viewUserFilter === userKey;

            return (
              <button
                key={userKey}
                type="button"
                onClick={() => {
                  setViewUserFilter(userKey);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-amber-100/80 border border-amber-200/80'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Form Input Tambah To-Do Baru (Multi-line Support) */}
      <form onSubmit={handleAddTodo} className="space-y-2.5 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-2">
          {/* Textarea Multi-line untuk Judul Tugas Utama */}
          <div className="relative">
            <textarea
              required
              rows={2}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl+Enter atau Cmd+Enter untuk submit instan
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTodo();
                }
              }}
              placeholder={
                isSuperintendent && assignedTo !== 'Ucup'
                  ? `Berikan instruksi to-do untuk ${assignedTo}...\n(Tekan Enter untuk baris baru, Ctrl+Enter untuk simpan)`
                  : `Tulis to-do atau catatan tugas...\n(Tekan Enter untuk baris baru, Ctrl+Enter untuk simpan)`
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-y min-h-[52px] leading-relaxed"
            />
          </div>

          {/* Opsi Tambahan Deskripsi / Rincian Penjelasan Panjang */}
          {showDescriptionInput ? (
            <div className="animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-indigo-600" />
                  Rincian Penjelasan / Catatan Tambahan (Opsional):
                </span>
                <button
                  type="button"
                  onClick={() => setShowDescriptionInput(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Tutup Catatan
                </button>
              </div>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Tambahkan catatan detail, link meeting, atau panduan kerja..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none leading-relaxed"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDescriptionInput(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>+ Tambah Catatan / Rincian Penjelasan</span>
            </button>
          )}
        </div>

        {/* Toolbar Bawah: Tugaskan Ke, Prioritas, Due Date, dan Tombol Tambah */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500">
            {isSuperintendent && (
              <div className="flex items-center gap-1.5 bg-amber-100/80 border border-amber-300 px-2 py-1 rounded-lg">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-700" />
                  Tugaskan Ke:
                </span>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value as AppUserProfile)}
                  className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-bold text-amber-950 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Pampam">Pampam (PIC)</option>
                  <option value="Wahid">Wahid (PIC)</option>
                  <option value="Izul">Izul (PIC)</option>
                  <option value="Ucup">Ucup (Agenda Saya Sendiri)</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold">Prioritas:</span>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="NORMAL">Normal</option>
                <option value="TINGGI">Tinggi</option>
                <option value="URGENT">Urgent 🔴</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold">Batas Waktu:</span>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingAdd || !newTitle.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/20 cursor-pointer shrink-0"
          >
            {loadingAdd ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>
              {isSuperintendent && assignedTo !== 'Ucup' ? `Tugaskan ke ${assignedTo}` : 'Tambah To-Do'}
            </span>
          </button>
        </div>
      </form>

      {/* Daftar To-Do */}
      <div className="space-y-2.5">
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
            const isToggling = togglingId === todo.id;
            const isSuperTask = todo.title.includes('[Dari Superintendent]');
            const displayTitle = todo.title.replace(/^\[Dari Superintendent\]\s*/i, '');

            const subList = todo.subTodos || [];
            const subCompletedCount = subList.filter((s) => s.isCompleted).length;
            const isSubExpanded = expandedSubTodos.has(todo.id);
            const isAddingSub = addingSubTodoId === todo.id;

            return (
              <div
                key={todo.id}
                className={`group rounded-2xl border transition-all ${
                  isToggling
                    ? 'bg-indigo-50/50 border-indigo-200 opacity-80'
                    : todo.isCompleted
                    ? 'bg-slate-50/60 border-slate-200/60 text-slate-400'
                    : isOverdue
                    ? 'bg-rose-50/70 border-rose-300 shadow-xs ring-1 ring-rose-200'
                    : isDueToday
                    ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                }`}
              >
                {/* Baris Utama To-Do */}
                <div className="flex items-start justify-between gap-3 p-3.5 sm:p-4">
                  {/* Checkbox Tugas Utama & Judul */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(todo)}
                      disabled={isToggling}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer disabled:cursor-wait"
                      title={todo.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                    >
                      {isToggling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      ) : todo.isCompleted ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5 hover:text-indigo-600" />
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Mode Tampilan Normal vs Mode Edit */}
                      {editingTodoId === todo.id ? (
                        /* Form Edit Inline Tugas Utama */
                        <div className="space-y-2 p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200 animate-in fade-in">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-900 block mb-1">
                              Edit Judul Tugas:
                            </span>
                            <textarea
                              rows={2}
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                              placeholder="Edit judul tugas..."
                            />
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-600 block mb-1">
                              Edit Catatan / Deskripsi Tambahan (Opsional):
                            </span>
                            <textarea
                              rows={2}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                              placeholder="Edit catatan..."
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-200/60">
                            <div className="flex items-center gap-2 text-xs">
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as Priority)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                              >
                                <option value="NORMAL">Normal</option>
                                <option value="TINGGI">Tinggi</option>
                                <option value="URGENT">Urgent 🔴</option>
                              </select>

                              <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(todo)}
                                disabled={savingEdit || !editTitle.trim()}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                {savingEdit ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-200 text-xs font-medium transition-colors cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Batal</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Tampilan Normal Judul & Deskripsi */
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className={`text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words ${
                                todo.isCompleted
                                  ? 'line-through text-slate-400'
                                  : isOverdue
                                  ? 'text-rose-950 font-bold'
                                  : 'text-slate-800'
                              }`}
                            >
                              {displayTitle}
                            </div>
                            {isToggling && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Menyimpan...
                              </span>
                            )}
                          </div>

                          {/* Deskripsi Tambahan Multi-line (Jika ada) */}
                          {todo.description && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 text-xs whitespace-pre-wrap leading-relaxed">
                              {todo.description}
                            </div>
                          )}
                        </>
                      )}

                      {/* Metadata Badges & Tombol Sub-Task */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-0.5">
                        {/* Badge Khusus: Ditugaskan oleh Superintendent */}
                        {isSuperTask && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 font-bold">
                            <Crown className="h-3 w-3 text-amber-700" />
                            Tugas dari Superintendent
                          </span>
                        )}

                        {/* Info PIC pemilik tugas */}
                        {(isSuperintendent || viewUserFilter === 'ALL') && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${
                              todo.userName === 'Pampam'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : todo.userName === 'Wahid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : todo.userName === 'Izul'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            👤 PIC: {todo.userName || 'Pampam'}
                          </span>
                        )}

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

                        {/* Tombol Accordion Sub-Tugas */}
                        <button
                          type="button"
                          onClick={() => toggleSubTodoSection(todo.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                            subList.length > 0
                              ? subCompletedCount === subList.length
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
                          }`}
                        >
                          <ListTree className="h-3 w-3" />
                          <span>
                            {subList.length > 0
                              ? `${subCompletedCount}/${subList.length} Sub-Tugas`
                              : '+ Sub-Tugas'}
                          </span>
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              isSubExpanded ? 'rotate-180 text-indigo-600' : ''
                            }`}
                          />
                        </button>

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

                  {/* Tombol Aksi: Edit & Hapus */}
                  {deletingId === todo.id ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(todo.id);
                          setDeletingId(null);
                        }}
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                      >
                        Hapus?
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-1.5 py-0.5 rounded-md text-[11px] text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {editingTodoId !== todo.id && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(todo)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit To-Do"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeletingId(todo.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus To-Do"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-To-Do List Section (Checklist Turunan) */}
                {isSubExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:px-5 sm:py-3.5 space-y-2.5 rounded-b-2xl animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <ListTree className="h-3.5 w-3.5 text-indigo-600" />
                        Checklist Sub-Tugas Lanjutan:
                      </span>
                      {subList.length > 0 && (
                        <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          {Math.round((subCompletedCount / subList.length) * 100)}% Selesai
                        </span>
                      )}
                    </div>

                    {/* Progress Bar Mini */}
                    {subList.length > 0 && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-300"
                          style={{
                            width: `${(subCompletedCount / subList.length) * 100}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Daftar Sub-Tugas */}
                    <div className="space-y-1.5">
                      {subList.map((sub) => {
                        const isSubEditing = editingSubKey === `${todo.id}_${sub.id}`;

                        return (
                          <div
                            key={sub.id}
                            className={`flex items-start justify-between gap-2 p-2 rounded-xl border transition-all ${
                              sub.isCompleted
                                ? 'bg-white/50 border-slate-200/60 text-slate-400'
                                : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleSubTodo(todo, sub.id)}
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {sub.isCompleted ? (
                                  <CheckSquare className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Square className="h-4 w-4 hover:text-indigo-600" />
                                )}
                              </button>

                              {isSubEditing ? (
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={editSubTitle}
                                    onChange={(e) => setEditSubTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveSubEdit(todo, sub.id);
                                      } else if (e.key === 'Escape') {
                                        handleCancelSubEdit();
                                      }
                                    }}
                                    className="flex-1 rounded-lg border border-indigo-400 bg-white px-2 py-0.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Edit sub-tugas..."
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSubEdit(todo, sub.id)}
                                    disabled={savingSubEdit || !editSubTitle.trim()}
                                    className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs transition-colors cursor-pointer"
                                    title="Simpan"
                                  >
                                    {savingSubEdit ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelSubEdit}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span
                                    className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                      sub.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                                    }`}
                                  >
                                    {sub.title}
                                  </span>
                                  {sub.isCompleted && sub.completedAt && (
                                    <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                                      ✓ Selesai:{' '}
                                      {new Date(sub.completedAt).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}{' '}
                                      •{' '}
                                      {new Date(sub.completedAt).toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {!isSubEditing && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartSubEdit(todo.id, sub)}
                                  className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Edit Sub-Tugas"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubTodo(todo, sub.id)}
                                  className="text-slate-300 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus Sub-Tugas"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Input Tambah Sub-Tugas Baru */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <CornerDownRight className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                      <input
                        type="text"
                        value={newSubTitles[todo.id] || ''}
                        onChange={(e) =>
                          setNewSubTitles((prev) => ({
                            ...prev,
                            [todo.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubTodo(todo);
                          }
                        }}
                        placeholder="Tulis sub-tugas lanjutan... (tekan Enter)"
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubTodo(todo)}
                        disabled={isAddingSub || !(newSubTitles[todo.id] || '').trim()}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                      >
                        {isAddingSub ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                )}
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
            <div className="flex items-center gap-1 ml-2">
              <span className="hidden sm:inline">Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <span className="px-2 text-xs font-bold text-slate-700">
              {safeCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
