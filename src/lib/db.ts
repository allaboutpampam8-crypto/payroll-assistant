import fs from 'fs';
import path from 'path';
import {
  PayrollReport,
  PayrollTodo,
  PayrollSettings,
  DashboardMetrics,
  PayrollResult,
  PayrollComparison,
  PayrollPeriodSummary,
  EmployeeCumulativePayrollSummary,
} from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { sendTelegramNotification } from './telegram';

const DB_PATH = path.join(process.cwd(), 'data', 'payroll_db.json');

interface DatabaseSchema {
  settings: PayrollSettings;
  reports: PayrollReport[];
  todos: PayrollTodo[];
  results?: PayrollResult[];
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
    reportedBy: row.reported_by || '',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: Record<string, any> = {
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
      reported_by: newReport.reportedBy || null,
      resolution_notes: newReport.resolutionNotes || '',
      due_date: newReport.dueDate || '',
      attachment_url: newReport.attachmentUrl || null,
      attachment_name: newReport.attachmentName || null,
      created_at: newReport.createdAt,
      updated_at: newReport.updatedAt,
    };

    let { error } = await supabase.from('payroll_reports').insert(insertPayload);

    // Fallback if column reported_by has not been created yet in Supabase
    if (error && (error.message?.includes('reported_by') || error.code === '42703')) {
      console.warn('Column reported_by not found in Supabase payroll_reports, retrying insert without reported_by...');
      delete insertPayload.reported_by;
      const retry = await supabase.from('payroll_reports').insert(insertPayload);
      error = retry.error;
    }

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

  const pelaporText = newReport.reportedBy
    ? `🗣️ <b>Pelapor / Sumber:</b> ${newReport.reportedBy}\n`
    : '';

