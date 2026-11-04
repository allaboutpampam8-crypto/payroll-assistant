'use client';

import React from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Paperclip,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  PayrollReport,
  ActionStatus,
  CATEGORY_LABELS,
} from '@/lib/types';

export type SortField =
  | 'ticketNumber'
  | 'actionStatus'
  | 'employeeName'
  | 'department'
  | 'category'
  | 'discrepancyAmount'
  | 'createdAt'
  | 'picName';

export type SortOrder = 'asc' | 'desc';

export interface ReportsTableViewProps {
  paginatedReports: PayrollReport[];
  selectedReportIds: Set<string>;
  isAllVisibleSelected: boolean;
  isSomeVisibleSelected: boolean;
  onToggleSelectAllVisible: () => void;
  onToggleSelectRow: (id: string) => void;
  onSelectReport: (report: PayrollReport) => void;
  onPreviewAttachment: (data: {
    url: string;
    name: string;
    ticketNumber: string;
    report: PayrollReport;
  }) => void;
  updatingReportIds: Set<string>;
  onQuickStatusChange: (id: string, status: ActionStatus) => void;
  formatRupiah: (val?: number) => string;
  startIndex: number;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export default function ReportsTableView({
  paginatedReports,
  selectedReportIds,
  isAllVisibleSelected,
  isSomeVisibleSelected,
  onToggleSelectAllVisible,
  onToggleSelectRow,
  onSelectReport,
  onPreviewAttachment,
  updatingReportIds,
  onQuickStatusChange,
  formatRupiah,
  startIndex,
  sortField,
  sortOrder,
  onSort,
}: ReportsTableViewProps) {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 shrink-0" />
      );
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" />
    );
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              {/* Checkbox Header */}
              <th
                className="py-3 px-3 w-10 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="p-2 -m-2 flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua baris halaman ini"
                    checked={isAllVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeVisibleSelected;
                    }}
                    onChange={onToggleSelectAllVisible}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </th>
              <th className="py-3 px-2 w-8 text-center text-slate-400">#</th>

              {/* No. Tiket */}
              <th
                onClick={() => onSort('ticketNumber')}
                className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan No. Tiket"
              >
                <div className="flex items-center gap-1">
                  <span>No. Tiket</span>
                  {renderSortIcon('ticketNumber')}
                </div>
              </th>

              {/* Status */}
              <th
                onClick={() => onSort('actionStatus')}
                className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan Status"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {renderSortIcon('actionStatus')}
                </div>
              </th>

              {/* PIC Penanggung Jawab */}
              <th
                onClick={() => onSort('picName')}
                className="py-3 px-3 w-24 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan PIC"
              >
                <div className="flex items-center gap-1">
                  <span>PIC</span>
                  {renderSortIcon('picName')}
                </div>
              </th>

              {/* Pegawai & NRP */}
              <th
                onClick={() => onSort('employeeName')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan Nama Pegawai"
              >
                <div className="flex items-center gap-1">
                  <span>Pegawai & NRP</span>
                  {renderSortIcon('employeeName')}
                </div>
              </th>

              {/* Project / Cost Center */}
              <th
                onClick={() => onSort('department')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan Project"
              >
                <div className="flex items-center gap-1">
                  <span>Project / Cost Center</span>
                  {renderSortIcon('department')}
                </div>
              </th>

              {/* Kategori */}
              <th
                onClick={() => onSort('category')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan Kategori"
              >
                <div className="flex items-center gap-1">
                  <span>Kategori</span>
                  {renderSortIcon('category')}
                </div>
              </th>

              {/* Selisih */}
              <th
                onClick={() => onSort('discrepancyAmount')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan Selisih Nominal"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Selisih</span>
                  {renderSortIcon('discrepancyAmount')}
                </div>
              </th>

              {/* Tgl */}
              <th
                onClick={() => onSort('createdAt')}
                className="py-3 px-3 w-20 cursor-pointer hover:bg-slate-200/60 transition-colors select-none group"
                title="Klik untuk urutkan Tanggal"
              >
                <div className="flex items-center gap-1">
                  <span>Tgl</span>
                  {renderSortIcon('createdAt')}
                </div>
              </th>

              <th className="py-3 px-3 w-16 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {paginatedReports.map((report, idx) => {
              const isUrgent = report.priority === 'URGENT';
              const rowNumber = startIndex + idx + 1;
              const isSelected = selectedReportIds.has(report.id);
              const reportPic = report.picName || 'Pampam';
              const isCreatedToday = (() => {
                if (!report.createdAt) return false;
                const created = new Date(report.createdAt);
                const today = new Date();
                return (
                  created.getDate() === today.getDate() &&
                  created.getMonth() === today.getMonth() &&
                  created.getFullYear() === today.getFullYear()
                );
              })();

              return (
                <tr
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/60'
                      : 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Checkbox Baris */}
                  <td
                    className="py-2.5 px-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="p-2 -m-2 flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        aria-label={`Pilih tiket ${report.ticketNumber}`}
                        checked={isSelected}
                        onChange={() => onToggleSelectRow(report.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </td>

                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                    {rowNumber}
                  </td>

                  {/* No. Tiket & Indikator Lampiran */}
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/70 group-hover:text-indigo-800 dark:group-hover:text-indigo-300 transition-colors">
                        {report.ticketNumber}
                      </span>
                      {isCreatedToday && (
                        <span
                          title="Laporan dibuat hari ini"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
                        >
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                          </span>
                          Hari Ini
                        </span>
                      )}
                      {report.attachmentUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewAttachment({
                              url: report.attachmentUrl!,
                              name: report.attachmentName || 'Bukti Laporan',
                              ticketNumber: report.ticketNumber,
                              report,
                            });
                          }}
                          title={
                            report.attachmentName
                              ? `Klik untuk pratinjau bukti: ${report.attachmentName}`
                              : 'Klik untuk pratinjau bukti lampiran'
                          }
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/80 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs hover:scale-105"
                        >
                          <Paperclip className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Bukti</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Quick Action Status dengan Loading Spinner */}
                  <td
                    className="py-2.5 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative inline-flex items-center">
                      <select
                        value={report.actionStatus}
                        disabled={updatingReportIds.has(report.id)}
                        onChange={(e) =>
                          onQuickStatusChange(
                            report.id,
                            e.target.value as ActionStatus
                          )
                        }
                        className={`text-[11px] font-semibold py-1 px-2 rounded-lg border outline-none cursor-pointer transition-all ${
                          updatingReportIds.has(report.id)
                            ? 'opacity-60 cursor-wait pr-6'
                            : ''
                        } ${
                          report.actionStatus === 'OPEN'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : report.actionStatus === 'CROSSCHECK'
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        <option value="OPEN">🟡 Open</option>
                        <option value="CROSSCHECK">🔵 Crosscheck</option>
                        <option value="CLOSE">🟢 Close</option>
                      </select>
                      {updatingReportIds.has(report.id) && (
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600 absolute right-1.5 pointer-events-none" />
                      )}
                    </div>
                  </td>

                  {/* PIC Penanggung Jawab */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                      👤 {reportPic}
                    </span>
                  </td>

                  {/* Pegawai & NRP */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {report.employeeName}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      NRP: {report.employeeNik}
                    </div>
                  </td>

                  {/* Project */}
                  <td
                    className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium max-w-[200px] truncate"
                    title={report.department}
                  >
                    {report.department || '-'}
                  </td>

                  {/* Kategori */}
                  <td className="py-2.5 px-3 font-medium text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>
                        {CATEGORY_LABELS[report.category] || report.category}
                      </span>
                      {isUrgent && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 uppercase animate-pulse border border-rose-300 dark:border-rose-800">
                          Urgent
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Selisih */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatRupiah(report.discrepancyAmount)}
                  </td>

                  {/* Tgl */}
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {isCreatedToday ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Hari ini</span>
                    ) : (
                      new Date(report.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })
                    )}
                  </td>

                  {/* Aksi */}
                  <td
                    className="py-2.5 px-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onSelectReport(report)}
                      className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Buka Detail Laporan"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
