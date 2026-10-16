# Claude Code Backend Guide - FinDose API

Panduan kerja dan arsitektur untuk Claude sebagai pengembang backend FinDose (folder `backend/`).
Backend juga menyajikan frontend (file di root project), sehingga satu perintah `npm start` cukup untuk membuka aplikasi di laptop maupun HP.

---

## 🛠️ Tech Stack & Standar
- **Runtime**: Node.js ≥ 24.2 (ESM, `import.meta.main`, `process.loadEnvFile`).
- **Database**: SQLite lokal (`findose.db`) via `node:sqlite`. Path bisa diganti lewat env `FINDOSE_DB`.
- **Inti tanpa dependensi**: `node:http`, `node:sqlite`, `node:crypto`.
- **Tanpa dependensi npm**. Fifin memanggil Gemini lewat `fetch` (model `gemini-3.8-flash`, cadangan `gemini-3.5-flash`); tanpa `GEMINI_API_KEY` atau saat API gagal, Fifin memakai mesin jawaban lokal.
- **Frontend**: vanilla JS tanpa build step (`index.html`, `style.css`, `app.js`, `api.js`, `config.js` di root).

---

## 📂 Struktur
```text
FinDose/
├── index.html, style.css, app.js     # Aplikasi mobile (router hash, view, bottom sheet)
├── api.js                            # Klien API + adapter auth (LocalAuth / SupabaseAuth)
├── config.js                         # Pilihan auth provider & kredensial publik Supabase
├── manifest.webmanifest, icon.svg    # PWA (Add to Home Screen)
└── backend/
    ├── .env.example                  # Salin ke .env (GEMINI_API_KEY, AUTH_PROVIDER, ...)
    ├── src/
    │   ├── server.js     # HTTP server, router, static whitelist, URL LAN
    │   ├── db.js         # Skema SQLite v2, migrasi, seed akun demo
    │   ├── auth.js       # Register/login (scrypt + token sesi) & verifikasi token Supabase
    │   ├── security.js   # Hash password, token, id
    │   ├── services.js   # State user, kantong, autodebet, potongan obat kronik, streak, check-in
    │   ├── riskEngine.js # Skor risiko deterministik + dosis tabungan
    │   ├── catalog.js    # Pertanyaan, kondisi, riwayat, kronik, faskes, artikel (sumber tunggal)
    │   └── fifin.js      # Asisten AI Fifin (Gemini Flash) + fallback lokal + deteksi tanda bahaya
    └── test/             # node --test (engine + alur API end-to-end)
```

---

## 🚀 Perintah
```bash
npm start      # http://localhost:3001 + URL LAN untuk HP
npm run dev    # dengan auto-reload
npm test       # unit + integrasi (DB sementara, Fifin mode lokal)
```
Akun demo: tombol "Coba akun demo" (`POST /api/auth/demo`) membuat akun sementara per pengunjung berisi data contoh; dihapus otomatis setelah 24 jam. Matikan dengan `ENABLE_DEMO=false`.

---

## 🧠 Logika Inti
- **Check-in** punya 2 mode: `basic` (7 pertanyaan) dan `advanced` (+6 pertanyaan gaya hidup/keluhan + profil kesehatan). Hanya faktor yang ditanyakan di mode tersebut yang dihitung.
- **Skor**: tiap aturan di `RULES` (riskEngine.js) menyumbang poin ke satu kondisi; riwayat penyakit & penyakit kronik menambah poin (`boosts` di catalog.js). Poin ≥ 6 = Tinggi, ≥ 3 = Sedang.
- **Dosis mingguan** = max(Rp10.000, ⌈Σ(biaya × peluang level) / 4⌉ ke kelipatan Rp5.000) − diskon streak Rp5.000 (bila streak ≥ 2 minggu) + cadangan obat kronik (biaya bulanan × 12 / 52).
- **Streak sehat**: minggu berturut-turut (Senin–Minggu) yang check-in terakhirnya tanpa risiko Tinggi.
- **Proses otomatis saat `buildState`**: autodebet mingguan (simulasi) dan potongan obat rutin bulanan (`chronic_deductions`; status `pending` bila saldo kurang).

