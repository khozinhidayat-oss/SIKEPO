# SMART POINT SISWA - Decoupled Architecture (Vercel Frontend + GAS REST API Backend)

Aplikasi **SMART POINT SISWA** mendukung dua model arsitektur deployment:
1. **Decoupled Architecture (Utama)**: Frontend di-deploy di **Vercel** (Vite + React SPA) berkomunikasi via **HTTPS REST API (JSON)** dengan Backend di **Google Apps Script Web App** yang terhubung ke **Google Spreadsheet** dan **Google Drive**.
2. **Monolithic GAS Web App**: Aplikasi terintegrasi penuh di dalam Google Apps Script HTML Service.

---

## 📁 Struktur Proyek Refactored Terpisah

```text
Project
│
├── frontend/ (atau src/)    # Frontend React + Vite SPA (Ready for Vercel)
│   ├── public/             # Asset statis, logo, favicon
│   ├── src/
│   │   ├── assets/         # Stylesheet & Asset Visual
│   │   ├── components/     # Komponen UI Modular
│   │   ├── services/       # ApiService (src/services/api.ts) via fetch()
│   │   ├── utils/          # Storage, Helpers, & Auth Utilities
│   │   ├── views/          # Modul Utama Halaman
│   │   ├── App.tsx         # Main App Wrapper
│   │   └── types.ts        # Type Definitions
│   ├── .env.example        # VITE_GAS_API_URL Configuration
│   └── package.json        # Build Dependencies
│
├── backend/                # Backend REST API Google Apps Script (Ready for GAS Deploy)
│   ├── Code.gs             # Entry Point & Router (doGet / doPost)
│   ├── Api.gs              # REST API Router & Controller Engine
│   ├── Auth.gs             # Session & Authentication Service
│   ├── Dashboard.gs        # Aggregation & Dashboard Statistics
│   ├── Database.gs         # Spreadsheet CRUD Operations Engine
│   ├── Student.gs          # Student Data Management
│   ├── Class.gs            # Master Data Kelas
│   ├── Major.gs            # Master Data Jurusan
│   ├── Violation.gs        # Master Violations & Transactions
│   ├── Report.gs           # Reporting & Export Utilities
│   ├── User.gs             # User Account Operations
│   ├── Setting.gs          # Application Configuration Engine
│   ├── Backup.gs           # Database Backup & Restore to Drive
│   ├── Promotion.gs        # Student Grade Promotion Logic
│   ├── Maintenance.gs      # Maintenance Mode Controller
│   ├── Utilities.gs        # Helper Functions & Formatting
│   └── appsscript.json     # Manifest Web App Google Apps Script
│
└── Documentation/          # Dokumentasi & Panduan Deploy
    ├── PETUNJUK_DEPLOIMEN_VERCEL_GAS.md # Panduan Refactoring & Deploy Vercel + GAS
    └── PETUNJUK_DEPLOIMEN_GAS.md        # Panduan Deploy Native GAS
```

---

## ⚙️ Spesifikasi Teknologi Terpisah

1. **Frontend**: Vite + React, Tailwind CSS, Bootstrap 5, Lucide React, SweetAlert2.
2. **Backend**: Google Apps Script REST API Web App (V8 Engine).
3. **Komunikasi**: HTTPS REST API (`fetch()`) dengan payload JSON.
4. **Database**: Google Spreadsheet.
5. **Penyimpanan Media/Backup**: Google Drive.

---

## 🔒 Panduan Deployment Vercel & Google Apps Script

Silakan buka [PETUNJUK_DEPLOIMEN_VERCEL_GAS.md](./PETUNJUK_DEPLOIMEN_VERCEL_GAS.md) untuk langkah-langkah detail deployment backend Google Apps Script REST API dan frontend ke Vercel.

