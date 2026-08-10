# PANDUAN REFACTORING ARSITEKTUR & DEPLOYMENT
## FRONTEND VERCEL + BACKEND GOOGLE APPS SCRIPT (REST API)

Dokumen ini berisi panduan lengkap pengoperasian dan deployment aplikasi **SMART POINT SISWA** menggunakan arsitektur terpisah (*Decoupled Architecture*):
- **Frontend**: Deployed di Vercel (Vite + React / Single Page Application)
- **Backend**: Google Apps Script Web App (REST API Engine)
- **Database**: Google Spreadsheet
- **Storage**: Google Drive

---

## 1. STRUKTUR ARSITEKTUR

```text
User / Browser
      │
      ▼
Frontend (Vercel) ───[ HTTPS REST API / JSON ]───► Google Apps Script Web App
(React / Vite SPA)                                 (Backend Business Logic & Auth)
      │                                                         │
      └─────────────────────────────────────────────────────────┼───► Google Spreadsheet (DB)
                                                                └───► Google Drive (Backup Storage)
```

### Struktur Folder Frontend (`src/`)
```text
frontend/ (atau root proyek)
├── public/               # Asset statis, logo, favicon
├── src/
│   ├── assets/           # Gambar, ikon, & stylesheet
│   ├── components/       # Komponen UI modular (Navbar, Sidebar, Modals)
│   ├── services/         # API Service (src/services/api.ts) untuk fetch REST API
│   ├── utils/            # Helper storage, formatting, & auth utilities
│   ├── views/            # Halaman utama (Dashboard, Data Siswa, Pelanggaran, dll)
│   ├── App.tsx           # Entry point komponen React
│   ├── main.tsx          # Main React Mounting
│   └── types.ts          # TypeScript Type Definitions
├── .env.example          # Template Environment Variables
├── package.json          # Manifest Dependensi Frontend
└── vite.config.ts        # Konfigurasi Build Vite
```

### Struktur Folder Backend (`backend/`)
```text
backend/
├── Code.gs               # Entry Point & Router (doGet / doPost)
├── Api.gs                # Controller Utama REST API
├── Auth.gs               # Login, Logout, & Session Management
├── Dashboard.gs          # Statistik & Agregasi Metrics
├── Database.gs           # Abstraksi CRUD Google Spreadsheet
├── Student.gs            # Logika Bisnis Data Siswa
├── Class.gs              # Master Data Kelas
├── Major.gs              # Master Data Jurusan
├── Violation.gs          # Logika Pencatatan Pelanggaran & Transaksi
├── Report.gs             # Perhitungan Poin, Status Kedisiplinan, & Laporan
├── User.gs               # Manajemen User & Hak Akses (Role Admin/Kesiswaan)
├── Setting.gs            # Pengaturan Sistem & Profil Sekolah
├── Backup.gs             # Export & Import Database / Backup Drive
├── Promotion.gs          # Logika Kenaikan Kelas & Kelulusan
├── Maintenance.gs        # Mode Pemeliharaan Sistem
├── Utilities.gs          # Logger & Helper Functions
└── appsscript.json       # Manifest Web App Google Apps Script
```

---

## 2. DAFTAR ENDPOINT REST API (GOOGLE APPS SCRIPT)

Semua komunikasi menggunakan format **JSON** melalui method `POST` atau `GET` ke Web App Executive URL:

