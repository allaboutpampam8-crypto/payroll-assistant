export type IssueCategory =
  | 'PERMINTAAN_DATA'
  | 'KOREKSI_GAJI'
  | 'PEMUTAKHIRAN_GAJI';

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  PERMINTAAN_DATA: 'Permintaan Data',
  KOREKSI_GAJI: 'Koreksi Gaji',
  PEMUTAKHIRAN_GAJI: 'Pemutakhiran Gaji',
};

export type ActionStatus =
  | 'OPEN'
  | 'CROSSCHECK'
  | 'CLOSE';

export const STATUS_CONFIG: Record<
  ActionStatus,
  { label: string; color: string; badgeClass: string; isClosed: boolean }
> = {
  OPEN: {
    label: 'Open',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    isClosed: false,
  },
  CROSSCHECK: {
    label: 'Crosscheck',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    isClosed: false,
  },
  CLOSE: {
    label: 'Close',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    isClosed: true,
  },
};

export type Priority = 'NORMAL' | 'TINGGI' | 'URGENT';

export interface PayrollReport {
  id: string;
  ticketNumber: string;
  createdAt: string;
  updatedAt: string;
  period: string; // contoh: "Oktober 2026"
  employeeName: string;
  employeeNik: string; // Digunakan sebagai NRP
  department: string;  // Digunakan sebagai Project
  phoneNumber?: string;
  category: IssueCategory;
  discrepancyAmount?: number; // Opsional dalam Rupiah
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  actionStatus: ActionStatus;
  priority: Priority;
  dueDate?: string; // Target tanggal penanganan (YYYY-MM-DD)
  resolutionNotes?: string;
  resolvedAt?: string;
  source: 'MANUAL_PIC' | 'FORM_KARYAWAN';
}

export interface PayrollTodo {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  priority: Priority;
  relatedTicketNumber?: string; // Nomor tiket jika tugas berasal dari kendala
  createdAt: string;
  completedAt?: string;
}

export interface PayrollSettings {
  activePeriod: string;
  cutoffDate: string; // YYYY-MM-DD
  assistantName: string;
  companyName: string;
}

export interface DashboardMetrics {
  totalReports: number;
  openReports: number;
  crosscheckReports: number;
  closeReports: number;
  overdueCount: number;
  urgentCount: number;
  activeTodosCount?: number;
}
