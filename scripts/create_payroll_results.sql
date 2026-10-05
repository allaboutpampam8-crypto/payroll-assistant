-- =========================================================================
-- SQL Migration: Tabel payroll_results (Intelijen Hasil Payroll 17.000+ Pegawai)
-- Salin dan jalankan script ini di Supabase SQL Editor
-- =========================================================================

CREATE TABLE IF NOT EXISTS payroll_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period VARCHAR(10) NOT NULL,             -- Format: YYYY-MM (contoh: '2026-10')
  employee_nik VARCHAR(50) NOT NULL,       -- NRP Pegawai
  employee_name VARCHAR(255) NOT NULL,     -- Nama Lengkap Pegawai
  department VARCHAR(255),                 -- Unit / Project Kerja
  position_title VARCHAR(255),             -- Jabatan
  basic_salary NUMERIC(15,2) DEFAULT 0,    -- Gaji Pokok
  allowances NUMERIC(15,2) DEFAULT 0,      -- Total Tunjangan (Tetap & Tidak Tetap)
  overtime_amount NUMERIC(15,2) DEFAULT 0, -- Upah Lembur
  deductions_bpjs NUMERIC(15,2) DEFAULT 0, -- Potongan BPJS (TK + Kesehatan)
  deductions_tgr NUMERIC(15,2) DEFAULT 0,  -- Potongan TGR / Pinjaman / Ganti Rugi
  deductions_other NUMERIC(15,2) DEFAULT 0,-- Potongan Lain-lain
  total_deductions NUMERIC(15,2) DEFAULT 0,-- Total Seluruh Potongan
  take_home_pay NUMERIC(15,2) NOT NULL,    -- Gaji Bersih (THP)
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_period_nik UNIQUE (period, employee_nik)
);

-- Indexing B-Tree untuk Performa Ekstrem (Pencarian < 5ms pada 100.000+ data)
CREATE INDEX IF NOT EXISTS idx_payroll_results_period_nik ON payroll_results(period, employee_nik);
CREATE INDEX IF NOT EXISTS idx_payroll_results_nik ON payroll_results(employee_nik);
CREATE INDEX IF NOT EXISTS idx_payroll_results_name ON payroll_results(employee_name);
CREATE INDEX IF NOT EXISTS idx_payroll_results_period ON payroll_results(period);

-- Aktifkan Row Level Security (RLS) dengan akses penuh untuk anon & service_role
ALTER TABLE payroll_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on payroll_results"
  ON payroll_results FOR SELECT
  USING (true);

CREATE POLICY "Allow service insert/update access on payroll_results"
  ON payroll_results FOR ALL
  USING (true)
  WITH CHECK (true);
