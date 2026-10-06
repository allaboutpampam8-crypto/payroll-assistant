-- Migration: Menambahkan kolom reported_by ke tabel payroll_reports
-- Jalankan query ini di SQL Editor dashboard Supabase Anda.

ALTER TABLE payroll_reports 
ADD COLUMN IF NOT EXISTS reported_by VARCHAR(255);

COMMENT ON COLUMN payroll_reports.reported_by IS 'Nama / pihak yang melaporkan atau meneruskan kendala (contoh: Manager, HR Project, WhatsApp, PIC)';
