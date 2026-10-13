-- =========================================================================
-- SQL SCRIPT: Pemulihan Akses Database Supabase
-- PT Pelindo Daya Sejahtera - Sistem Asisten Payroll
-- 
-- Jalankan script ini di Supabase SQL Editor untuk memulihkan koneksi data
-- yang tersembunyi akibat kebijakan RLS service_role.
-- =========================================================================

-- 1. Pulihkan Tabel payroll_results (Hasil Gaji Pegawai)
ALTER TABLE IF EXISTS payroll_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service_role only on payroll_results" ON payroll_results;
DROP POLICY IF EXISTS "Allow public read access on payroll_results" ON payroll_results;
DROP POLICY IF EXISTS "Allow service insert/update access on payroll_results" ON payroll_results;
DROP POLICY IF EXISTS "Allow all access on payroll_results" ON payroll_results;

CREATE POLICY "Allow all access on payroll_results"
  ON payroll_results FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Pulihkan Tabel payroll_reports (Laporan Kendala)
ALTER TABLE IF EXISTS payroll_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service_role only on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow public read access on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow public insert on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow public update on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow all access on payroll_reports" ON payroll_reports;

CREATE POLICY "Allow all access on payroll_reports"
  ON payroll_reports FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Pulihkan Tabel payroll_todos (To-Do List)
ALTER TABLE IF EXISTS payroll_todos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service_role only on payroll_todos" ON payroll_todos;
DROP POLICY IF EXISTS "Allow public read access on payroll_todos" ON payroll_todos;
DROP POLICY IF EXISTS "Allow all access on payroll_todos" ON payroll_todos;

CREATE POLICY "Allow all access on payroll_todos"
  ON payroll_todos FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Pulihkan Tabel payroll_settings (Pengaturan Cut-Off)
ALTER TABLE IF EXISTS payroll_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service_role only on payroll_settings" ON payroll_settings;
DROP POLICY IF EXISTS "Allow public read access on payroll_settings" ON payroll_settings;
DROP POLICY IF EXISTS "Allow all access on payroll_settings" ON payroll_settings;

CREATE POLICY "Allow all access on payroll_settings"
  ON payroll_settings FOR ALL
  USING (true)
  WITH CHECK (true);
