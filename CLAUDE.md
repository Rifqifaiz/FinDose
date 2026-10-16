# FinDose Project Guide for Claude Code

## 🌐 Gambaran Proyek
FinDose adalah aplikasi micro-budgeting kesehatan preventif khusus mahasiswa. Aplikasi ini membantu mahasiswa mengalokasikan tabungan darurat medis berdasarkan evaluasi gaya hidup harian (jadwal makan, asupan kopi, pola tidur, dan ergonomi belajar).

## 👥 Pembagian Peran Kerja
- **Claude Code**: Bertanggung jawab mengelola dan mengembangkan **Backend FinDose** yang berada di dalam folder `backend/`.
- **Antigravity AI (Pair Programmer)**: Mengelola frontend (`index.html`, `style.css`, `app.js`), integrasi design Google Stitch, dan orkestrasi tools.

## 📂 Lokasi Kerja Utama Claude
Bekerjalah terutama di dalam direktori:
👉 `backend/`

Baca panduan arsitektur dan spesifikasi API backend di:
👉 `backend/CLAUDE.md`

## 💡 Quick Commands
```bash
# Menjalankan backend server
cd backend && npm run dev

# Memeriksa healthcheck backend
curl http://localhost:3001/api/health
```
