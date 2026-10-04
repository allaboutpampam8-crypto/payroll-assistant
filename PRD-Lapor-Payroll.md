# Product Requirement Document (PRD) v2.1
## Asisten Pribadi Payroll ("Payroll Assistant") - PT Pelindo Daya Sejahtera

---

### 1. Ringkasan Eksekutif
Aplikasi **Asisten Payroll** adalah platform asisten pribadi berbasis web & PWA (Progressive Web App) yang dirancang khusus untuk mempermudah PIC/Pengelola Payroll di **PT Pelindo Daya Sejahtera** dalam mencatat, merekap, dan mengawal tindak lanjut atas:
1. **Permintaan Data** (slip gaji, bukti potong pajak, surat keterangan, riwayat iuran, dll.)
2. **Koreksi Gaji** (kekurangan jam lembur, selisih perhitungan, dsb.)
3. **Pemutakhiran Gaji** (penyesuaian grade pokok, perubahan nomor rekening, dsb.)

---

### 2. Standarisasi Data & Struktur

* **Organisasi**: PT Pelindo Daya Sejahtera
* **Identitas Pegawai**: **NRP** (Nomor Registrasi Pegawai)
* **Unit / Wilayah Kerja**: **Project** (contoh: Project Terminal Petikemas, Project Logistik, Project Kantor Pusat, dsb.)
* **Kategori Laporan**:
  1. `Permintaan Data`
  2. `Koreksi Gaji`
  3. `Pemutakhiran Gaji`
* **Estimasi Nominal Selisih**: Bersifat **Opsional** (non-mandatory), karena laporan kategori Permintaan Data tidak memiliki nilai nominal selisih.
* **Siklus Status Laporan (Sederhana 3 Tahap)**:
  * 🟡 **OPEN**: Laporan baru masuk dan belum ditangani.
  * 🔵 **CROSSCHECK**: Laporan sedang diteliti / diverifikasi ke pihak project, absensi, atau keuangan.
  * 🟢 **CLOSE**: Laporan telah tuntas diselesaikan.

---

### 3. Fitur Utama Asisten

#### 3.1. Dashboard & Smart Reminder
* **Daily Assistant Briefing**: Notifikasi pintar sapaan asisten yang menghitung sisa hari menuju tanggal **Cut-Off Payroll** dan merangkum jumlah laporan yang masih berstatus *Open* dan *Crosscheck*.
* **Ringkasan Kartu Status (4 Kartu)**:
  * Total Laporan Masuk
  * Open
  * Crosscheck
  * Close
* **Daftar Tugas Interaktif**:
  * 1-klik ubah status (Open ➔ Crosscheck ➔ Close).
  * Filter pencarian berdasarkan nama pegawai, NRP, Project, dan nomor tiket.
  * Tautan langsung WhatsApp untuk konfirmasi ke nomor kontak pegawai pelapor.

#### 3.2. Pencatatan Laporan (Dual-Mode)
* **Catat Cepat Asisten**: Modal input instan untuk PIC mencatat laporan dari chat WhatsApp / telepon dalam < 30 detik.
* **Form Mandiri Karyawan (`/lapor`)**: Form publik mobile-friendly yang dapat dibagikan tautannya ke grup kantor. Karyawan menginput Nama, NRP, Project, Kategori, Keterangan, dan foto bukti.

#### 3.3. Rekapitulasi & Ekspor
* Rekap data siap ekspor ke file **Excel (.xlsx)** lengkap dengan kolom No. Tiket, Tanggal, Nama Pegawai, NRP, Project, Kategori, Status, Target Selesai, dan Catatan Solusi/Crosscheck.

#### 3.4. Progressive Web App (PWA)
* Dapat di-install langsung di layar utama smartphone (Android & iOS).
* Tampilan layar penuh (*standalone*), cepat, dan nyaman diakses saat bepergian (*mobile-first*).
