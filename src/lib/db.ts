import fs from 'fs';
import path from 'path';
import {
  PayrollReport,
  PayrollTodo,
  PayrollSettings,
  DashboardMetrics,
} from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { sendTelegramNotification } from './telegram';

const DB_PATH = path.join(process.cwd(), 'data', 'payroll_db.json');

interface DatabaseSchema {
  settings: PayrollSettings;
  reports: PayrollReport[];
  todos: PayrollTodo[];
}

const DEFAULT_SETTINGS: PayrollSettings = {
  activePeriod: 'Oktober 2026',
  cutoffDate: '2026-10-25',
  assistantName: 'Asisten Payroll',
  companyName: 'PT Pelindo Daya Sejahtera',
};

// Row mappers for Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReportFromRow(row: any): PayrollReport {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    period: row.period,
    employeeName: row.employee_name,
    employeeNik: row.employee_nik,
    department: row.department,
    phoneNumber: row.phone_number || '',
    category: row.category,
    discrepancyAmount: Number(row.discrepancy_amount) || 0,
    description: row.description || '',
    actionStatus: row.action_status,
    priority: row.priority,
    dueDate: row.due_date || '',
    resolutionNotes: row.resolution_notes || '',
    source: row.source,
    attachmentUrl: row.attachment_url || undefined,
    attachmentName: row.attachment_name || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTodoFromRow(row: any): PayrollTodo {
  return {
    id: row.id,
    title: row.title,
    isCompleted: Boolean(row.is_completed),
    dueDate: row.due_date || '',
    priority: row.priority,
    relatedTicketNumber: row.related_ticket_number || undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}

// Fallback local JSON helper
function getLocalDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        settings: parsed.settings || DEFAULT_SETTINGS,
        reports: parsed.reports || [],
        todos: parsed.todos || [],
      };
    }
  } catch (err) {
    console.error('Error reading local JSON db:', err);
  }
  return { settings: DEFAULT_SETTINGS, reports: [], todos: [] };
}

function saveLocalDatabase(data: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write local JSON db (normal in serverless):', err);
  }
}

// -------------------------------------------------------------
// REPORTS
// -------------------------------------------------------------

export async function getAllReports(): Promise<PayrollReport[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payroll_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(mapReportFromRow);
    }
    console.error('Supabase getAllReports error, using local fallback:', error);
  }

  const local = getLocalDatabase();
  return local.reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getReportById(id: string): Promise<PayrollReport | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payroll_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return mapReportFromRow(data);
    }
  }

  const local = getLocalDatabase();
  return local.reports.find((r) => r.id === id);
}

export async function createReport(
  payload: Omit<PayrollReport, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>
): Promise<PayrollReport> {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 7);
  const id = `rep-${timestamp}-${rand}`;

  // Count existing reports for sequence number
  let count = 0;
  if (isSupabaseConfigured && supabase) {
    const { count: sbCount } = await supabase
      .from('payroll_reports')
      .select('*', { count: 'exact', head: true });
    count = sbCount || 0;
  } else {
    count = getLocalDatabase().reports.length;
  }

  const seq = count + 1;
  const ticketNumber = `PR-${yearMonth}-${String(seq).padStart(3, '0')}`;

  const newReport: PayrollReport = {
    ...payload,
    id,
    ticketNumber,
    discrepancyAmount: Number(payload.discrepancyAmount) || 0,
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('payroll_reports').insert({
      id: newReport.id,
      ticket_number: newReport.ticketNumber,
      employee_name: newReport.employeeName,
      employee_nik: newReport.employeeNik,
      department: newReport.department,
      category: newReport.category,
      discrepancy_amount: newReport.discrepancyAmount,
      description: newReport.description || '',
      phone_number: newReport.phoneNumber || '',
      action_status: newReport.actionStatus || 'OPEN',
      priority: newReport.priority || 'NORMAL',
      period: newReport.period || 'Oktober 2026',
      source: newReport.source || 'MANUAL_PIC',
      resolution_notes: newReport.resolutionNotes || '',
      due_date: newReport.dueDate || '',
      attachment_url: newReport.attachmentUrl || null,
      attachment_name: newReport.attachmentName || null,
      created_at: newReport.createdAt,
      updated_at: newReport.updatedAt,
    });

    if (error) {
      console.error('Failed to insert report into Supabase:', error);
    }
  }

  // Backup to local JSON if possible
  const local = getLocalDatabase();
  local.reports.unshift(newReport);
  saveLocalDatabase(local);

  // Send Instant Telegram Notification
  const rupiahText = newReport.discrepancyAmount
    ? `Rp ${newReport.discrepancyAmount.toLocaleString('id-ID')}`
    : 'Rp 0 (Tidak ada selisih)';

  sendTelegramNotification(
    `🚨 <b>LAPORAN PAYROLL BARU DITERIMA!</b>\n\n` +
      `📋 <b>No. Tiket:</b> <code>${newReport.ticketNumber}</code>\n` +
      `👤 <b>Pegawai:</b> ${newReport.employeeName} (NRP: ${newReport.employeeNik})\n` +
      `🏢 <b>Project:</b> ${newReport.department}\n` +
      `📂 <b>Kategori:</b> ${newReport.category}\n` +
      `💰 <b>Estimasi Nominal:</b> ${rupiahText}\n` +
      `⚡ <b>Prioritas:</b> ${newReport.priority}\n` +
      `📅 <b>Periode:</b> ${newReport.period}\n` +
      `📝 <b>Keterangan:</b> ${newReport.description || '-'}\n\n` +
      `👉 <i>Buka aplikasi untuk melakukan crosscheck data.</i>`
  ).catch((err) => {
    console.error('Error sending Telegram alert:', err);
  });

  return newReport;
}

