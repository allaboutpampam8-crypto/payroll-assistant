-- =========================================================================
-- SQL Migration: Perluas Kolom period pada tabel payroll_results
-- Menghilangkan pembatasan VARCHAR(10) menjadi VARCHAR(50)
-- Salin dan jalankan script ini di Supabase SQL Editor (opsional/pengamanan ekstra)
-- =========================================================================

ALTER TABLE payroll_results 
ALTER COLUMN period TYPE VARCHAR(50);
