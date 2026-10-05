# Product Requirement Document (PRD) v3.0
## Asisten Payroll & Intelligence System — PT Pelindo Daya Sejahtera

---

## 1. Ringkasan Eksekutif & Visi Produk

**Asisten Payroll** adalah platform terpadu berbasis Web, PWA (Progressive Web App), dan Telegram Bot yang dirancang khusus sebagai asisten operasional dan intelijen data bagi PIC/Pengelola Payroll di **PT Pelindo Daya Sejahtera (PDS)**.

Aplikasi ini berevolusi dari sekadar sistem pencatat tiket komplain menjadi **Pusat Intelijen Payroll Pribadi**, yang menggabungkan:
1. **Monitoring & Rekonsiliasi Kendala Gaji** (Manajemen tiket laporan kendala, form publik karyawan `/lapor`, to-do agenda, dan export Excel).
2. **Pusat Data Hasil Payroll Bulanan (High-Scale)**: Mampu menampung dan menganalisis rekapitulasi data gaji **17.000+ karyawan** per bulan secara cepat, ringan, dan aman tanpa membebani sistem ERP kantor.
3. **Asisten Telegram Interaktif Dua Arah (`@AssistenPampamBot`)**: Memberikan akses seketika (*instant query*) ke data gaji perorangan, deteksi otomatis selisih gaji multi-bulan, dan rekap makro eksekutif langsung dari ruang chat Telegram PIC dalam hitungan detik.

---

## 2. Arsitektur Teknis & Ekosistem Sistem

* **Frontend & Backend**: Next.js 16 (App Router, Turbopack, React 19, TypeScript, Tailwind CSS).
* **Database Relasional**: Cloud Supabase PostgreSQL (terindeks B-Tree pada NRP, Nama, Periode).
* **Excel Parsing Engine**: `xlsx` / `papaparse` client-side parsing dengan chunked batch upserting (mencegah serverless timeout pada 17.000+ baris).
* **Bot Engine**: Telegram Bot Webhook & REST API dengan otentikasi ketat `TELEGRAM_CHAT_ID` tunggal (Akses Eksklusif PIC).
* **Hosting & Scheduler**: Vercel Serverless + Vercel Cron.

---

## 3. Struktur Database (Schema & Indexing)

### 3.1. Tabel Eksisting
* `payroll_reports`: Menyimpan tiket kendala (`ticket_number`, `employee_name`, `employee_nik`, `department`, `category`, `discrepancy_amount`, `action_status`, `priority`, dll.).
* `payroll_todos`: Menyimpan agenda kerja PIC (`title`, `priority`, `due_date`, `is_completed`, `related_ticket_number`).
* `payroll_settings`: Menyimpan konfigurasi aktif (`cutoff_date`, `active_period`, `company_name`).

### 3.2. Tabel Baru: `payroll_results` (Data Gaji Bulanan 17.000+ Pegawai)
Menampung histori komponen gaji karyawan per periode:
```sql
CREATE TABLE IF NOT EXISTS payroll_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period VARCHAR(10) NOT NULL,            -- Format: YYYY-MM (misal: 2026-10)
  employee_nik VARCHAR(50) NOT NULL,      -- NRP Pegawai
  employee_name VARCHAR(255) NOT NULL,    -- Nama Pegawai
  department VARCHAR(255),                -- Project / Unit Kerja
  position_title VARCHAR(255),            -- Jabatan
  basic_salary NUMERIC(15,2) DEFAULT 0,   -- Gaji Pokok
  allowances NUMERIC(15,2) DEFAULT 0,     -- Total Tunjangan (Tetap & Tidak Tetap)
  overtime_amount NUMERIC(15,2) DEFAULT 0,-- Upah Lembur
  deductions_bpjs NUMERIC(15,2) DEFAULT 0,-- Potongan BPJS (TK + Kes)
  deductions_tgr NUMERIC(15,2) DEFAULT 0, -- Potongan TGR / Hutang
  deductions_other NUMERIC(15,2) DEFAULT 0,-- Potongan Lain-lain
  total_deductions NUMERIC(15,2) DEFAULT 0,-- Total Seluruh Potongan
  take_home_pay NUMERIC(15,2) NOT NULL,   -- Gaji Bersih Diterima (THP)
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_period_nik UNIQUE (period, employee_nik)
);

-- Indexing Performa Tinggi untuk Query Instan (< 10ms pada 100.000+ data):
CREATE INDEX idx_payroll_results_period_nik ON payroll_results(period, employee_nik);
CREATE INDEX idx_payroll_results_nik ON payroll_results(employee_nik);
CREATE INDEX idx_payroll_results_name ON payroll_results(employee_name);
CREATE INDEX idx_payroll_results_period ON payroll_results(period);
```

