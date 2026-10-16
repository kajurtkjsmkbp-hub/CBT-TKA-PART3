# LMS-7TKA-CBT (Computer Based Test Standar ANBK / TKA)

Aplikasi Ujian Berbasis Komputer (CBT / TKA) modern berbasis web, dirancang khusus untuk pelaksanaan asesmen dan ujian sekolah dengan skala besar, cepat, stabil, serta mendukung rotasi sesi multi-hari dan fitur proctoring lengkap.

---

## 🛠️ Tech Stack & Spesifikasi
- **Framework:** Next.js 15 (App Router, React 19 Client & Server Components)
- **Database Engine:** SQLite (`prisma/dev.db` - ringan, portabel, tanpa perlu daemon server SQL terpisah)
- **ORM:** Prisma ORM v6
- **Styling:** Tailwind CSS (Responsif & Cetak Presisi Standar A4 via `@media print`)
- **Excel Engine:** `xlsx` (SheetJS) untuk ekspor/impor siswa, sesi, bank soal, dan analisis butir soal
- **Process Manager:** PM2 (untuk server production Proxmox / Linux)

---

## 🌟 Fitur Utama
1. **Pusat Sesi & Rotasi Multi-Hari (Standar TKA / ANBK Nasional):**
   - Mendukung pembagian Gelombang (1 & 2), Hari Ujian (Hari 1 s.d. 4), dan Sesi (1 s.d. 3).
   - Generator Pola Rotasi Cepat (1-2-1-2, 2-1-2-1, Semua Sesi 1, dll.).
   - Ekspor & Impor Matriks Sesi berbasis Excel.
2. **Sistem Keamanan & Anti-Cheat Canggih:**
   - Deteksi perpindahan tab/jendela otomatis (`visibilitychange`).
   - Pelanggaran ke-3 langsung mengunci layar (**BLOCKED**) secara persisten di `localStorage`.
   - Pembukaan blokir hanya bisa dilakukan dengan **PIN Proktor**.
   - Single-device login guard (`isLogin` tracking).
3. **Live Monitoring & Fitur Proktor:**
   - Live status siswa (Mengerjakan, Selesai, Terblokir).
   - Reset login siswa jika terjadi komputer mati listrik / freeze.
   - **Kompensasi Waktu Ekstra (+10 / +15 Menit)**: countdown siswa otomatis bertambah tanpa reload halaman.
   - Selesai Paksa (Force Submit).
4. **Dokumen Resmi Ujian Siap Cetak (A4 Layout):**
   - **Kartu Peserta:** 2 kartu per lembar A4, dilengkapi kop, foto 3x4, rincian jadwal multi-hari, dan kredensial login.
   - **Daftar Hadir & BAP:** Tabel tanda tangan zig-zag resmi, rekapitulasi kehadiran, tanda tangan proktor & pengawas.
   - **Kartu Meja Komputer:** 4 kartu per lembar A4 dengan nomor meja besar siap gunting.

---

## 🚀 Panduan Manual Instalasi di LXC Proxmox VE

Panduan ini berlaku untuk Container LXC berbasis **Debian 12 (Bookworm)** atau **Ubuntu 22.04 / 24.04 LTS**.

### 1. Rekomendasi Resource Container LXC Proxmox
- **Cores:** 2 - 4 vCPU
- **RAM:** 2 GB - 4 GB (Untuk kelancaran proses `next build`)
- **Disk:** 10 GB - 20 GB (SSD / NVMe direkomendasikan)
- **OS Template:** Debian 12 Standard atau Ubuntu 22.04 / 24.04

---

### 2. Langkah Persiapan Sistem di LXC
Masuk ke console LXC container Anda melalui Proxmox web GUI atau SSH, lalu jalankan:

```bash
# Update repository & upgrade paket
apt update && apt upgrade -y

# Install utilitas penting & compiler
apt install -y curl git wget build-essential nginx

# Install Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verifikasi versi Node.js & npm
node -v   # Pastikan v20.x.x
npm -v

# Install PM2 Process Manager secara global
npm install -g pm2
```

---

### 3. Clone Repository & Konfigurasi Aplikasi

```bash
# Clone source code ke direktori web
git clone https://github.com/kajurtkjsmkbp-hub/CBT-TKA-PART3.git /var/www/cbt-app

# Masuk ke direktori aplikasi
cd /var/www/cbt-app

# Gandakan template environment
cp .env.example .env

# Install seluruh dependency project
npm install

# Inisialisasi struktur database SQLite (Membuat file dev.db baru)
npx prisma db push

# Buat folder upload dan pastikan izin hak akses direktori aman
mkdir -p public/uploads/bap public/uploads/logo public/uploads/siswa
chmod -R 775 public/uploads

# Build aplikasi Next.js untuk production
npm run build
```

