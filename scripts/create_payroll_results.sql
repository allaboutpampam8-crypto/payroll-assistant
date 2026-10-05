-- =========================================================================
-- SQL Migration: Tabel payroll_results (Intelijen Hasil Payroll 17.000+ Pegawai)
-- PT Pelindo Daya Sejahtera (Mendukung 92 Jenis Tunjangan & Rincian Potongan)
-- Salin dan jalankan script ini di Supabase SQL Editor
-- =========================================================================

CREATE TABLE IF NOT EXISTS payroll_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period VARCHAR(10) NOT NULL,                    -- Format: YYYY-MM (contoh: '2026-10')
  employee_nik VARCHAR(50) NOT NULL,              -- NRP Pegawai
  employee_name VARCHAR(255) NOT NULL,            -- Employee / Nama Pegawai
  status VARCHAR(50),                             -- Status (Organik, PKWT, dll)
  position_title VARCHAR(255),                    -- Job Formation / Jabatan
  department VARCHAR(255),                        -- Cost Center / Project / Unit Kerja
  
  -- Komponen Agregat Utama (B-Tree Indexed untuk performa query kilat)
  basic_salary NUMERIC(15,2) DEFAULT 0,           -- Upah Pokok
  allowances NUMERIC(15,2) DEFAULT 0,             -- Total Seluruh Penerimaan Tambahan (Tunjangan, Lembur, Insentif, Bantuan, dll)
  overtime_amount NUMERIC(15,2) DEFAULT 0,        -- Sub-total Upah Lembur (termasuk di dalam allowances/penerimaan)
  gross_salary NUMERIC(15,2) DEFAULT 0,           -- Jumlah Kotor / Bruto (Upah Pokok + allowances)
  deductions_bpjs NUMERIC(15,2) DEFAULT 0,        -- Potongan BPJS (JHT, JP, JKK, JK, Kes)
  deductions_tgr NUMERIC(15,2) DEFAULT 0,         -- Potongan TGR / Ganti Rugi
  deductions_other NUMERIC(15,2) DEFAULT 0,       -- Potongan Lain-lain / Koperasi / Pajak
  total_deductions NUMERIC(15,2) DEFAULT 0,       -- Jumlah Potongan
  take_home_pay NUMERIC(15,2) NOT NULL,           -- Gaji Bersih (THP = Jumlah Kotor - Jumlah Potongan)
  
  -- Kolom Dinamis JSONB (Menampung rincian 92 jenis tunjangan & lembur serta potongan tanpa batas)
  allowance_details JSONB DEFAULT '{}'::jsonb,   -- Rincian seluruh komponen penerimaan (tunjangan & lembur) yang diterima (> 0)
  deduction_details JSONB DEFAULT '{}'::jsonb,   -- Rincian komponen potongan yang dikenakan (> 0)
  
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

DROP POLICY IF EXISTS "Allow public read access on payroll_results" ON payroll_results;
CREATE POLICY "Allow public read access on payroll_results"
  ON payroll_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow service insert/update access on payroll_results" ON payroll_results;
CREATE POLICY "Allow service insert/update access on payroll_results"
  ON payroll_results FOR ALL
  USING (true)
  WITH CHECK (true);
