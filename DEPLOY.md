# Deploy FinDose ke internet (Fly.io)

Satu container berisi aplikasi + API. Data (SQLite) disimpan di volume persisten `/data`.
Kamu perlu akun Fly.io (meminta kartu; biaya kecil untuk 1 mesin kecil + 1 GB volume).

## 0. Sebelum mulai
1. **Ganti (rotate) API key Gemini** yang sempat tertulis di `ai_bridge.py` dan di percakapan, buat key baru di https://aistudio.google.com/apikey.
2. File `ai_bridge.py` dan `.env` otomatis dikecualikan dari image (`.dockerignore`). Jangan hapus aturan itu.

## 1. Pasang CLI & login
```bash
brew install flyctl
fly auth login
```

## 2. Buat app dan volume
Jalankan dari folder `FinDose/` (tempat `fly.toml` berada).
```bash
fly launch --no-deploy --copy-config      # jawab "No" bila ditanya database / deploy
fly volumes create findose_data --region sin --size 1
```
Bila nama `findose` sudah dipakai, ganti `app = "..."` di `fly.toml`.

## 3. Isi rahasia
```bash
fly secrets set GEMINI_API_KEY="key-baru-kamu"
```

## 4. Deploy
```bash
fly deploy
fly status
```
Aplikasi tersedia di `https://<nama-app>.fly.dev` (HTTPS otomatis). Buka di HP dan pilih **Tambahkan ke Layar Utama**.

## 5. Cek
```bash
curl https://<nama-app>.fly.dev/api/health
fly logs
```

## Catatan penting
- **Satu mesin saja.** SQLite hanya aman dipakai oleh satu instance. Jangan `fly scale count 2`.
- **Mesin tidur saat sepi** (`auto_stop_machines`) dan bangun otomatis; pembukaan pertama bisa 2–5 detik lebih lambat. Ubah `min_machines_running = 1` bila ingin selalu siaga.
- **Backup:** `fly volumes snapshots list findose_data` (snapshot harian otomatis disimpan beberapa hari). Untuk salinan manual: `fly ssh sftp get /data/findose.db`.
- **Akun demo** dibuat per pengunjung dan dihapus setelah 24 jam. Untuk pengguna umum set `ENABLE_DEMO = "false"` di `fly.toml`.
- **Batas pemakaian Fifin:** 300 panggilan Gemini per hari (`GEMINI_DAILY_LIMIT`), setelah itu Fifin memakai jawaban lokal sampai hari berikutnya.
- **Domain sendiri:** `fly certs add domainmu.com`, lalu arahkan DNS sesuai petunjuk yang muncul.

## Platform lain
`Dockerfile` bisa dipakai di Railway / Render / VPS apa pun. Syaratnya: pasang disk persisten di `/data`, set `PORT` sesuai platform, dan isi `GEMINI_API_KEY` sebagai secret.

## Sebelum dipakai orang asing
Layar saat ini sudah menyebut bahwa saldo masih simulasi dan hasilnya bukan diagnosis. Untuk pengguna umum, lengkapi: kebijakan privasi (data kesehatan = data pribadi sensitif menurut UU PDP), cara hapus akun, dan verifikasi data klinik/nomor telepon di `backend/src/catalog.js`.