| Endpoint Action | Method | Deskripsi | Example Payload Body |
|---|---|---|---|
| `login` | POST | Autentikasi Pengguna | `{ "action": "login", "email": "...", "password": "..." }` |
| `logout` | POST | Terminasi Sesi | `{ "action": "logout" }` |
| `getSession` | GET/POST | Mengambil Sesi Aktif | `{ "action": "getSession" }` |
| `getDashboard` | GET/POST | Mengambil Ringkasan Dashboard | `{ "action": "getDashboard" }` |
| `getStudents` | GET/POST | Mendapatkan Semua Data Siswa | `{ "action": "getStudents" }` |
| `saveStudent` | POST | Tambah / Update Data Siswa | `{ "action": "saveStudent", "student": { ... } }` |
| `deleteStudent` | POST | Hapus Data Siswa | `{ "action": "deleteStudent", "id": "std-xxx" }` |
| `getViolations` | GET/POST | Master Data Pelanggaran | `{ "action": "getViolations" }` |
| `saveViolation` | POST | Simpan Master Pelanggaran | `{ "action": "saveViolation", "violation": { ... } }` |
| `getTransactions` | GET/POST | Riwayat Transaksi Pelanggaran | `{ "action": "getTransactions" }` |
| `addTransaction` | POST | Catat Pelanggaran Siswa | `{ "action": "addTransaction", "transaction": { ... } }` |
| `getReports` | GET/POST | Laporan Poin & Status | `{ "action": "getReports" }` |
| `getUsers` | GET/POST | Kelola Pengguna | `{ "action": "getUsers" }` |
| `getSettings` | GET/POST | Ambil Pengaturan Sistem | `{ "action": "getSettings" }` |
| `saveSettings` | POST | Simpan Pengaturan Sistem | `{ "action": "saveSettings", "settings": { ... } }` |
| `executePromotion` | POST | Proses Kenaikan Kelas | `{ "action": "executePromotion", "previewItems": [...], "oldYear": "2025/2026", "newYear": "2026/2027", "processedBy": "Admin" }` |
| `setMaintenanceMode` | POST | Aktif/Nonaktif Maintenance | `{ "action": "setMaintenanceMode", "enabled": true, "settingsPartial": { ... } }` |

---

## 3. LANGKAH DEPLOYMENT BACKEND (GOOGLE APPS SCRIPT)

1. Buka [Google Apps Script Editor](https://script.google.com).
2. Buat proyek baru bertajuk **"SMART POINT SISWA - BACKEND REST API"**.
3. Buat file-file yang berada di dalam direktori `backend/`:
   - Copy-paste seluruh isi `Code.gs`, `Api.gs`, `Auth.gs`, `Database.gs`, `Student.gs`, `Class.gs`, `Major.gs`, `Violation.gs`, `Report.gs`, `User.gs`, `Setting.gs`, `Backup.gs`, `Promotion.gs`, `Maintenance.gs`, `Utilities.gs`.
4. Buka **Project Settings (Ikon Roda Gigi)** -> Centang **"Show "appsscript.json" manifest file in editor"**.
5. Buka `appsscript.json` di Apps Script Editor dan ganti isinya dengan:
   ```json
   {
     "timeZone": "Asia/Jakarta",
     "dependencies": {},
     "webapp": {
       "access": "ANYONE_ANONYMOUS",
       "executeAs": "USER_DEPLOYING"
     },
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8"
   }
   ```
6. Klik **Deploy** -> **New Deployment**.
7. Pilih jenis: **Web App**.
   - **Description**: SMART POINT SISWA REST API v2.0
   - **Execute as**: *Me (email Anda)*
   - **Who has access**: *Anyone* (Setiap Orang, termasuk Anonim)
8. Klik **Deploy**, lalu berikan izin otorisasi Google Spreadsheet jika diminta.
9. Salin URL **Web App URL** yang dihasilkan.
   Example: `https://script.google.com/macros/s/AKfycbx.../exec`

---

## 4. LANGKAH DEPLOYMENT FRONTEND (VERCEL)

1. Upload / Push kode proyek ini ke GitHub Repository Anda.
2. Buka Dashboard [Vercel](https://vercel.com) dan pilih **Add New Project**.
3. Import repository GitHub Anda.
4. Konfigurasikan Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Buka bagian **Environment Variables**:
   - Tambahkan Key: `VITE_GAS_API_URL`
   - Value: masukkan **Web App URL** Google Apps Script dari Langkah 3.
     Example: `https://script.google.com/macros/s/AKfycbx.../exec`
6. Klik **Deploy**.
7. Vercel akan memproses build dan memberikan domain publik gratis (misal: `smart-point-siswa.vercel.app`).

---

## 5. FITUR DAN PENJAGAAN KEAMANAN

1. **CORS & Response Headers**: REST API Google Apps Script mengembalikan output dengan mime-type JSON (`ContentService.MimeType.JSON`) sehingga aman dipanggil dari Vercel via standard browser `fetch()`.
2. **Isolasi Database & Storage**: Credentials, Spreadsheet ID, dan Google Drive Folder ID dikelola sepenuhnya secara internal oleh backend Apps Script (`Database.gs`) dan tidak pernah terekspos ke client browser.
3. **Multi-Mode Support**: Jika `VITE_GAS_API_URL` belum dikonfigurasi, frontend secara cerdas menggunakan penyimpanan lokal persisten tingkat lanjut (*high-performance browser store*) tanpa error, sehingga pengujian langsung tetap berjalan mulus.
