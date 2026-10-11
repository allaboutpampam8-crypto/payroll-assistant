-- =========================================================================
-- SQL SCRIPT: Pengamanan Maksimal Row Level Security (RLS) Supabase
-- PT Pelindo Daya Sejahtera - Sistem Asisten Payroll
-- 
-- TUJUAN:
-- Menutup akses langsung publik (anonim) dari internet ke database Supabase.
-- Aplikasi Next.js Anda berkomunikasi menggunakan SUPABASE_SERVICE_ROLE_KEY
-- di sisi server (Backend API), sehingga tetap berfungsi 100% normal.
-- =========================================================================

-- 1. Kunci Tabel payroll_results (Data Gaji 17.000+ Pegawai)
ALTER TABLE IF EXISTS payroll_results ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan akses publik jika sebelumnya pernah dibuat
DROP POLICY IF EXISTS "Allow public read access on payroll_results" ON payroll_results;
DROP POLICY IF EXISTS "Allow service insert/update access on payroll_results" ON payroll_results;

-- Buat kebijakan ketat: Hanya service_role (backend server) yang diizinkan
CREATE POLICY "Allow service_role only on payroll_results"
  ON payroll_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 2. Kunci Tabel payroll_reports (Laporan Kendala Pegawai)
ALTER TABLE IF EXISTS payroll_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow public insert on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow public update on payroll_reports" ON payroll_reports;
DROP POLICY IF EXISTS "Allow all for anon on payroll_reports" ON payroll_reports;

CREATE POLICY "Allow service_role only on payroll_reports"
  ON payroll_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. Kunci Tabel payroll_todos (To-Do List Asisten)
ALTER TABLE IF EXISTS payroll_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on payroll_todos" ON payroll_todos;
DROP POLICY IF EXISTS "Allow all for anon on payroll_todos" ON payroll_todos;

CREATE POLICY "Allow service_role only on payroll_todos"
  ON payroll_todos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 4. Kunci Tabel payroll_settings (Konfigurasi Cut-Off & Asisten)
ALTER TABLE IF EXISTS payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on payroll_settings" ON payroll_settings;
DROP POLICY IF EXISTS "Allow all for anon on payroll_settings" ON payroll_settings;

CREATE POLICY "Allow service_role only on payroll_settings"
  ON payroll_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SELESAI. Dengan script ini, siapapun di internet yang mencoba memanggil API
-- Supabase secara langsung menggunakan browser atau Postman akan otomatis ditolak (401/403).
