-- =========================================================================
-- SQL Migration: Tabel payroll_overtime_logs (Tracker Deep Focus & Lembur)
-- PT Pelindo Daya Sejahtera - Asisten Payroll
-- Jalankan script ini di Supabase SQL Editor
-- =========================================================================

CREATE TABLE IF NOT EXISTS payroll_overtime_logs (
  id TEXT PRIMARY KEY,
  user_profile VARCHAR(50) NOT NULL,               -- Pampam, Wahid, Izul, Ucup
  work_date DATE NOT NULL,                         -- YYYY-MM-DD
  period VARCHAR(7) NOT NULL,                      -- YYYY-MM (contoh: 2026-10)
  start_time VARCHAR(10) NOT NULL,                 -- HH.mm (contoh: 17.21)
  end_time VARCHAR(10) NOT NULL,                   -- HH.mm (contoh: 21.21)
  pause_minutes INTEGER DEFAULT 0,                 -- Durasi istirahat/jeda (menit)
  duration_minutes INTEGER NOT NULL,               -- Durasi lembur bersih (menit)
  job_description TEXT NOT NULL,                   -- Kolom: PEKERJAAN YANG DILEMBURKAN
  target_description TEXT NOT NULL,                -- Kolom: TARGET PEKERJAAN YANG DILEMBURKAN
  reason TEXT NOT NULL,                            -- Kolom: ALASAN LEMBUR
  checklist_json JSONB DEFAULT '[]'::jsonb,        -- Checklist siklus payroll yang diselesaikan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing untuk query cepat & hemat egress per periode dan anggota tim
CREATE INDEX IF NOT EXISTS idx_overtime_period_user ON payroll_overtime_logs(period, user_profile);
CREATE INDEX IF NOT EXISTS idx_overtime_work_date ON payroll_overtime_logs(work_date);
CREATE INDEX IF NOT EXISTS idx_overtime_period_user_date ON payroll_overtime_logs(period, user_profile, work_date DESC, start_time DESC);

-- Aktifkan Row Level Security (RLS) selaras dengan tabel payroll lainnya
ALTER TABLE payroll_overtime_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service_role only on payroll_overtime_logs" ON payroll_overtime_logs;
DROP POLICY IF EXISTS "Allow all access on payroll_overtime_logs" ON payroll_overtime_logs;
CREATE POLICY "Allow all access on payroll_overtime_logs"
  ON payroll_overtime_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
