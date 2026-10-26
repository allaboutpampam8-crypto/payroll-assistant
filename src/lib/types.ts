export type IssueCategory =
  | 'KOREKSI_GAJI'
  | 'KEKURANGAN_GAJI'
  | 'GAJI_SUSULAN'
  | 'PEMUTAKHIRAN_GAJI'
  | 'PERMINTAAN_DATA';

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  KOREKSI_GAJI: 'Koreksi Gaji',
  KEKURANGAN_GAJI: 'Kekurangan Gaji',
  GAJI_SUSULAN: 'Gaji Susulan',
  PEMUTAKHIRAN_GAJI: 'Pemutakhiran Gaji',
  PERMINTAAN_DATA: 'Permintaan Data',
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

export type AppUserProfile = 'Pampam' | 'Wahid' | 'Izul' | 'Ucup';

export interface UserProfileInfo {
  id: AppUserProfile;
  name: string;
  role: 'PIC' | 'SUPERINTENDENT';
  roleLabel: string;
  avatarBg: string;
  colorHex: string;
}

export const APP_USER_PROFILES: UserProfileInfo[] = [
  { id: 'Pampam', name: 'Pampam', role: 'PIC', roleLabel: 'PIC Payroll', avatarBg: 'bg-indigo-600', colorHex: '#4f46e5' },
  { id: 'Wahid', name: 'Wahid', role: 'PIC', roleLabel: 'PIC Payroll', avatarBg: 'bg-sky-600', colorHex: '#0284c7' },
  { id: 'Izul', name: 'Izul', role: 'PIC', roleLabel: 'PIC Payroll', avatarBg: 'bg-emerald-600', colorHex: '#059669' },
  { id: 'Ucup', name: 'Ucup', role: 'SUPERINTENDENT', roleLabel: 'Superintendent', avatarBg: 'bg-purple-600', colorHex: '#9333ea' },
];

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
  reportedBy?: string; // Nama / catatan pelapor atau sumber (misal: Atasan, HR Lapangan, dsb)
  picName?: string; // PIC Penanggung Jawab / Pembuat (Pampam, Wahid, Izul, Ucup)
}

export interface SubTodoItem {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface PayrollTodo {
  id: string;
  title: string;
  description?: string; // Catatan tambahan / teks panjang
  subTodos?: SubTodoItem[]; // Daftar sub-tugas lanjutan
  isCompleted: boolean;
  dueDate?: string; // YYYY-MM-DD
  priority: Priority;
  relatedTicketNumber?: string; // Nomor tiket jika tugas berasal dari kendala
  createdAt: string;
  completedAt?: string;
  userName?: string; // Pemilik to-do list mandiri (Pampam, Wahid, Izul, Ucup)
}

export interface PayrollSettings {
  activePeriod: string;
  cutoffDate: string; // YYYY-MM-DD
  assistantName: string;
  companyName: string;
  isPeriodCompleted?: boolean;
  completedAt?: string; // YYYY-MM-DD or ISO string
}

export interface DashboardMetrics {
  totalReports: number;
  openReports: number;
  crosscheckReports: number;
  closeReports: number;
  overdueCount: number;
  urgentCount: number;
  activeTodosCount?: number;
  overdueTodosCount?: number;
  dueSoonReportsCount?: number;
  dueSoonTodosCount?: number;
}

export interface PayrollResult {
  id: string;
  period: string; // YYYY-MM, contoh: "2026-10"
  employeeNik: string; // NRP Pegawai
  employeeName: string;
  status?: string; // Status: Organik, PKWT, dll.
  department?: string; // Cost Center / Project / Unit Kerja
  positionTitle?: string; // Job Formation / Jabatan
  basicSalary: number; // Upah Pokok
  allowances: number; // Total Seluruh Tunjangan (Akumulasi 92 tunjangan)
  overtimeAmount: number; // Total Seluruh Lembur
  grossSalary?: number; // Jumlah Kotor
  deductionsBpjs: number; // Potongan BPJS (TK + Kes)
  deductionsTgr: number; // Potongan TGR / Pinjaman
  deductionsOther: number; // Potongan Lain-lain
  totalDeductions: number; // Jumlah Potongan
  takeHomePay: number; // Gaji Bersih (THP)
  allowanceDetails?: Record<string, number>; // Rincian 92 Tunjangan yang bernilai > 0
  deductionDetails?: Record<string, number>; // Rincian Potongan yang bernilai > 0
  uploadedAt: string;
}

export interface PayrollComparison {
  current: PayrollResult;
  previous?: PayrollResult;
  hasMutation?: boolean;
  previousDepartment?: string;
  previousPosition?: string;
  diff: {
    basicSalary: number;
    allowances: number;
    overtimeAmount: number;
    grossSalary?: number;
    deductionsBpjs: number;
    deductionsTgr: number;
    deductionsOther: number;
    totalDeductions: number;
    takeHomePay: number;
    allowanceDiffs?: Record<string, { prev: number; curr: number; diff: number }>;
    deductionDiffs?: Record<string, { prev: number; curr: number; diff: number }>;
  };
}

export interface PayrollPeriodSummary {
  period: string;
  totalEmployees: number;
  totalBasicSalary: number;
  totalAllowances: number;
  totalOvertime: number;
  totalDeductions: number;
  totalTakeHomePay: number;
}

export interface EmployeeCumulativePayrollSummary {
  employeeNik: string;
  employeeName: string;
  department: string;
  positionTitle?: string;
  hasMutation?: boolean;
  uniqueDepartments?: string[];
  uniquePositions?: string[];
  totalMonths: number;
  periods: string[];
  totalBasicSalary: number;
  totalAllowances: number; // Termasuk upah lembur sebagai salah satu komponen tunjangan
  totalOvertime: number; // Nilai lembur yang menjadi bagian tunjangan
  totalGrossSalary: number;
  totalDeductions: number;
  totalTakeHomePay: number;
  averageTakeHomePay: number;
  allowanceItemTotals: Record<string, number>;
  deductionItemTotals: Record<string, number>;
  monthlyBreakdown: {
    period: string;
    department?: string;
    positionTitle?: string;
    basicSalary: number;
    allowances: number;
    overtime: number;
    grossSalary: number;
    deductions: number;
    takeHomePay: number;
    allowanceDetails?: Record<string, number>;
    deductionDetails?: Record<string, number>;
  }[];
}

export interface UniqueEmployeeRecord {
  nik: string;
  name: string;
  position: string;
  department: string;
  period: string; // Periode terakhir aktif
  firstPeriod?: string; // Periode awal masuk / awal aktif
}

