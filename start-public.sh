#!/bin/bash
# Script untuk menyalakan FinDose dan membuat link publik instan

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🚀 Memeriksa FinDose Server..."
if ! lsof -i :3001 > /dev/null 2>&1; then
  echo "Menyalakan server FinDose di port 3001..."
  PORT=3001 node backend/src/server.js &
  sleep 2
else
  echo "✅ Server FinDose sudah berjalan di port 3001."
fi

echo ""
echo "🌐 Menghubungkan tunnel publik (HTTPS)..."
echo "Tekan Ctrl+C untuk berhenti kapan saja."
echo ""
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:3001 a.pinggy.io