---

## 📡 Endpoint
Semua kecuali yang bertanda 🌐 wajib header `Authorization: Bearer <token>`. Respons mutasi menyertakan `state` terbaru.

| Method | Path | Keterangan |
|---|---|---|
| 🌐 GET | `/api/health` | Status, auth provider, mode Fifin |
| 🌐 GET | `/api/catalog` | Pertanyaan, kondisi, opsi riwayat & kronik, faskes, artikel |
| 🌐 POST | `/api/auth/register` | `{name, email, password}` → `{token, state}` |
| 🌐 POST | `/api/auth/demo` | Akun demo sementara (terisolasi per pengunjung) → `{token, state}` |
| 🌐 POST | `/api/auth/login` | `{email, password}` → `{token, state}` (rate limit 10x/10 menit) |
| POST | `/api/auth/logout` | Hapus sesi |
| GET | `/api/state` | User, kantong, profil kesehatan, streak, check-in terakhir, transaksi |
| PATCH | `/api/profile` | `{name?, campus?, hasConsented?}` |
| PUT | `/api/health-profile` | `{history[], chronic[{id, monthlyCost, name?}], allergies, chronicAutodeduct}` |
| PUT | `/api/wallet/settings` | `{target?, autodebitEnabled?, autodebitDay? (0=Min..6=Sab), autodebitAmount?}` |
| POST | `/api/wallet/deposit` | `{amount, title?, note?, category?}` |
| POST | `/api/wallet/claim` | `{category, amount, note?}`; kategori = id kondisi, `chronic:<id>`, `klinik`, `lainnya` |
| POST | `/api/checkin` | `{mode, answers, health?}` → `{checkin, state}` |
| GET | `/api/checkins`, `/api/checkins/:id` | Riwayat / detail check-in |
| POST | `/api/fifin/chat` | `{message}` → `{reply, source: ai\|lokal\|safety, mode}` |
| GET / DELETE | `/api/fifin/history` | Riwayat chat / hapus |

---

## 🔐 Migrasi ke Supabase (rencana)
1. Buat project Supabase, aktifkan Email Auth.
2. `config.js`: `authProvider: 'supabase'`, isi `supabaseUrl` & `supabaseAnonKey`.
3. `backend/.env`: `AUTH_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
4. Backend memverifikasi access token ke `GET {SUPABASE_URL}/auth/v1/user` dan membuat baris user lokal dengan id Supabase. Data aplikasi tetap di SQLite.
5. Tahap berikutnya (opsional): pindahkan tabel ke Postgres Supabase dengan RLS per `user_id`. Skema SQLite di `db.js` sudah multi-user dan dapat dipetakan 1:1.

Catatan: jalur Supabase sudah ditulis tetapi **belum diuji** terhadap project Supabase sungguhan.

---

## 📌 Roadmap
1. Uji & rampungkan jalur Supabase, lalu pindahkan data ke Postgres + RLS.
2. Streaming jawaban Fifin (SSE) agar teks muncul bertahap.
3. Export laporan riwayat (CSV/PDF).
4. Verifikasi data faskes & nomor telepon sebelum rilis publik.

---

## 🚢 Produksi
Lihat [../DEPLOY.md](../DEPLOY.md). Ringkas: satu container (Dockerfile di root), SQLite di volume `/data`, rahasia lewat env/secrets.
- Header keamanan + CSP dipasang di semua respons; CORS tertutup kecuali `CORS_ORIGIN` diisi.
- Batas laju: daftar 10/jam/IP, masuk 40/10 mnt/IP + 10/10 mnt/email, demo 20/jam/IP, chat 20/10 mnt/user, Gemini 300 panggilan/hari (`GEMINI_DAILY_LIMIT`).
- Hanya **satu instance** (SQLite + batas laju di memori). Untuk skala, pindah ke Postgres (rencana Supabase).
