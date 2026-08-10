# Panduan Deployment Google Apps Script (Web App)

Dokumen ini memuat langkah-langkah mempublikasikan aplikasi **SMART POINT SISWA** ke Google Apps Script Web App.

---

## 🚀 Langkah Deploy ke Google Apps Script

1. **Buka Google Apps Script / Google Spreadsheet**
   - Buat Spreadsheet baru di Google Drive dengan nama `DATABASE SMART POINT SISWA`.
   - Pilih menu **Ekstensi > Apps Script**.

2. **Salin File Backend (`.gs`)**
   - Buat file `.gs` di Apps Script Editor sesuai daftar pada folder `Gas Code/`:
     - `Code.gs`
     - `Auth.gs`
     - `Dashboard.gs`
     - `Database.gs`
     - `Student.gs`
     - `Violation.gs`
     - `Report.gs`
     - `User.gs`
     - `Setting.gs`
     - `Backup.gs`
     - `Promotion.gs`
     - `Maintenance.gs`
     - `Utilities.gs`
     - `Config.gs`

3. **Salin File Frontend (`.html`)**
   - Buat file `.html` di Apps Script Editor sesuai daftar pada folder `HTML Code/`:
     - `index.html`
     - `login.html`
     - `dashboard.html`
     - `sidebar.html`
     - `navbar.html`
     - `data_siswa.html`
     - `master_pelanggaran.html`
     - `input_pelanggaran.html`
     - `laporan_point.html`
     - `kelola_user.html`
     - `setting.html`
     - `backup_restore.html`
     - `maintenance.html`
     - `kenaikan_kelas.html`
     - `footer.html`
     - `javascript.html`
     - `style.html`

4. **Konfigurasi `appsscript.json`**
   - Buka **Project Settings (Ikon Roda Gigi)** pada Apps Script editor.
   - Centang opsi *"Show "appsscript.json" manifest file in editor"*.
   - Salin isi `JSON Code/appsscript.json` ke file manifest tersebut.

5. **Inisialisasi Database Otomatis**
   - Pada toolbar dropdown fungsi Apps Script Editor, pilih fungsi `setupDatabase` lalu klik tombol **Run**.
   - Fungsi `setupDatabase()` akan secara otomatis:
     - Membuat seluruh 11 sheet yang diperlukan (`users`, `siswa`, `jurusan`, `kelas`, `master_pelanggaran`, `transaksi_pelanggaran`, `settings`, `activity_log`, `backup_history`, `promotion_history`, `maintenance_history`).
     - Menambahkan header baris pertama dengan format yang tepat.
     - Memasukkan data awal default (Pengaturan sekolah & akun Administrator utama `admin` / `admin123`).
     - Menampilkan laporan ringkasan inisialisasi pada Execution Log.
     - Bersifat *idempotent* (aman dijalankan berulang kali tanpa membuat sheet atau data duplikat).

6. **Deploy Web App**
   - Klik tombol **Deploy > New deployment**.
   - Pilih jenis deployment: **Web app**.
   - Isi konfigurasi:
     - **Description:** `SMART POINT SISWA v1.0`
     - **Execute as:** `Me (Email Anda)`
     - **Who has access:** `Anyone` (atau Sesuai kebutuhan domain sekolah)
   - Klik **Deploy**, lalu berikan izin otorisasi (Authorize access).
   - Salin **Web App URL** yang dihasilkan.