---

### 4. Jalankan Aplikasi dengan PM2 (Auto-Start saat Booting)

```bash
cd /var/www/cbt-app

# Jalankan service Next.js production via PM2
pm2 start npm --name "cbt-app" -- start

# Simpan state PM2 agar otomatis jalan setelah reboot Proxmox / LXC
pm2 save
pm2 startup
# (Salin & jalankan baris perintah 'env PATH=...' yang dimunculkan oleh pm2 startup jika ada)
```

---

### 5. Konfigurasi Nginx Reverse Proxy (Port 80 ke Port 3000)

Buat file konfigurasi Nginx untuk aplikasi CBT:

```bash
nano /etc/nginx/sites-available/cbt
```

Salin konfigurasi berikut ke dalam file tersebut:

```nginx
server {
    listen 80;
    server_name _; # Atau isi dengan IP Container / Domain lokal sekolah

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:

```bash
# Aktifkan site
ln -s /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Uji konfigurasi Nginx
nginx -t

# Restart Nginx
systemctl restart nginx
```

Aplikasi CBT sekarang sudah aktif dan dapat diakses melalui browser di alamat IP Container LXC Anda (contoh: `http://192.168.1.100`).

---

### 6. Akun Login Default Sistem

- **Portal Login:** `/login`
- **Username Default Administrator:** `admin`
- **Password Default Administrator:** `admin`
- *(Opsional Data Demo)*: Kunjungi URL `http://IP_SERVER/api/seed` melalui browser untuk menginjeksi contoh data sekolah, mata pelajaran, paket soal, dan akun siswa percobaan.

---

## 🔒 Mekanisme Update dari Lokal Tanpa Menimpa Data Server

Pertanyaan penting saat mengelola aplikasi CBT:  
> **"Bagaimana jika ada perbaikan bug / update fitur dari komputer lokal pengembang? Apakah data siswa, nilai, dan soal di server Proxmox akan hilang atau tertimpa saat di-update?"**

### Jawabannya: **DATA SERVER 100% AMAN.**

### Mengapa Aman?
1. **Database Terisolasi (`.gitignore`):** File database SQLite (`prisma/dev.db`) dan seluruh file transaksi (`.db-wal`, `.db-shm`) sengaja **TIDAK DITRACK** di Git. Git hanya mengelola kode program (`src/`, halaman, logika, style), bukan data database.
2. **File Upload Terlindungi:** Folder `public/uploads/` (foto siswa, tanda tangan, logo, BAP) juga diabaikan oleh Git sehingga foto yang diunggah di server tidak akan pernah terhapus atau tertimpa.
3. **File Konfigurasi Terisolasi:** File `.env` bersifat lokal per server dan tidak ditimpa oleh git repository.

---

### Cara Melakukan Update di Server Proxmox LXC

#### Opsi A: Menggunakan Script Otomatis (Direkomendasikan)
Cukup jalankan satu perintah:

```bash
cd /var/www/cbt-app
chmod +x update.sh
./update.sh
```

#### Opsi B: Langkah Manual Update Langkah Demi Langkah

```bash
# 1. Masuk ke direktori aplikasi
cd /var/www/cbt-app

# 2. Ambil perubahan kode terbaru dari GitHub
git pull origin main

# 3. Update library jika ada dependensi baru
npm install

# 4. Sinkronkan perubahan skema database tanpa menghapus data yang sudah ada
npx prisma db push

# 5. Kompilasi ulang aset produksi Next.js
npm run build

# 6. Restart server CBT tanpa downtime berarti
pm2 restart cbt-app
```

> [!NOTE]
> Perintah `npx prisma db push` secara cerdas hanya akan menambahkan kolom atau tabel baru jika ada penyesuaian skema database, **tanpa menghapus baris data siswa, soal, maupun nilai ujian yang sudah ada**.

---

## 💾 Rekomendasi Backup Rutin Database

Sebelum pelaksanaan ujian besar, Anda dapat mem-backup database SQLite server secara instan cukup dengan meng-copy file `dev.db`:

```bash
# Backup instan dengan timestamp
cp /var/www/cbt-app/prisma/dev.db /root/backup_cbt_$(date +%Y%m%d_%H%M%S).db
```

---

## 📄 Lisensi
Hak Cipta © 2026 Tim Pengembang LMS-7TKA-CBT. Didesain untuk efisiensi ujian sekolah berbasis komputer di Indonesia.
