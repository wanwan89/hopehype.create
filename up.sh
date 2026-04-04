#!/bin/bash
echo "🚀 Memulai proses update ke GitHub..."

# Ngebungkus semua perubahan
git add .

# Ngasih catatan otomatis pake jam sekarang
git commit -m "Update rutin: $(date +'%d-%m-%Y %H:%M:%S')"

# Kirim ke GitHub
git push origin main

echo "✅ Berhasil! Project lo udah update di GitHub."





