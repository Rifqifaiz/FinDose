# 🚀 FinDose Backend API

Layanan REST API + server aplikasi untuk **FinDose** (Financial Dosage for Sickness and Emergency).

## Fitur
- **Akun & login**: daftar/masuk dengan email + password (lokal), siap dialihkan ke Supabase Auth.
- **Check-in Cepat & Lanjutan**: 7–14 langkah, termasuk keluhan, riwayat penyakit, alergi, dan penyakit kronik.
- **Risk engine deterministik**: 9 kondisi (maag, ISPA, sakit kepala, punggung, mata, diare, dehidrasi/ISK, insomnia, nyeri haid).
- **Kantong Sehat**: setor, tarik dana, autodebet mingguan (simulasi), potongan obat rutin bulanan otomatis, streak sehat.
- **Tanya Fifin**: asisten AI (Gemini Flash) yang memahami data user, dengan fallback lokal & deteksi tanda bahaya.

## Menjalankan
```bash
cd backend
cp .env.example .env # isi GEMINI_API_KEY agar Fifin memakai AI
npm start
```
- Laptop: `http://localhost:3001`
- HP (Wi-Fi yang sama): buka URL LAN yang dicetak di terminal, mis. `http://192.168.x.x:3001`. Di HP bisa "Tambahkan ke Layar Utama".
- Akun demo: `demo@findose.id` / `findose123`

```bash
npm run dev   # auto-reload
npm test      # tes unit & integrasi
```

Dokumentasi lengkap untuk AI / Claude Code ada di [CLAUDE.md](./CLAUDE.md).
