'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PlusCircle,
  AlertCircle,
  Loader2,
  User,
  Users,
  Building2,
  CheckCircle2,
  Search,
  Check,
} from 'lucide-react';
import { IssueCategory, CATEGORY_LABELS, ActionStatus, Priority, PayrollResult } from '@/lib/types';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activePeriod: string;
}

type ReportScope = 'INDIVIDUAL' | 'GROUP' | 'PROJECT';

export default function QuickEntryModal({
  isOpen,
  onClose,
  onSuccess,
  activePeriod,
}: QuickEntryModalProps) {
  // Scope Laporan
  const [scope, setScope] = useState<ReportScope>('INDIVIDUAL');

  // Form Fields
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNik, setEmployeeNik] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [category, setCategory] = useState<IssueCategory>('KOREKSI_GAJI');
  const [discrepancyAmount, setDiscrepancyAmount] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('OPEN');
  const [dueDate, setDueDate] = useState('');

  // Status & Loaders
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Master Payroll Lookup States (INDIVIDUAL)
  const [isSearchingNrp, setIsSearchingNrp] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<PayrollResult | null>(null);

  // Name Autocomplete Suggestions (INDIVIDUAL)
  const [nameSuggestions, setNameSuggestions] = useState<PayrollResult[]>([]);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

  // Project Searchable State (PROJECT & GROUP)
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [departments, setDepartments] = useState<{ department: string; count: number }[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDeptCount, setSelectedDeptCount] = useState<number>(0);

  // Department Employees (GROUP)
  const [deptEmployees, setDeptEmployees] = useState<PayrollResult[]>([]);
  const [loadingDeptEmployees, setLoadingDeptEmployees] = useState(false);
  const [selectedGroupEmployees, setSelectedGroupEmployees] = useState<PayrollResult[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  // Debounced search for departments across all 700+ projects
  useEffect(() => {
    if (!isOpen || (scope !== 'PROJECT' && scope !== 'GROUP')) return;

    const timer = setTimeout(() => {
      setLoadingDepts(true);
      const url = projectSearchQuery.trim()
        ? `/api/payroll-results/query?departments=true&q=${encodeURIComponent(projectSearchQuery.trim())}`
        : '/api/payroll-results/query?departments=true';

      fetch(url)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setDepartments(json.data);
          }
        })
        .catch((err) => console.warn('Failed to load departments:', err))
        .finally(() => setLoadingDepts(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, scope, projectSearchQuery]);

  // Load department employees when selectedDept changes in GROUP mode
  useEffect(() => {
    if (scope !== 'GROUP' || !selectedDept) {
      setDeptEmployees([]);
      return;
    }

    setLoadingDeptEmployees(true);
    fetch(`/api/payroll-results/query?department=${encodeURIComponent(selectedDept)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setDeptEmployees(json.data);
        }
      })
      .catch((err) => console.warn('Failed to load dept employees:', err))
      .finally(() => setLoadingDeptEmployees(false));
  }, [selectedDept, scope]);

  // Close name autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Handle Lookup by NRP
  const handleNrpLookup = async (nrp: string) => {
    const clean = nrp.trim();
    if (clean.length < 3) {
      setMatchedEmployee(null);
      return;
    }

    setIsSearchingNrp(true);
    try {
      const res = await fetch(`/api/payroll-results/query?nik=${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const emp: PayrollResult = json.data[0];
        setMatchedEmployee(emp);
        setEmployeeName(emp.employeeName);
        if (emp.department) setDepartment(emp.department);
      } else {
        setMatchedEmployee(null);
      }
    } catch (err) {
      console.warn('NRP lookup error:', err);
      setMatchedEmployee(null);
    } finally {
      setIsSearchingNrp(false);
    }
  };

  // Handle Search by Name
  const handleNameSearch = async (name: string) => {
    setEmployeeName(name);
    const clean = name.trim();
    if (clean.length < 2) {
      setNameSuggestions([]);
      setShowNameDropdown(false);
      return;
    }

    setIsSearchingName(true);
    try {
      const res = await fetch(`/api/payroll-results/query?name=${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNameSuggestions(json.data);
        setShowNameDropdown(json.data.length > 0);
      }
    } catch (err) {
      console.warn('Name search error:', err);
    } finally {
      setIsSearchingName(false);
    }
  };

  // Select employee from name suggestion
  const handleSelectSuggestion = (emp: PayrollResult) => {
    setEmployeeName(emp.employeeName);
    setEmployeeNik(emp.employeeNik);
    if (emp.department) setDepartment(emp.department);
    setMatchedEmployee(emp);
    setShowNameDropdown(false);
  };

  // Handle Scope Change
  const handleScopeChange = (newScope: ReportScope) => {
    setScope(newScope);
    setMatchedEmployee(null);
    setErrorMsg('');
    setProjectSearchQuery('');

    if (newScope === 'PROJECT') {
      setEmployeeNik('MASSAL');
      if (selectedDept) {
        const countText = selectedDeptCount ? ` (${selectedDeptCount} orang)` : '';
        setEmployeeName(`Seluruh Pegawai${countText} - ${selectedDept}`);
        setDepartment(selectedDept);
      } else {
        setEmployeeName('');
        setDepartment('');
      }
    } else if (newScope === 'GROUP') {
      if (selectedGroupEmployees.length > 0) {
        updateGroupFields(selectedGroupEmployees, selectedDept);
      } else {
        setEmployeeName('');
        setEmployeeNik('');
        if (selectedDept) setDepartment(selectedDept);
      }
    } else {
      // Back to INDIVIDUAL
      setEmployeeName('');
      setEmployeeNik('');
      setDepartment('');
    }
  };

  // When a project is selected in PROJECT mode
  const handleSelectProjectMode = (deptName: string, count?: number) => {
    setSelectedDept(deptName);
    setSelectedDeptCount(count || 0);
    setDepartment(deptName);
    setEmployeeNik('MASSAL');
    const countText = count ? ` (${count} orang)` : '';
    setEmployeeName(`Seluruh Pegawai${countText} - ${deptName}`);
  };

  // When a project is selected in GROUP mode
  const handleSelectGroupProject = (deptName: string, count?: number) => {
    setSelectedDept(deptName);
    setSelectedDeptCount(count || 0);
    setDepartment(deptName);
    setSelectedGroupEmployees([]);
    setEmployeeName('');
    setEmployeeNik('');
  };

  // Toggle employee in GROUP mode
  const handleToggleGroupEmployee = (emp: PayrollResult) => {
    const exists = selectedGroupEmployees.some((e) => e.employeeNik === emp.employeeNik);
    let nextList: PayrollResult[];
    if (exists) {
      nextList = selectedGroupEmployees.filter((e) => e.employeeNik !== emp.employeeNik);
    } else {
      nextList = [...selectedGroupEmployees, emp];
    }
    setSelectedGroupEmployees(nextList);
    updateGroupFields(nextList, selectedDept);
  };

  const updateGroupFields = (list: PayrollResult[], dept: string) => {
    if (list.length === 0) {
      setEmployeeName('');
      setEmployeeNik('');
      return;
    }

    const count = list.length;
    const names = list.map((e) => e.employeeName);
    const displayName =
      count <= 2
        ? `${names.join(', ')} (${count} orang)`
        : `${names[0]}, ${names[1]}, +${count - 2} lainnya (${count} orang)`;

    setEmployeeName(displayName);
    setEmployeeNik(list.map((e) => e.employeeNik).join(', '));
    if (dept) setDepartment(dept);
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!employeeName.trim()) {
      setErrorMsg('Nama pegawai atau target project wajib ditentukan.');
      return;
    }

    if (scope === 'GROUP' && selectedGroupEmployees.length === 0) {
      setErrorMsg('Pilih minimal 1 orang pegawai untuk laporan rombongan.');
      return;
    }

    const amountNum = Number(discrepancyAmount.replace(/[^0-9]/g, '')) || 0;

    // Build comprehensive description if GROUP
    let finalDescription = description.trim();
    if (scope === 'GROUP' && selectedGroupEmployees.length > 0) {
      const breakdownText = selectedGroupEmployees
        .map(
          (e, idx) =>
            `${idx + 1}. ${e.employeeName} (NRP: ${e.employeeNik}${
              e.positionTitle ? ' - ' + e.positionTitle : ''
            })`
        )
        .join('\n');

      if (!finalDescription.includes('Daftar Pegawai Terdampak:')) {
        finalDescription = (
          finalDescription +
          `\n\n[Daftar Pegawai Terdampak (${selectedGroupEmployees.length} Orang)]:\n${breakdownText}`
        ).trim();
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: employeeName.trim(),
          employeeNik: employeeNik.trim() || '-',
          department: department.trim() || 'Project Umum',
          phoneNumber: phoneNumber.trim(),
          category,
          discrepancyAmount: amountNum,
          description: finalDescription,
          period: activePeriod,
          priority,
          actionStatus,
          dueDate,
          source: 'MANUAL_PIC',
          reportedBy: reportedBy.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan laporan.');
      }

      // Reset form
      setEmployeeName('');
      setEmployeeNik('');
      setDepartment('');
      setPhoneNumber('');
      setReportedBy('');
      setDiscrepancyAmount('');
      setDescription('');
      setMatchedEmployee(null);
      setSelectedGroupEmployees([]);
      setSelectedDept('');
      setSelectedDeptCount(0);
      setProjectSearchQuery('');
      setScope('INDIVIDUAL');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const formatInputCurrency = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('id-ID').format(Number(raw));
  };

  const filteredDeptEmployees = deptEmployees.filter((emp) => {
    if (!groupSearchTerm.trim()) return true;
    const term = groupSearchTerm.toLowerCase();
    return (
      emp.employeeName.toLowerCase().includes(term) ||
      emp.employeeNik.toLowerCase().includes(term) ||
      (emp.positionTitle && emp.positionTitle.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
              Catat Laporan Cepat
            </h3>
            <p className="text-xs text-slate-500">
              Input instan dari chat WhatsApp, telepon, PIC Project, atau kendala massal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scope Selector Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/30">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Cakupan Laporan:
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleScopeChange('INDIVIDUAL')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                scope === 'INDIVIDUAL'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>1 Pegawai</span>
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('GROUP')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                scope === 'GROUP'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Rombongan</span>
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('PROJECT')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                scope === 'PROJECT'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>1 Project (Massal)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 1: INDIVIDU (1 PEGAWAI)                                  */}
          {/* ============================================================== */}
          {scope === 'INDIVIDUAL' && (
            <>
              {/* Baris 1: NRP (Dengan Autofill Lookup) & Nama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* NRP Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      NRP (Ketik untuk Autofill)
                    </label>
                    {isSearchingNrp && (
                      <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-normal">
                        <Loader2 className="h-3 w-3 animate-spin" /> Mencari...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={employeeNik}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmployeeNik(val);
                        handleNrpLookup(val);
                      }}
                      placeholder="Contoh: 19770419494"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                {/* Nama Pegawai (Dengan Autocomplete Suggestion) */}
                <div className="relative" ref={nameDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nama Pegawai <span className="text-rose-500">*</span>
                    </label>
                    {isSearchingName && (
                      <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-normal">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    placeholder="Contoh: Nuryadi"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />

                  {/* Autocomplete Dropdown */}
                  {showNameDropdown && nameSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 bg-slate-50 uppercase">
                        Saran dari Master Payroll:
                      </div>
                      {nameSuggestions.map((emp) => (
                        <div
                          key={emp.id || emp.employeeNik}
                          onClick={() => handleSelectSuggestion(emp)}
                          className="px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer border-b border-slate-100 last:border-b-0 flex flex-col"
                        >
                          <span className="font-bold text-slate-800">{emp.employeeName}</span>
                          <span className="text-[11px] text-slate-500">
                            NRP: {emp.employeeNik} • {emp.positionTitle || emp.department}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Matched Employee Banner Info */}
              {matchedEmployee && (
                <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50/80 p-2.5 text-xs text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-900">
                      Data Terhubung dengan Master Payroll!
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      {matchedEmployee.positionTitle ? `${matchedEmployee.positionTitle} • ` : ''}
                      {matchedEmployee.department} (Periode {matchedEmployee.period})
                    </div>
                  </div>
                </div>
              )}

              {/* Baris 2: Project & No WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Contoh: Project Terminal Petikemas"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp (Opsional)
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* ============================================================== */}
          {/* MODE 2: SATU PROJECT (MASSAL)                                  */}
          {/* ============================================================== */}
          {scope === 'PROJECT' && (
            <div className="space-y-3 rounded-xl bg-indigo-50/40 p-3.5 border border-indigo-100">
              <div className="text-xs font-bold text-slate-800">
                Pilih Target Project <span className="text-rose-500">*</span>
              </div>

              {selectedDept ? (
                /* Selected Project Card */
                <div className="rounded-xl bg-white p-3.5 border border-indigo-200 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {selectedDept}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {selectedDeptCount
                            ? `${selectedDeptCount} Pegawai terdaftar di master payroll`
                            : 'Project Terpilih'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('');
                      setSelectedDeptCount(0);
                      setDepartment('');
                      setEmployeeName('');
                      setProjectSearchQuery('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 shrink-0 transition-colors cursor-pointer"
                  >
                    Ganti Project
                  </button>
                </div>
              ) : (
                /* Search Input & List */
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="Ketik nama atau kode project (contoh: Koja, Bitung, Priok, Jasa, TAD...)"
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                    {loadingDepts ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-600" />
                    ) : projectSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => setProjectSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  {/* Suggestions List */}
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs">
                    {departments.length === 0 ? (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          {loadingDepts
                            ? 'Mencari data project...'
                            : 'Tidak ada project ditemukan dengan kata kunci tersebut.'}
                        </p>
                        {projectSearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => handleSelectProjectMode(projectSearchQuery.trim())}
                            className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            + Tetap gunakan: &quot;{projectSearchQuery.trim()}&quot;
                          </button>
                        )}
                      </div>
                    ) : (
                      departments.map((d) => (
                        <div
                          key={d.department}
                          onClick={() => handleSelectProjectMode(d.department, d.count)}
                          className="px-3.5 py-2.5 text-xs hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                        >
                          <div className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate">
                            {d.department}
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 shrink-0">
                            {d.count} pegawai
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 3: ROMBONGAN (BEBERAPA ORANG)                              */}
          {/* ============================================================== */}
          {scope === 'GROUP' && (
            <div className="space-y-3 rounded-xl bg-indigo-50/40 p-3.5 border border-indigo-100">
              <div className="text-xs font-bold text-slate-800">
                Langkah 1: Pilih Project Asal Pegawai <span className="text-rose-500">*</span>
              </div>

              {selectedDept ? (
                /* Selected Project Card */
                <div className="rounded-xl bg-white p-3.5 border border-indigo-200 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {selectedDept}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {deptEmployees.length > 0
                            ? `${deptEmployees.length} Pegawai siap dipilih`
                            : 'Memuat data pegawai...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('');
                      setSelectedDeptCount(0);
                      setDepartment('');
                      setSelectedGroupEmployees([]);
                      setEmployeeName('');
                      setEmployeeNik('');
                      setProjectSearchQuery('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 shrink-0 transition-colors cursor-pointer"
                  >
                    Ganti Project
                  </button>
                </div>
              ) : (
                /* Search Input & List for Project */
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="Ketik nama atau kode project untuk mencari..."
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                    {loadingDepts ? (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-600" />
                    ) : projectSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => setProjectSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  {/* Suggestions List */}
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs">
                    {departments.length === 0 ? (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          {loadingDepts
                            ? 'Mencari data project...'
                            : 'Tidak ada project ditemukan dengan kata kunci tersebut.'}
                        </p>
                        {projectSearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => handleSelectGroupProject(projectSearchQuery.trim())}
                            className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            + Tetap gunakan: &quot;{projectSearchQuery.trim()}&quot;
                          </button>
                        )}
                      </div>
                    ) : (
                      departments.map((d) => (
                        <div
                          key={d.department}
                          onClick={() => handleSelectGroupProject(d.department, d.count)}
                          className="px-3.5 py-2.5 text-xs hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer flex items-center justify-between gap-3 group transition-colors"
                        >
                          <div className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate">
                            {d.department}
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 shrink-0">
                            {d.count} pegawai
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Employee Checklist */}
              {selectedDept && (
                <div className="pt-2 border-t border-indigo-100/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Langkah 2: Pilih Pegawai Terdampak ({selectedGroupEmployees.length} dipilih)
                    </label>
                  </div>

                  {/* Search filter in employees list */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      placeholder="Cari nama atau NRP pegawai di project ini..."
                      className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  {/* Employees Checkboxes List */}
                  {loadingDeptEmployees ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Memuat data pegawai di project ini...
                    </div>
                  ) : deptEmployees.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      Tidak ada data pegawai yang terdaftar di project ini pada master payroll.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 space-y-1">
                      {filteredDeptEmployees.map((emp) => {
                        const isChecked = selectedGroupEmployees.some(
                          (e) => e.employeeNik === emp.employeeNik
                        );
                        return (
                          <div
                            key={emp.id || emp.employeeNik}
                            onClick={() => handleToggleGroupEmployee(emp)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-indigo-50 text-indigo-900 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <div
                                className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                                  isChecked
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3" />}
                              </div>
                              <span className="truncate">{emp.employeeName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {emp.employeeNik}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Chips */}
                  {selectedGroupEmployees.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                      {selectedGroupEmployees.map((emp) => (
                        <span
                          key={emp.employeeNik}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"
                        >
                          <span>{emp.employeeName}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleGroupEmployee(emp);
                            }}
                            className="hover:text-rose-700 cursor-pointer ml-1 font-bold text-xs"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* COMMON FIELDS: PELAPOR, KATEGORI, NOMINAL, STATUS, DLL.        */}
          {/* ============================================================== */}

          {/* Baris Pelapor / Sumber Laporan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pelapor / Sumber Laporan <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              placeholder="Contoh: Pak Doni (Manager), HR Project, Karyawan Langsung, WhatsApp..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Catat pihak yang meneruskan atau memberikan informasi laporan kendala ini.
            </p>
          </div>

          {/* Baris Kategori Kendala */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Baris Estimasi Selisih Rp */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimasi Selisih (Rp) <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={discrepancyAmount}
                onChange={(e) => setDiscrepancyAmount(formatInputCurrency(e.target.value))}
                placeholder="Kosongkan jika hanya Permintaan Data"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bisa dikosongkan apabila laporan terkait Permintaan Data atau belum diketahui nominalnya.
            </p>
          </div>

          {/* Baris Status Awal & Prioritas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={actionStatus}
                onChange={(e) => setActionStatus(e.target.value as ActionStatus)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              >
                <option value="OPEN">🟡 Open</option>
                <option value="CROSSCHECK">🔵 Crosscheck</option>
                <option value="CLOSE">🟢 Close</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              >
                <option value="NORMAL">Normal</option>
                <option value="TINGGI">Tinggi</option>
                <option value="URGENT">Mendesak / Urgent 🔴</option>
              </select>
            </div>
          </div>

          {/* Baris Tanggal Target Selesai */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Penyelesaian (Due Date)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          {/* Baris Kronologi / Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deskripsi / Keterangan Laporan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Lembur belum dibayarkan sesuai timesheet, atau potongan BPJS selisih..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none resize-none"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan Laporan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
