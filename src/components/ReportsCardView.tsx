'use client';

import React from 'react';
import {
  Paperclip,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  PayrollReport,
  ActionStatus,
  CATEGORY_LABELS,
  STATUS_CONFIG,
} from '@/lib/types';

export interface ReportsCardViewProps {
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
}

export default function ReportsCardView({
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
}: ReportsCardViewProps) {
  return (
    <div className="space-y-3">
      {/* Bilah Pilih Semua di Mode Kartu */}
      {paginatedReports.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs">
          <label
            className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              aria-label="Pilih semua kartu di halaman ini"
              checked={isAllVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeVisibleSelected;
              }}
              onChange={onToggleSelectAllVisible}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>
              {isAllVisibleSelected ? 'Batalkan Semua' : 'Pilih Semua Halaman Ini'}
            </span>
          </label>
          {selectedReportIds.size > 0 && (
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
              {selectedReportIds.size} dipilih
            </span>
          )}
        </div>
      )}

      {paginatedReports.map((report) => {
        const statusInfo = STATUS_CONFIG[report.actionStatus] || {
          label: report.actionStatus,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          isClosed: false,
        };
        const isUrgent = report.priority === 'URGENT';
        const reportPic = report.picName || 'Pampam';
        const isSelected = selectedReportIds.has(report.id);

        return (
          <div
            key={report.id}
            onClick={() => onSelectReport(report)}
            className={`group rounded-2xl bg-white p-3.5 sm:p-5 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 ${
              isSelected
                ? 'border-indigo-400 bg-indigo-50/25 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md'
            }`}
          >
            {/* Checkbox & Left Info Container */}
            <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
              {/* Checkbox Card */}
              <div
                className="pt-0.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="p-1 -m-1 flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label={`Pilih tiket ${report.ticketNumber}`}
                    checked={isSelected}
                    onChange={() => onToggleSelectRow(report.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Detail Info */}
              <div className="space-y-2 flex-1 min-w-0">
                {/* Baris Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {report.ticketNumber}
                  </span>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.badgeClass}`}
                  >
                    {statusInfo.label}
                  </span>

                  {/* Badge PIC */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    👤 {reportPic}
                  </span>

                  {/* Tombol Lampiran Bukti */}
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
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                      title={
                        report.attachmentName
                          ? `Klik untuk lihat lampiran: ${report.attachmentName}`
                          : 'Klik untuk lihat lampiran bukti'
                      }
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>Bukti</span>
                    </button>
                  )}

                  {isUrgent && !statusInfo.isClosed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-rose-600" />
                      URGENT
                    </span>
                  )}

                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 font-semibold">
                    {report.period}
                  </span>

                  <span className="text-[11px] text-slate-400">
                    {new Date(report.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>

                  {report.reportedBy && (
                    <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 font-medium">
                      🗣️ Pelapor: {report.reportedBy}
                    </span>
                  )}
                </div>

                {/* Nama & Project */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                    <h4 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {report.employeeName}
                    </h4>
                    <span className="text-xs text-slate-500">
                      NRP: {report.employeeNik} • {report.department}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                    {CATEGORY_LABELS[report.category] || report.category}
                  </p>
                </div>

                {/* Deskripsi Kronologi Singkat */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {report.description}
                </p>

                {/* Catatan Tindak Lanjut jika ada */}
                {report.resolutionNotes && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 line-clamp-1">
                    <span className="font-semibold text-slate-700">Tindak Lanjut:</span>{' '}
                    {report.resolutionNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Right Info: Nominal & Quick Action Status */}
            <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0 gap-2">
              <div className="text-left md:text-right">
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Estimasi Selisih
                </div>
                <div className="text-sm md:text-base font-bold text-slate-900">
                  {formatRupiah(report.discrepancyAmount)}
                </div>
              </div>

              {/* 1-Click Status Quick Action Dropdown dengan Loading Spinner */}
              <div
                className="flex items-center gap-1.5"
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
                    className={`text-[11px] font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 outline-none cursor-pointer transition-all ${
                      updatingReportIds.has(report.id)
                        ? 'opacity-60 cursor-wait pl-7'
                        : ''
                    }`}
                  >
                    <option value="OPEN">Open</option>
                    <option value="CROSSCHECK">Crosscheck</option>
                    <option value="CLOSE">Close</option>
                  </select>
                  {updatingReportIds.has(report.id) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 absolute left-2 pointer-events-none" />
                  )}
                </div>

                <button
                  onClick={() => onSelectReport(report)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Lihat Detail & Catatan"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