export async function updateReport(
  id: string,
  updates: Partial<PayrollReport>
): Promise<PayrollReport | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowUpdates: Record<string, any> = { updated_at: now };
    if (updates.actionStatus !== undefined) rowUpdates.action_status = updates.actionStatus;
    if (updates.priority !== undefined) rowUpdates.priority = updates.priority;
    if (updates.resolutionNotes !== undefined) rowUpdates.resolution_notes = updates.resolutionNotes;
    if (updates.discrepancyAmount !== undefined) rowUpdates.discrepancy_amount = updates.discrepancyAmount;
    if (updates.dueDate !== undefined) rowUpdates.due_date = updates.dueDate;
    if (updates.period !== undefined) rowUpdates.period = updates.period;

    const { data, error } = await supabase
      .from('payroll_reports')
      .update(rowUpdates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return mapReportFromRow(data);
    }
    console.error('Error updating report in Supabase:', error);
  }

  const local = getLocalDatabase();
  const idx = local.reports.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const updated: PayrollReport = {
    ...local.reports[idx],
    ...updates,
    updatedAt: now,
  };
  local.reports[idx] = updated;
  saveLocalDatabase(local);
  return updated;
}

export async function deleteReport(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('payroll_reports').delete().eq('id', id);
    if (!error) return true;
    console.error('Error deleting report from Supabase:', error);
  }

  const local = getLocalDatabase();
  const initial = local.reports.length;
  local.reports = local.reports.filter((r) => r.id !== id);
  if (local.reports.length !== initial) {
    saveLocalDatabase(local);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// TODOS
// -------------------------------------------------------------

export async function getAllTodos(): Promise<PayrollTodo[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payroll_todos')
      .select('*')
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(mapTodoFromRow);
    }
    console.error('Error fetching todos from Supabase:', error);
  }

  const local = getLocalDatabase();
  return (local.todos || []).sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function createTodo(
  payload: Omit<PayrollTodo, 'id' | 'createdAt' | 'completedAt'>
): Promise<PayrollTodo> {
  const date = new Date();
  const id = `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newTodo: PayrollTodo = {
    ...payload,
    id,
    isCompleted: payload.isCompleted ?? false,
    createdAt: date.toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('payroll_todos').insert({
      id: newTodo.id,
      title: newTodo.title,
      is_completed: newTodo.isCompleted,
      due_date: newTodo.dueDate || '',
      priority: newTodo.priority || 'NORMAL',
      related_ticket_number: newTodo.relatedTicketNumber || '',
      created_at: newTodo.createdAt,
    });
    if (error) console.error('Error inserting todo in Supabase:', error);
  }

  const local = getLocalDatabase();
  if (!local.todos) local.todos = [];
  local.todos.unshift(newTodo);
  saveLocalDatabase(local);

  return newTodo;
}

export async function updateTodo(
  id: string,
  updates: Partial<PayrollTodo>
): Promise<PayrollTodo | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowUpdates: Record<string, any> = {};
    if (updates.isCompleted !== undefined) {
      rowUpdates.is_completed = updates.isCompleted;
      rowUpdates.completed_at = updates.isCompleted ? now : null;
    }
    if (updates.title !== undefined) rowUpdates.title = updates.title;
    if (updates.dueDate !== undefined) rowUpdates.due_date = updates.dueDate;
    if (updates.priority !== undefined) rowUpdates.priority = updates.priority;

    const { data, error } = await supabase
      .from('payroll_todos')
      .update(rowUpdates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return mapTodoFromRow(data);
    console.error('Error updating todo in Supabase:', error);
  }

  const local = getLocalDatabase();
  if (!local.todos) local.todos = [];
  const idx = local.todos.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const existing = local.todos[idx];
  let completedAt = updates.completedAt ?? existing.completedAt;
  if (updates.isCompleted === true && !completedAt) completedAt = now;
  else if (updates.isCompleted === false) completedAt = undefined;

  const updated: PayrollTodo = {
    ...existing,
    ...updates,
    completedAt,
  };
  local.todos[idx] = updated;
  saveLocalDatabase(local);
  return updated;
}

export async function deleteTodo(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('payroll_todos').delete().eq('id', id);
    if (!error) return true;
    console.error('Error deleting todo from Supabase:', error);
  }

  const local = getLocalDatabase();
  if (!local.todos) return false;
  const initial = local.todos.length;
  local.todos = local.todos.filter((t) => t.id !== id);
  if (local.todos.length !== initial) {
    saveLocalDatabase(local);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------

export async function getSettings(): Promise<PayrollSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .eq('id', 'default_settings')
      .single();

    if (!error && data) {
      return {
        activePeriod: data.active_period,
        cutoffDate: data.cutoff_date,
        assistantName: data.assistant_name,
        companyName: data.company_name,
      };
    }
  }

  return getLocalDatabase().settings;
}

export async function updateSettings(
  settings: Partial<PayrollSettings>
): Promise<PayrollSettings> {
  if (isSupabaseConfigured && supabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (settings.activePeriod) rowUpdates.active_period = settings.activePeriod;
    if (settings.cutoffDate) rowUpdates.cutoff_date = settings.cutoffDate;
    if (settings.assistantName) rowUpdates.assistant_name = settings.assistantName;
    if (settings.companyName) rowUpdates.company_name = settings.companyName;

    const { data, error } = await supabase
      .from('payroll_settings')
      .update(rowUpdates)
      .eq('id', 'default_settings')
      .select()
      .single();

    if (!error && data) {
      return {
        activePeriod: data.active_period,
        cutoffDate: data.cutoff_date,
        assistantName: data.assistant_name,
        companyName: data.company_name,
      };
    }
  }

  const local = getLocalDatabase();
  local.settings = { ...local.settings, ...settings };
  saveLocalDatabase(local);
  return local.settings;
}

// -------------------------------------------------------------
// METRICS
// -------------------------------------------------------------

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const reports = await getAllReports();
  const todos = await getAllTodos();

  const openReports = reports.filter((r) => r.actionStatus === 'OPEN').length;
  const crosscheckReports = reports.filter((r) => r.actionStatus === 'CROSSCHECK').length;
  const closeReports = reports.filter((r) => r.actionStatus === 'CLOSE').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = reports.filter(
    (r) => r.dueDate && r.dueDate < todayStr && r.actionStatus !== 'CLOSE'
  ).length;

  const urgentCount = reports.filter(
    (r) => r.priority === 'URGENT' && r.actionStatus !== 'CLOSE'
  ).length;

  const activeTodosCount = todos.filter((t) => !t.isCompleted).length;

  return {
    totalReports: reports.length,
    openReports,
    crosscheckReports,
    closeReports,
    overdueCount,
    urgentCount,
    activeTodosCount,
  };
}