---

## 4. Rincian Modul & Spesifikasi Fitur

### Modul 1: Manajemen Tiket Kendala Gaji (Eksisting - Live)
* Status: 🟢 Selesai & Beroperasi.
* Fitur: Form `/lapor`, Quick Entry Dashboard, filter status (`OPEN`, `CROSSCHECK`, `CLOSE`), prioritas `URGENT`, format nominal Rupiah, pagination (5, 10, 20, 50 baris), dan ekspor Excel `.xlsx`.

### Modul 2: To-Do List & Agenda Asisten (Eksisting - Live)
* Status: 🟢 Selesai & Beroperasi.
* Fitur: Agenda PIC terintegrasi nomor tiket, deadline dengan alert jatuh tempo / terlambat, filter Aktif/Selesai/Semua, dan pagination responsif.

### Modul 3: Payroll Result Intelligence & High-Scale Excel Uploader (Fitur Baru)
* Status: 🛠 Tahap Pengembangan.
* Kemampuan:
  1. Modal Uploader di Dashboard: Input periode dan drag-and-drop file `.xlsx` / `.csv`.
  2. Client-side Chunking Engine: Parse di browser, batch upsert 1.000 baris per kiriman, aman dari Vercel timeout 10 detik.
  3. Pencarian Cepat di Web Dashboard berdasarkan NRP / Nama / Project.

### Modul 4: Asisten Bot Telegram Interaktif Dua Arah (Fitur Baru)
* Status: 🛠 Tahap Pengembangan.
* Perintah Bot:
  * `/cek [nrp/nama]`: Slip rincian komponen gaji bulan aktif.
  * `/banding [nrp]`: Komparasi otomatis 2 bulan terakhir per pegawai (penanda naik/turun dan selisih THP).
  * `/total [bulan]`: Ringkasan makro pengeluaran gaji periode tersebut.
  * `/bandingtotal [bln1] [bln2]`: Analisa perbandingan total gaji antar bulan untuk atasan.
  * `/rekap`: Status tiket laporan kendala & sisa hari cut-off.
  * `/todo`: 5 agenda to-do list teratas yang belum selesai.
* Keamanan: Akses eksklusif terkunci ke `TELEGRAM_CHAT_ID` Pak Pampam.

---

## 5. Rencana Tahapan Eksekusi (Implementation Roadmap)

| Fase | Target Pekerjaan |
| :---: | :--- |
| **Fase 1** | **Database & Backend**: Pembuatan tabel `payroll_results` di Supabase + script indeks + API query / batch upload. |
| **Fase 2** | **UI Uploader Excel di Dashboard**: Modal upload file rekap gaji 17.000+ data dengan progress bar + pencarian gaji di web. |
| **Fase 3** | **Telegram Bot Webhook Engine**: Pemasangan webhook interaktif dua arah (`/cek`, `/banding`, `/total`, `/rekap`). |
| **Fase 4** | **Testing & Polish**: Uji coba komparasi data multi-bulan, commit, push ke GitHub, dan live di Vercel. |
