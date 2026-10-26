'use client';

import React from 'react';
import Link from 'next/link';
import {
  ListTodo,
  ClipboardList,
  Wrench,
  Plus,
  Database,
  Calculator,
  Scissors,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';

export interface MobileBottomBarProps {
  activeTab: 'REPORTS' | 'TODOS';
  onToggleTab: () => void;
  isMobileToolsOpen: boolean;
  onOpenMobileTools: () => void;
  onCloseMobileTools: () => void;
  onOpenQuickEntry: () => void;
  onOpenPayrollModal: () => void;
  onOpenTerbilang: () => void;
  onExportReports: () => void;
  onLogout: () => void;
}

export default function MobileBottomBar({
  activeTab,
  onToggleTab,
  isMobileToolsOpen,
  onOpenMobileTools,
  onCloseMobileTools,
  onOpenQuickEntry,
  onOpenPayrollModal,
  onOpenTerbilang,
  onExportReports,
  onLogout,
}: MobileBottomBarProps) {
  return (
    <>
      {/* Floating Bottom Bar Khusus Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-2xl">
        <button
          onClick={onToggleTab}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-all cursor-pointer"
        >
          {activeTab === 'REPORTS' ? (
            <>
              <ListTodo className="h-4 w-4 text-indigo-600" />
              <span>To-Do</span>
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 text-indigo-600" />
              <span>Laporan</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenMobileTools}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 transition-all cursor-pointer"
        >
          <Wrench className="h-4 w-4 text-indigo-600" />
          <span>Alat Bantu</span>
        </button>

        <button
          onClick={onOpenQuickEntry}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Catat</span>
        </button>
      </div>

      {/* Mobile Bottom Action Sheet */}
      {isMobileToolsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex-1" onClick={onCloseMobileTools} />
          <div className="bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Alat Bantu Payroll
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pilih menu utilitas yang ingin dibuka
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseMobileTools}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => {
                  onCloseMobileTools();
                  onOpenPayrollModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Data & Analisis Payroll
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Cari, cek slip & komparasi gaji 17k+ pegawai
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  onCloseMobileTools();
                  onOpenTerbilang();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50/60 hover:bg-amber-100 border border-amber-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Kalkulator Terbilang ND
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Konversi nominal ke kalimat resmi Nota Dinas
                  </p>
                </div>
              </button>

              <Link
                href="/tools/excel-splitter"
                onClick={onCloseMobileTools}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-sky-50/60 hover:bg-sky-100 border border-sky-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-xs">
                  <Scissors className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Pemecah Excel HRIS
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Bagi file master payroll per 1.000 baris format utuh
                  </p>
                </div>
              </Link>

              <button
                onClick={() => {
                  onCloseMobileTools();
                  onExportReports();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100 border border-emerald-200/80 text-left transition-colors cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Unduh Rekap Tiket
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ekspor seluruh tiket kendala ke file Excel
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => {
                  onCloseMobileTools();
                  onLogout();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 p-2 cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Kunci Layar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
