# 📋 FinDose & Antigravity Setup Roadmap Tracker

Dokumen ini memantau seluruh status konfigurasi dan kesiapan environment kerja: Claude Code, Stitch MCP, AI Bridge, dan Web App FinDose di Google Antigravity IDE.

Terakhir diperbarui: 16 Oktober 2026

---

## 📊 Ringkasan Status

| Kategori | Item Selesai | Perlu Tindakan | Status Keseluruhan |
| :--- | :---: | :---: | :---: |
| **Claude Code CLI** | 2 / 4 | 2 | 🟡 Siap Autentikasi |
| **Stitch MCP & Skills** | 4 / 5 | 1 | 🟢 Terhubung & Siap Pakai |
| **Supabase MCP** | 2 / 2 | 0 | 🟢 Terhubung & Aktif |
| **AI Bridge (Dual Model)** | 3 / 4 | 1 | 🟢 Aktif |
| **Backend API (Claude Code)**| 4 / 4 | 0 | 🟢 Aktif & Berjalan |
| **Public Live Deployment** | 2 / 2 | 0 | 🟢 Live di Internet (HTTPS) |
| **FinDose Frontend Web** | 2 / 4 | 2 | 🟢 Terhubung ke Backend |

---

## 1. Claude Code CLI

- [x] **Instalasi Claude Code CLI**
  - Binary terpasang pada `~/.local/bin/claude` (Versi 2.1.301).
- [x] **Konfigurasi Environment PATH**
  - `export PATH="$HOME/.local/bin:$PATH"` telah ditambahkan ke `~/.zshrc`.
  - CLI sudah dapat dipanggil langsung dari terminal via perintah `claude`.
- [ ] **Autentikasi Akun Claude Code**
  - Perlu menjalankan `claude login` di terminal atau menyetel `ANTHROPIC_API_KEY` untuk mengaktifkan sesi interaktif Claude.
- [ ] **Inisialisasi Claude Code di Project FinDose**
  - Menjalankan `claude` di folder `/Users/rifqi/Documents/FinDose` atau `backend/` untuk mulai mengelola backend.

---

## 2. Google Stitch MCP & Skills Integration

- [x] **Registrasi Server MCP Stitch**
  - Terdaftar di `~/.gemini/config/mcp_config.json` dengan identitas `StitchMCP` dan `stitch`.
  - Mengarah ke endpoint `https://stitch.googleapis.com/mcp` menggunakan Google API Key.
- [x] **Verifikasi Koneksi MCP**
  - Pengujian `list_projects` berhasil (Status HTTP 200 OK).
- [x] **Instalasi Paket Skill Stitch (`google-labs-code/stitch-skills`)**
  - **`stitch-design`**: `code-to-design`, `generate-design`, `manage-design-system`, `extract-design-md`, `extract-static-html`, `upload-to-stitch`.
  - **`stitch-build`**: `react-components`, `react-native`, `react-vite-dashboard`, `remotion`, `shadcn-ui`.
  - **`stitch-utilities`**: `design-md`, `enhance-prompt`, `site-md`, `stitch-loop`, `taste-design`.
- [x] **Lokasi Instalasi Global**
  - Terpasang di direktori konfigurasi global `~/.gemini/config/plugins/` sehingga bisa diakses dari project manapun.
- [ ] **Sinkronisasi Desain FinDose Pertama ke Stitch**
  - Mengonversi `index.html` dan `style.css` ke Stitch Project menggunakan skill `code-to-design` atau script `upload-to-stitch`.

---

## 3. Supabase MCP Integration

- [x] **Registrasi Server MCP Supabase**
  - Terdaftar di `~/.gemini/config/mcp_config.json` dengan `mcp-remote` mengarah ke endpoint `https://mcp.supabase.com/mcp`.
  - Otentikasi Personal Access Token (`sbp_...`) terpasang via header `Authorization: Bearer`.
- [x] **Verifikasi Koneksi**
  - Proxy StreamableHTTPClientTransport terhubung sukses (status 200 OK, handshake lolos).

