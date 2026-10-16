#!/usr/bin/env bash
# ==============================================================================
# Script Update Otomatis LMS-7TKA-CBT untuk LXC Proxmox Server
# AMAN: Database SQLite (dev.db), Upload Siswa/BAP/Logo, dan .env TIDAK AKAN TERTIMPA
# ==============================================================================

set -e

echo "=== [1/5] Mengambil update terbaru dari GitHub ==="
git pull origin main

echo "=== [2/5] Menginstall dependensi paket terbaru ==="
npm install

echo "=== [3/5] Menerapkan pembaruan skema database (data aman & tidak hilang) ==="
npx prisma db push

echo "=== [4/5] Mengompilasi (Build) aplikasi Next.js ==="
npm run build

echo "=== [5/5] Me-restart service PM2 ==="
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart cbt-app || pm2 start npm --name "cbt-app" -- start
    pm2 save
    echo "=== Service PM2 berhasil direstart! ==="
else
    echo "PM2 tidak terdeteksi. Silakan jalankan 'npm run start' secara manual."
fi

echo "=============================================================================="
echo " Update Berhasil! Server telah diperbarui tanpa mengubah data peserta/ujian."
echo "=============================================================================="