  sendTelegramNotification(
    `🚨 <b>LAPORAN PAYROLL BARU DITERIMA!</b>\n\n` +
      `📋 <b>No. Tiket:</b> <code>${newReport.ticketNumber}</code>\n` +
      `👤 <b>Pegawai:</b> ${newReport.employeeName} (NRP: ${newReport.employeeNik})\n` +
      `🏢 <b>Project:</b> ${newReport.department}\n` +
      pelaporText +
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
    if (updates.reportedBy !== undefined) rowUpdates.reported_by = updates.reportedBy;

    let { data, error } = await supabase
      .from('payroll_reports')
      .update(rowUpdates)
      .eq('id', id)
      .select()
      .single();

    // Fallback if column reported_by has not been created yet in Supabase
    if (error && (error.message?.includes('reported_by') || error.code === '42703')) {
      console.warn('Column reported_by not found in Supabase payroll_reports, retrying update without reported_by...');
      delete rowUpdates.reported_by;
      const retry = await supabase
        .from('payroll_reports')
        .update(rowUpdates)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

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

// -------------------------------------------------------------
// PAYROLL RESULTS (DATA GAJI BULANAN & INTELIJEN KOMPARASI)
// -------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayrollResultFromRow(row: any): PayrollResult {
  return {
    id: row.id,
    period: row.period,
    employeeNik: row.employee_nik,
    employeeName: row.employee_name,
    status: row.status || '',
    department: row.department || '',
    positionTitle: row.position_title || '',
    basicSalary: Number(row.basic_salary) || 0,
    allowances: Number(row.allowances) || 0,
    overtimeAmount: Number(row.overtime_amount) || 0,
    grossSalary: Number(row.gross_salary) || 0,
    deductionsBpjs: Number(row.deductions_bpjs) || 0,
    deductionsTgr: Number(row.deductions_tgr) || 0,
    deductionsOther: Number(row.deductions_other) || 0,
    totalDeductions: Number(row.total_deductions) || 0,
    takeHomePay: Number(row.take_home_pay) || 0,
    allowanceDetails:
      typeof row.allowance_details === 'object' && row.allowance_details !== null
        ? row.allowance_details
        : {},
    deductionDetails:
      typeof row.deduction_details === 'object' && row.deduction_details !== null
        ? row.deduction_details
        : {},
    uploadedAt: row.uploaded_at || new Date().toISOString(),
  };
}

export async function savePayrollResultsBatch(
  results: Omit<PayrollResult, 'id' | 'uploadedAt'>[]
): Promise<{ count: number }> {
  if (results.length === 0) return { count: 0 };

  if (isSupabaseConfigured && supabase) {
    const rows = results.map((r) => ({
      period: r.period,
      employee_nik: r.employeeNik,
      employee_name: r.employeeName,
      status: r.status || null,
      department: r.department || null,
      position_title: r.positionTitle || null,
      basic_salary: r.basicSalary,
      allowances: r.allowances,
      overtime_amount: r.overtimeAmount,
      gross_salary: r.grossSalary || (r.basicSalary + r.allowances + r.overtimeAmount),
      deductions_bpjs: r.deductionsBpjs || 0,
      deductions_tgr: r.deductionsTgr || 0,
      deductions_other: r.deductionsOther || 0,
      total_deductions: r.totalDeductions,
      take_home_pay: r.takeHomePay,
      allowance_details: r.allowanceDetails || {},
      deduction_details: r.deductionDetails || {},
    }));

    const { error, data } = await supabase
      .from('payroll_results')
      .upsert(rows, { onConflict: 'period,employee_nik' })
      .select('id');

    if (error) {
      console.error('Error saving payroll_results to Supabase:', error);
      throw new Error(`Gagal menyimpan data gaji ke Supabase: ${error.message}`);
    }

    return { count: data ? data.length : results.length };
  }

  // Fallback to local DB
  const local = getLocalDatabase();
  if (!local.results) local.results = [];

  for (const item of results) {
    const existingIdx = local.results.findIndex(
      (r) => r.period === item.period && r.employeeNik === item.employeeNik
    );
    const newEntry: PayrollResult = {
      ...item,
      id:
        existingIdx >= 0
          ? local.results[existingIdx].id
          : `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      uploadedAt: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      local.results[existingIdx] = newEntry;
    } else {
      local.results.push(newEntry);
    }
  }

  saveLocalDatabase(local);
  return { count: results.length };
}

export async function getPayrollResultByNik(
  nik: string,
  period?: string
): Promise<PayrollResult | null> {
  const cleanNik = nik.trim();
  if (!cleanNik) return null;

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('payroll_results')
      .select('*')
      .eq('employee_nik', cleanNik);

    if (period) {
      query = query.eq('period', period);
    } else {
      query = query.order('period', { ascending: false }).limit(1);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return mapPayrollResultFromRow(data[0]);
    }
    return null;
  }

  const local = getLocalDatabase();
  const list = (local.results || []).filter((r) => r.employeeNik === cleanNik);
  if (list.length === 0) return null;

  if (period) {
    const found = list.find((r) => r.period === period);
    return found || null;
  }

  list.sort((a, b) => b.period.localeCompare(a.period));
  return list[0];
}

export async function getPayrollResultsByName(
  nameQuery: string,
  period?: string
): Promise<PayrollResult[]> {
  const cleanQuery = nameQuery.trim().toLowerCase();
  if (!cleanQuery) return [];

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('payroll_results')
      .select('*')
      .ilike('employee_name', `%${cleanQuery}%`);

    if (period) {
      query = query.eq('period', period);
    } else {
      query = query.order('period', { ascending: false });
    }

    const { data, error } = await query.limit(period ? 10 : 25);
    if (!error && data) {
      const raw = data.map(mapPayrollResultFromRow);
      if (!period) {
        const seen = new Set<string>();
        const unique: PayrollResult[] = [];
        for (const item of raw) {
          if (!seen.has(item.employeeNik)) {
            seen.add(item.employeeNik);
            unique.push(item);
          }
        }
        return unique.slice(0, 10);
      }
      return raw.slice(0, 10);
    }
    return [];
  }

  const local = getLocalDatabase();
  const list = (local.results || []).filter((r) =>
    r.employeeName.toLowerCase().includes(cleanQuery)
  );
  if (period) {
    return list.filter((r) => r.period === period).slice(0, 10);
  }
  const seen = new Set<string>();
  const unique: PayrollResult[] = [];
  for (const item of list) {
    if (!seen.has(item.employeeNik)) {
      seen.add(item.employeeNik);
      unique.push(item);
    }
  }
  return unique.slice(0, 10);
}

export async function getPayrollDepartments(
  searchQuery?: string,
  period?: string
): Promise<{ department: string; count: number }[]> {
  const cleanSearch = searchQuery?.trim();
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('payroll_results').select('department, employee_nik');
    if (cleanSearch) {
      query = query.ilike('department', `%${cleanSearch}%`);
    }
    if (period) {
      query = query.eq('period', period);
    }
    const { data, error } = await query.limit(cleanSearch ? 500 : 20000);
    if (!error && data) {
      const deptMap: Record<string, Set<string>> = {};
      for (const row of data) {
        if (row.department) {
          if (!deptMap[row.department]) deptMap[row.department] = new Set();
          deptMap[row.department].add(row.employee_nik);
        }
      }
      return Object.entries(deptMap)
        .map(([department, nikSet]) => ({ department, count: nikSet.size }))
        .sort((a, b) => b.count - a.count);
    }
  }

  const local = getLocalDatabase();
  const list = (local.results || []).filter(
    (r) =>
      (!period || r.period === period) &&
      (!cleanSearch || (r.department && r.department.toLowerCase().includes(cleanSearch.toLowerCase())))
  );
  const deptMap: Record<string, Set<string>> = {};
  for (const row of list) {
    if (row.department) {
      if (!deptMap[row.department]) deptMap[row.department] = new Set();
      deptMap[row.department].add(row.employeeNik);
    }
  }
  return Object.entries(deptMap)
    .map(([department, nikSet]) => ({ department, count: nikSet.size }))
    .sort((a, b) => b.count - a.count);
}

export async function getPayrollResultsByDepartment(
  department: string,
  period?: string
): Promise<PayrollResult[]> {
  const cleanDept = department.trim();
  if (!cleanDept) return [];

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('payroll_results')
      .select('*')
      .eq('department', cleanDept);

    if (period) {
      query = query.eq('period', period);
    }

    // Ambil dengan urutan periode terbaru lebih dulu
    const { data, error } = await query
      .order('period', { ascending: false })
      .order('employee_name', { ascending: true })
      .limit(period ? 2000 : 5000);

    if (!error && data) {
      const raw = data.map(mapPayrollResultFromRow);
      // Jika tanpa filter periode, deduplikasi agar tiap pegawai hanya muncul 1x (data terbaru)
      if (!period) {
        const seen = new Set<string>();
        const unique: PayrollResult[] = [];
        for (const item of raw) {
          if (!seen.has(item.employeeNik)) {
            seen.add(item.employeeNik);
            unique.push(item);
          }
        }
        return unique.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      }
      return raw;
    }
    return [];
  }

  const local = getLocalDatabase();
  const list = (local.results || []).filter(
    (r) => r.department === cleanDept && (!period || r.period === period)
  );
  if (!period) {
    list.sort((a, b) => b.period.localeCompare(a.period));
    const seen = new Set<string>();
    const unique: PayrollResult[] = [];
    for (const item of list) {
      if (!seen.has(item.employeeNik)) {
        seen.add(item.employeeNik);
        unique.push(item);
      }
    }
    return unique.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }
  return list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export async function comparePayrollResults(
  nik: string,
  period1?: string,
  period2?: string
): Promise<PayrollComparison | null> {
  const cleanNik = nik.trim();
  if (!cleanNik) return null;

  let current: PayrollResult | null = null;
  let previous: PayrollResult | null = null;

  if (period1 && period2) {
    current = await getPayrollResultByNik(cleanNik, period2);
    previous = await getPayrollResultByNik(cleanNik, period1);
  } else if (period1) {
    current = await getPayrollResultByNik(cleanNik, period1);
  } else {
    // Ambil 2 periode terakhir
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payroll_results')
        .select('*')
        .eq('employee_nik', cleanNik)
        .order('period', { ascending: false })
        .limit(2);

      if (!error && data && data.length > 0) {
        current = mapPayrollResultFromRow(data[0]);
        if (data.length > 1) {
          previous = mapPayrollResultFromRow(data[1]);
        }
      }
    } else {
      const local = getLocalDatabase();
      const list = (local.results || [])
        .filter((r) => r.employeeNik === cleanNik)
        .sort((a, b) => b.period.localeCompare(a.period));

      if (list.length > 0) {
        current = list[0];
        if (list.length > 1) previous = list[1];
      }
    }
  }

  if (!current) return null;

  const prev = previous || {
    id: '',
    period: '',
    employeeNik: current.employeeNik,
    employeeName: current.employeeName,
    basicSalary: 0,
    allowances: 0,
    overtimeAmount: 0,
    grossSalary: 0,
    deductionsBpjs: 0,
    deductionsTgr: 0,
    deductionsOther: 0,
    totalDeductions: 0,
    takeHomePay: 0,
    allowanceDetails: {},
    deductionDetails: {},
    uploadedAt: '',
  };

  // Compare detailed allowance components
  const allowanceDiffs: Record<string, { prev: number; curr: number; diff: number }> = {};
  const allAllowanceKeys = new Set([
    ...Object.keys(prev.allowanceDetails || {}),
    ...Object.keys(current.allowanceDetails || {}),
  ]);
  for (const k of allAllowanceKeys) {
    const pVal = prev.allowanceDetails?.[k] || 0;
    const cVal = current.allowanceDetails?.[k] || 0;
    if (pVal !== cVal) {
      allowanceDiffs[k] = { prev: pVal, curr: cVal, diff: cVal - pVal };
    }
  }

  // Compare detailed deduction components
  const deductionDiffs: Record<string, { prev: number; curr: number; diff: number }> = {};
  const allDeductionKeys = new Set([
    ...Object.keys(prev.deductionDetails || {}),
    ...Object.keys(current.deductionDetails || {}),
  ]);
  for (const k of allDeductionKeys) {
    const pVal = prev.deductionDetails?.[k] || 0;
    const cVal = current.deductionDetails?.[k] || 0;
    if (pVal !== cVal) {
      deductionDiffs[k] = { prev: pVal, curr: cVal, diff: cVal - pVal };
    }
  }

  // Deteksi mutasi project atau rotasi jabatan
  const hasDeptChange = Boolean(
    previous &&
    previous.department &&
    current.department &&
    previous.department.trim().toLowerCase() !== current.department.trim().toLowerCase()
  );
  const hasPosChange = Boolean(
    previous &&
    previous.positionTitle &&
    current.positionTitle &&
    previous.positionTitle.trim().toLowerCase() !== current.positionTitle.trim().toLowerCase()
  );
  const hasMutation = hasDeptChange || hasPosChange;

  return {
    current,
    previous: previous || undefined,
    hasMutation,
    previousDepartment: previous?.department,
    previousPosition: previous?.positionTitle,
    diff: {
      basicSalary: current.basicSalary - prev.basicSalary,
      allowances: current.allowances - prev.allowances,
      overtimeAmount: current.overtimeAmount - prev.overtimeAmount,
      grossSalary: (current.grossSalary || 0) - (prev.grossSalary || 0),
      deductionsBpjs: (current.deductionsBpjs || 0) - (prev.deductionsBpjs || 0),
      deductionsTgr: (current.deductionsTgr || 0) - (prev.deductionsTgr || 0),
      deductionsOther: (current.deductionsOther || 0) - (prev.deductionsOther || 0),
      totalDeductions: current.totalDeductions - prev.totalDeductions,
      takeHomePay: current.takeHomePay - prev.takeHomePay,
      allowanceDiffs,
      deductionDiffs,
    },
  };
}

export async function getPayrollPeriodSummary(
  period: string
): Promise<PayrollPeriodSummary | null> {
  if (isSupabaseConfigured && supabase) {
    let totalEmployees = 0;
    let totalBasicSalary = 0;
    let totalAllowances = 0;
    let totalOvertime = 0;
    let totalDeductions = 0;
    let totalTakeHomePay = 0;

    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('payroll_results')
        .select('basic_salary, allowances, overtime_amount, total_deductions, take_home_pay')
        .eq('period', period)
        .range(from, from + batchSize - 1);

      if (error || !data || data.length === 0) {
        if (from === 0) return null;
        break;
      }

      totalEmployees += data.length;
      for (const r of data) {
        totalBasicSalary += Number(r.basic_salary) || 0;
        totalAllowances += Number(r.allowances) || 0;
        totalOvertime += Number(r.overtime_amount) || 0;
        totalDeductions += Number(r.total_deductions) || 0;
        totalTakeHomePay += Number(r.take_home_pay) || 0;
      }

      if (data.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    }

    if (totalEmployees === 0) return null;

    return {
      period,
      totalEmployees,
      totalBasicSalary,
      totalAllowances,
      totalOvertime,
      totalDeductions,
      totalTakeHomePay,
    };
  }

  const local = getLocalDatabase();
  const list = (local.results || []).filter((r) => r.period === period);
  if (list.length === 0) return null;

  return {
    period,
    totalEmployees: list.length,
    totalBasicSalary: list.reduce((acc, r) => acc + r.basicSalary, 0),
    totalAllowances: list.reduce((acc, r) => acc + r.allowances, 0),
    totalOvertime: list.reduce((acc, r) => acc + r.overtimeAmount, 0),
    totalDeductions: list.reduce((acc, r) => acc + r.totalDeductions, 0),
    totalTakeHomePay: list.reduce((acc, r) => acc + r.takeHomePay, 0),
  };
}

export async function comparePayrollPeriodSummaries(
  period1: string,
  period2: string
): Promise<{
  p1Summary: PayrollPeriodSummary;
  p2Summary: PayrollPeriodSummary;
  diff: {
    totalEmployees: number;
    totalBasicSalary: number;
    totalAllowances: number;
    totalOvertime: number;
    totalDeductions: number;
    totalTakeHomePay: number;
  };
} | null> {
  const [s1, s2] = await Promise.all([
    getPayrollPeriodSummary(period1),
    getPayrollPeriodSummary(period2),
  ]);

  if (!s1 || !s2) return null;

  return {
    p1Summary: s1,
    p2Summary: s2,
    diff: {
      totalEmployees: s2.totalEmployees - s1.totalEmployees,
      totalBasicSalary: s2.totalBasicSalary - s1.totalBasicSalary,
      totalAllowances: s2.totalAllowances - s1.totalAllowances,
      totalOvertime: s2.totalOvertime - s1.totalOvertime,
      totalDeductions: s2.totalDeductions - s1.totalDeductions,
      totalTakeHomePay: s2.totalTakeHomePay - s1.totalTakeHomePay,
    },
  };
}

export async function getAvailablePayrollPeriods(): Promise<string[]> {
  if (isSupabaseConfigured && supabase) {
    const periods: string[] = [];
    const { data } = await supabase
      .from('payroll_results')
      .select('period')
      .order('period', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      let current = data[0].period;
      periods.push(current);

      while (current) {
        const { data: prev } = await supabase
          .from('payroll_results')
          .select('period')
          .lt('period', current)
          .order('period', { ascending: false })
          .limit(1);

        if (prev && prev.length > 0) {
          current = prev[0].period;
          periods.push(current);
        } else {
          break;
        }
      }
    }
    if (periods.length > 0) return periods;
  }

  const local = getLocalDatabase();
  const set = new Set<string>();
  (local.results || []).forEach((r) => set.add(r.period));
  return Array.from(set).sort().reverse();
}

/**
 * Mengambil seluruh riwayat data gaji perorangan di semua periode (urut kronologis)
 */
export async function getAllPayrollResultsForEmployee(
  query: string
): Promise<PayrollResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  const isNumeric = /^\d+$/.test(clean);

  if (isSupabaseConfigured && supabase) {
    let targetNik = clean;
    if (!isNumeric) {
      // Cari satu pegawai yang paling relevan berdasarkan nama untuk mendapatkan NIK pastinya
      const { data: matchedEmp } = await supabase
        .from('payroll_results')
        .select('employee_nik, employee_name')
        .ilike('employee_name', `%${clean}%`)
        .order('period', { ascending: false })
        .limit(1);

      if (matchedEmp && matchedEmp.length > 0) {
        targetNik = matchedEmp[0].employee_nik;
      } else {
        return [];
      }
    }

    const { data, error } = await supabase
      .from('payroll_results')
      .select('*')
      .eq('employee_nik', targetNik)
      .order('period', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map(mapPayrollResultFromRow);
    }
    return [];
  }

  const local = getLocalDatabase();
  let targetNik = clean;
  if (!isNumeric) {
    const matched = (local.results || []).find((r) =>
      r.employeeName.toLowerCase().includes(clean.toLowerCase())
    );
    if (!matched) return [];
    targetNik = matched.employeeNik;
  }

  const list = (local.results || []).filter((r) => r.employeeNik === targetNik);
  return list.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Menghitung rekapitulasi pendapatan gaji kumulatif (Januari s.d. Oktober / multi-bulan)
 * Catatan: Upah Lembur dimasukkan ke dalam kelompok TUNJANGAN
 */
export async function getEmployeeCumulativePayrollSummary(
  query: string,
  startPeriod?: string,
  endPeriod?: string
): Promise<EmployeeCumulativePayrollSummary | null> {
  let records = await getAllPayrollResultsForEmployee(query);
  if (records.length === 0) return null;

  // Filter rentang periode jika diberikan
  if (startPeriod) {
    records = records.filter((r) => r.period >= startPeriod);
  }
  if (endPeriod) {
    records = records.filter((r) => r.period <= endPeriod);
  }

  if (records.length === 0) return null;

  const first = records[0];
  const last = records[records.length - 1];

  let totalBasicSalary = 0;
  let totalOvertime = 0;
  let totalAllowances = 0;
  let totalDeductions = 0;
  let totalTakeHomePay = 0;

  const allowanceItemTotals: Record<string, number> = {};
  const deductionItemTotals: Record<string, number> = {};
  const periods: string[] = [];

  const monthlyBreakdown = records.map((r) => {
    periods.push(r.period);
    const basic = r.basicSalary || 0;
    const ot = r.overtimeAmount || 0;
    // Upah lembur dimasukkan ke kategori tunjangan
    const allowancesWithOt = (r.allowances || 0) + ot;
    const deductions = r.totalDeductions || 0;
    const thp = r.takeHomePay || (basic + allowancesWithOt - deductions);
    const gross = r.grossSalary || (basic + allowancesWithOt);

    totalBasicSalary += basic;
    totalOvertime += ot;
    totalAllowances += allowancesWithOt;
    totalDeductions += deductions;
    totalTakeHomePay += thp;

    // Rekap rincian item tunjangan
    if (ot > 0) {
      allowanceItemTotals['Upah Lembur'] = (allowanceItemTotals['Upah Lembur'] || 0) + ot;
    }
    if (r.allowanceDetails && typeof r.allowanceDetails === 'object') {
      for (const [k, v] of Object.entries(r.allowanceDetails)) {
        if (!k.toLowerCase().includes('lembur')) {
          allowanceItemTotals[k] = (allowanceItemTotals[k] || 0) + Number(v);
        }
      }
    }

    // Rekap rincian item potongan
    if (r.deductionDetails && typeof r.deductionDetails === 'object') {
      for (const [k, v] of Object.entries(r.deductionDetails)) {
        deductionItemTotals[k] = (deductionItemTotals[k] || 0) + Number(v);
      }
    } else {
      if (r.deductionsBpjs > 0) {
        deductionItemTotals['BPJS (Kesehatan & TK)'] =
          (deductionItemTotals['BPJS (Kesehatan & TK)'] || 0) + r.deductionsBpjs;
      }
      if (r.deductionsTgr > 0) {
        deductionItemTotals['TGR / Pinjaman'] =
          (deductionItemTotals['TGR / Pinjaman'] || 0) + r.deductionsTgr;
      }
      if (r.deductionsOther > 0) {
        deductionItemTotals['Potongan Lainnya'] =
          (deductionItemTotals['Potongan Lainnya'] || 0) + r.deductionsOther;
      }
    }

    return {
      period: r.period,
      department: r.department || '-',
      positionTitle: r.positionTitle || '-',
      basicSalary: basic,
      allowances: allowancesWithOt,
      overtime: ot,
      grossSalary: gross,
      deductions,
      takeHomePay: thp,
      allowanceDetails: r.allowanceDetails,
      deductionDetails: r.deductionDetails,
    };
  });

  const totalGrossSalary = totalBasicSalary + totalAllowances;
  const averageTakeHomePay = Math.round(totalTakeHomePay / records.length);

  const uniqueDepartments = Array.from(
    new Set(records.map((r) => r.department).filter((d): d is string => Boolean(d && d.trim())))
  );
  const uniquePositions = Array.from(
    new Set(records.map((r) => r.positionTitle).filter((p): p is string => Boolean(p && p.trim())))
  );
  const hasMutation = uniqueDepartments.length > 1 || uniquePositions.length > 1;

  return {
    employeeNik: last.employeeNik,
    employeeName: last.employeeName,
    department: last.department || first.department || '-',
    positionTitle: last.positionTitle || first.positionTitle,
    hasMutation,
    uniqueDepartments,
    uniquePositions,
    totalMonths: records.length,
    periods,
    totalBasicSalary,
    totalAllowances,
    totalOvertime,
    totalGrossSalary,
    totalDeductions,
    totalTakeHomePay,
    averageTakeHomePay,
    allowanceItemTotals,
    deductionItemTotals,
    monthlyBreakdown,
  };
}

/**
 * Mengambil seluruh data payroll untuk periode tertentu (di-batch per 1.000 baris dari Supabase)
 */
export async function getPayrollResultsForPeriod(
  period: string
): Promise<PayrollResult[]> {
  const cleanPeriod = period.trim();
  if (!cleanPeriod) return [];

  if (isSupabaseConfigured && supabase) {
    const allRows: PayrollResult[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('payroll_results')
        .select('*')
        .eq('period', cleanPeriod)
        .order('employee_name', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error(`[getPayrollResultsForPeriod] Error at range ${from}-${from + batchSize - 1} for ${cleanPeriod}:`, error.message);
        // Coba retry 1 kali bila terjadi transient network hiccup
        const retryRes = await supabase
          .from('payroll_results')
          .select('*')
          .eq('period', cleanPeriod)
          .order('employee_name', { ascending: true })
          .range(from, from + batchSize - 1);

        if (retryRes.data && retryRes.data.length > 0) {
          for (const row of retryRes.data) {
            allRows.push(mapPayrollResultFromRow(row));
          }
          if (retryRes.data.length < batchSize) {
            hasMore = false;
          } else {
            from += batchSize;
          }
          continue;
        }
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      for (const row of data) {
        allRows.push(mapPayrollResultFromRow(row));
      }

      if (data.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    }

    return allRows;
  }

  const local = getLocalDatabase();
  const list = (local.results || []).filter((r) => r.period === cleanPeriod);
  return list.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}