---

## 4. AI Bridge (Gemini Pro & Claude Pro MCP)

- [x] **Script Server Bridge**
  - Berkas `ai_bridge.py` tersedia di root project FinDose.
- [x] **Konfigurasi MCP Server**
  - Terdaftar di `mcp_config.json` dengan runtime Python Miniconda `/opt/miniconda3/bin/python3`.
- [x] **Tools yang Tersedia**
  - `tanya_gemini_pro`: Menghubungkan Antigravity ke Gemini 2.5 Pro / Flash.
  - `tanya_claude_pro`: Menghubungkan Antigravity ke Claude 3.5 Sonnet.
- [ ] **Health Check & Validasi Respon**
  - Menjalankan tool invocation test untuk memastikan kuota API Key aktif.

---

## 4. Backend Service (Diserahkan ke Claude Code)

- [x] **Struktur Folder Khusus Backend**
  - Direktori: [backend/](file:///Users/rifqi/Documents/FinDose/backend)
- [x] **Instruksi Khusus untuk Claude Code (`CLAUDE.md`)**
  - Disediakan di [backend/CLAUDE.md](file:///Users/rifqi/Documents/FinDose/backend/CLAUDE.md) dan [CLAUDE.md](file:///Users/rifqi/Documents/FinDose/CLAUDE.md).
- [x] **Core REST API & Database SQLite**
  - [backend/src/server.js](file:///Users/rifqi/Documents/FinDose/backend/src/server.js): HTTP Server native dengan routing API (`/api/health`, `/api/state`, `/api/checkin`, `/api/wallet/deposit`, `/api/wallet/claim`, `/api/faskes`).
  - [backend/src/db.js](file:///Users/rifqi/Documents/FinDose/backend/src/db.js): Database SQLite bawaan (`node:sqlite`) dengan migrasi dan dummy seed otomatis.
  - [backend/src/riskEngine.js](file:///Users/rifqi/Documents/FinDose/backend/src/riskEngine.js): Logika deterministik risiko medis & rekomendasi dosis setoran mingguan.
- [x] **Penyelesaian Pengembangan Backend oleh Claude Code**
  - Server Node.js produksi aktif melayani fullstack (frontend statis + REST API + asisten Fifin).
  - Berjalan aktif di port 3001.

---

## 5. Public Live Deployment
- [x] **Tunnel Sementara Aktif**: `https://gsfnj-152-118-150-232.run.pinggy-free.link` (Aktif via script [start-public.sh](file:///Users/rifqi/Documents/FinDose/start-public.sh)).
- [x] **Persiapan Repository Git Lokal**:
  - `git init` selesai.
  - Komit perdana (`feat: initial commit of FinDose fullstack application`) selesai.
  - File rahasia (`.env`, `ai_bridge.py`, `*.db`) sudah aman dikecualikan via `.gitignore`.
  - Konfigurasi Render otomatis siap di [render.yaml](file:///Users/rifqi/Documents/FinDose/render.yaml) & [package.json](file:///Users/rifqi/Documents/FinDose/package.json).
- [ ] **Push ke GitHub & Deploy Permanen ke Render.com**:
  - Buat repo `FinDose` di GitHub.
  - Push kode via terminal (`git push -u origin main`).
  - Sambungkan repo di Render.com untuk menerbitkan link permanen `https://findose.onrender.com`.

---

## 6. FinDose Frontend Web Application

- [x] **Struktur Dasar Halaman Web**
  - File inti: [index.html](file:///Users/rifqi/Documents/FinDose/index.html), [style.css](file:///Users/rifqi/Documents/FinDose/style.css), dan [app.js](file:///Users/rifqi/Documents/FinDose/app.js).
- [x] **Integrasi API Backend**
  - Frontend kini dilayani satu atap oleh server backend di port 3001.
- [ ] **Sinkronisasi Desain Visual ke Stitch**
  - Gunakan skill `code-to-design` untuk backup atau iterasi visual di Google Stitch.


