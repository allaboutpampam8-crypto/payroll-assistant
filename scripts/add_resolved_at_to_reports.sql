-- Migration: Menambahkan kolom resolved_at ke tabel payroll_reports
-- Jalankan query ini di SQL Editor dashboard Supabase Anda (https://supabase.com/dashboard/project/cmejwzydrkxizxuabrgo/sql).

ALTER TABLE payroll_reports 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN payroll_reports.resolved_at IS 'Tanggal dan waktu ketika tiket kendala payroll diselesaikan (status CLOSE)';
