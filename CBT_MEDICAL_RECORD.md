# LMS-7TKA-CBT: Project Architecture & Medical Record

Dokumen ini berfungsi sebagai **Rekam Medis & Arsitektur Tunggal** dari aplikasi **LMS-7TKA-CBT**. Setiap pengembang maupun AI Assistant yang melanjutkan pengembangan proyek ini dapat dengan cepat memahami alur program, arsitektur database, keputusan desain, dan fitur-fitur yang sudah diimplementasikan tanpa harus membaca ulang seluruh kode.

**Terakhir Diperbarui:** 16 Oktober 2026 (Status: Stabil, Terverifikasi & Terintegrasi GitHub / LXC Proxmox)  
**Repositori GitHub:** [https://github.com/kajurtkjsmkbp-hub/CBT-TKA-PART3](https://github.com/kajurtkjsmkbp-hub/CBT-TKA-PART3) (Branch: `main`)

---

## 1. Teknologi & Arsitektur Utama
- **Framework:** Next.js 15 (App Router, Server Components + React 19 Client Components `"use client"`)
- **Database Engine:** SQLite (`prisma/dev.db`)
- **ORM:** Prisma ORM v6 (`prisma/schema.prisma`)
- **Styling:** Tailwind CSS murni (desain profesional, responsif, print-friendly `@media print`)
- **State & Autentikasi:**
  - Server-side Session: Cookies bawaan Next.js (`cbt_session` bernilai `"ADMIN" | "GURU" | "SISWA"` dan `cbt_user_id`)
  - Hardcoded Fallback Admin: `admin` / `admin` untuk kemudahan inisialisasi awal server
  - Single Login Enforcement: Field `isLogin` Boolean pada tabel `User`
  - Anti-Cheat & Local Persistence: `localStorage` (`cbt_peringatan`, `cbt_blocked`, `cbt_token`, `cbt_answers`, `cbt_ragu`, `cbt_shuffled_soal`, `cbt_exam_state`)
- **Excel Engine:** `xlsx` (SheetJS) untuk ekspor dan impor matriks sesi / bank soal / analisis butir soal
- **Production Stack (LXC Proxmox):** Node.js 20 LTS, PM2 Process Manager, Nginx Reverse Proxy (Port 80 -> 3000)
- **Local Dev Server:** Dijalankan via `npm run dev` pada `http://localhost:3000`

---

## 2. Struktur Database (Prisma Schema Reference)

### 2.1 Ringkasan Entitas & Relasi
| Model | Deskripsi & Field Kunci |
|---|---|
| **User** | Akun pengguna (`ADMIN`, `GURU`, `SISWA`). Field penting: `isLogin` (flag login tunggal), `foto`, `gelombang` (1/2), `sesiHari1..4` (rotasi sesi multi-hari), `ruang` (string lab), `sekolahId`, `rombelId`. |
| **Sekolah** | Master identitas sekolah (`nama`, `npsn`, `alamat`). Terhubung ke `User`. |
| **TingkatKelas** | Level kelas (10, 11, 12, 13). Dirender otomatis dalam Angka Romawi (X, XI, XII, XIII) pada seluruh antarmuka dan cetakan dokumen. |
| **Jurusan** | Program keahlian / kejuruan (misal: TKJ, RPL, DKV). |
| **Rombel** | Rombongan Belajar. Kombinasi unik `tingkatKelasId` + `jurusanId` + `nomorKelas` (String, bisa "1", "2", atau huruf "A", "B"). Contoh: `XII TKJ 1`, `XI IPA A`. |
| **MataPelajaran** | Master mapel. Mendukung edit inline pada dashboard admin. |
| **Ujian** | Paket ujian. Menampung pengaturan `acakSoal`, `acakOpsi`, `durasiMenit`, relasi ke `MataPelajaran` dan `Soal[]`. |
| **Soal** | Butir pertanyaan. Field: `kontenSoal` (HTML), `opsiJawaban` (JSON string array), `kunciJawaban` (string opsional), `tipeSoal` (`PG`, `PGK`, `ISIAN`, `ESSAY`). **Aturan:** Soal import `.txt` menyimpan `isCorrect: true` di dalam JSON `opsiJawaban`. |
| **SesiUjian** | Token sesi ujian aktif. Field: `token`, `status` (`AKTIF`, `SELESAI`), `waktuMulai`, `waktuSelesai`, `gelombang`, `hariKe` (1-4), `sesi` (1-3), `ruang`. |
| **HasilUjian** | Riwayat & rekaman ujian siswa. Field: `detailJawaban` (JSON string map jawaban), `nilaiAkhir`, `status` (`MENGERJAKAN`, `SELESAI`), `tambahanMenit` (Int, kompensasi waktu individual dari proktor). |
| **Pengaturan** | Key-Value Store konfigurasi sistem: `NAMA_SEKOLAH`, `LOGO_PATH`, `PIN_PROKTOR`, `TGL_HARI_1..4`, `JAM_SESI_1..3`. |

---

## 3. Peta Rute & Halaman (Route Directory)

### 3.1 Portal Siswa & Autentikasi
- `/login`: Halaman login terpadu siswa/guru/admin dengan validasi anti-double login (`isLogin`). Memiliki proteksi server-side redirect: jika siswa dengan sesi aktif mencoba ke `/login`, langsung diarahkan kembali ke `/cbt`.
- `/cbt`: Antarmuka pengerjaan ujian siswa. Bekerja sebagai State Machine: `TOKEN` → `RUNNING` → `FINISHED`. Juga menangani state darurat `BLOCKED` (kecurangan tab-switch) dan `COMPLETED` (ujian sudah pernah dikerjakan).
- `/api/logout`: Endpoint penghapusan cookies dan reset `isLogin = false` pada database.
- `/api/cbt-sync`: Endpoint sinkronisasi jawaban siswa otomatis secara berkala (debounced 2 detik).
- `/api/seed`: Endpoint pengisian data awal/demo jika diperlukan di server baru.

### 3.2 Dashboard Administrasi (`/admin/*`)
- `/admin/siswa`: Manajemen master siswa, upload foto siswa, import siswa Excel, dan pintasan cetak kartu.
- `/admin/kelas`: Manajemen Tingkat Kelas, Jurusan, dan Rombel (edit inline mapel & format Romawi).
- `/admin/soal`: Bank soal & paket ujian. Mendukung input manual dan upload massal via file `.txt`.
- `/admin/status-tes`: Rilis Token Ujian. Filter per Gelombang (1-2), Hari Ke- (1-4), Sesi (1-3), dan Ruang. Dilengkapi form pengubahan cepat PIN Proktor di header.
- `/admin/sesi`: **Pusat Pengaturan Sesi & Gelombang (Standar TKA / ANBK Nasional)**:
  - Form `JadwalUjianCard`: Input langsung Hari & Tanggal Pelaksanaan (Hari 1-4) dan Jam Pelaksanaan tiap Sesi (Sesi 1-3).
  - Tabel Matriks Interaktif `SesiMatrixTable`: Pembagian gelombang, rotasi sesi hari 1 s.d. 4, dan ruang per siswa.
  - Generator Pola Cepat (Bulk Presets): Rotasi Standar (1-2-1-2), Rotasi Silang (2-1-2-1), Semua Sesi 1, Semua Sesi 2, Semua Sesi 3.
  - Export Excel (`/api/export-sesi`) & Import Excel langsung memetakan kembali perubahan sesi siswa.
- `/admin/monitoring`: Live Monitoring real-time seluruh siswa yang sedang mengerjakan. Fitur proctoring:
  - Reset Login siswa (jika PC mati lampu / freeze).
  - Selesai Paksa (Force Submit).
  - **Kompensasi Tambahan Waktu (+10 menit / +15 menit)** per siswa saat terjadi gangguan teknis.
  - Form edit langsung PIN Buka Blokir Proktor.
- `/admin/hasil`: Laporan nilai, analitik statistik, dan ekspor analisis butir soal format Excel.
- `/admin/pengaturan`: Pengaturan kop surat, logo sekolah, identitas kepala sekolah, dan jadwal sesi global.

### 3.3 Suite Dokumen & Cetakan Resmi Ujian (Print Engine)
Seluruh dokumen resmi dicetak dalam halaman/tab baru (`target="_blank"`) dengan format CSS `@media print` presisi standar kertas A4:
- `/cetak-kartu`:
  - Format grid 2 kartu per lembar A4.
  - Mendukung cetak massal per Rombel (`?rombelId=...`), per Gelombang (`?gelombang=...`), maupun cetak kartu individu (`?siswaId=...`).
  - Layout resmi: Logo Sekolah di kiri, Kop judul rata tengah, pas foto 3x4, tabel identitas rapi, tabel jadwal sesi multi-hari lengkap dengan tanggal & jam WIB, kotak akun login (Username/Password kuning terang), dan tanda tangan pengawas.
- `/cetak-presensi`:
  - Berita Acara & Daftar Hadir resmi ruang ujian.
  - Filter: Gelombang, Hari ke-X, Sesi, Ruang, dan Rombel.
  - Format tabel presensi tanda tangan zig-zag (nomor ganjil di kiri, nomor genap di kanan).
  - Rekapitulasi kehadiran (Jumlah Peserta, Hadir, Tidak Hadir) serta kolom tanda tangan Proktor dan Pengawas Ruang.
- `/cetak-meja`:
  - Kartu Meja Komputer / Lab PC (4 kartu per lembar A4 siap potong/gunting).
  - Dilengkapi label nomor meja besar (`MEJA 01`, `MEJA 02`), identitas siswa, ruang, gelombang, ringkasan jadwal sesi H1-H4, dan akun login siswa.

---

## 4. Alur & Logika Inti Sistem (Core Logic & Workflows)

### 4.1 Validasi Masuk CBT Berdasarkan Token, Gelombang, Hari & Sesi
Di dalam `checkTokenAndFetchExam`:
1. Sistem mengecek sesi ujian aktif yang cocok dengan `token`.
2. Jika token ditemukan dan valid (<15 menit atau siswa sudah berstatus `MENGERJAKAN`):
   - Sistem mencocokkan `user.gelombang === sesi.gelombang`.
   - Sistem mencocokkan sesi siswa pada hari terkait: `user['sesiHari' + sesi.hariKe] === sesi.sesi`.
   - Sistem mencocokkan `user.ruang === sesi.ruang`.
3. Jika terdapat ketidakcocokan, siswa diberikan notifikasi informatif mengenai jadwal sesi/ruang/gelombang mereka yang sebenarnya.

### 4.2 Anti-Cheat & Penanganan Pelanggaran
1. Deteksi perpindahan tab/jendela via event `visibilitychange`.
2. Setiap pelanggaran memicu modal peringatan modern (warning amber gradient) dan menambah counter `cbt_peringatan`.
3. Pelanggaran ke-3 langsung mengubah status ke `BLOCKED` dan mengunci layar ujian.
4. Status blokir dipersistensikan di `localStorage` (`cbt_blocked = "true"`, `cbt_token`).
5. Membuka blokir hanya bisa dilakukan dengan memasukkan **PIN Proktor** yang valid (diperiksa via server action `verifyProctorPin`).

### 4.3 Pengacakan Soal & Opsi (Fisher-Yates)
1. Jika paket ujian mengaktifkan `acakSoal`, urutan array soal diacak saat ujian pertama kali dimulai.
2. Jika paket ujian mengaktifkan `acakOpsi`, urutan opsi jawaban (A, B, C, D) diacak untuk tiap soal.
3. Hasil urutan acak disimpan di `localStorage` (`cbt_shuffled_soal`) agar urutan tidak berubah ketika siswa me-refresh halaman browser.

### 4.4 Kompensasi Waktu Ujian Individual (Extra Time)
1. Pada `HasilUjian`, tersimpan field `tambahanMenit Int @default(0)`.
2. Proktor dapat mengklik tombol `+10 mnt` pada halaman Live Monitoring (`/admin/monitoring`). Server action `addExtraTimeAction` mengupdate field `tambahanMenit` di database.
3. Saat siswa mengerjakan ujian di `/cbt`, batas waktu efektif dihitung dari:
   $$\text{Effective Deadline} = \text{waktuSelesai} + (\text{tambahanMenit} \times 60.000\text{ ms})$$
4. Timer countdown siswa secara otomatis bertambah tanpa perlu me-refresh halaman.

---

## 5. Keputusan Desain UI & Workflow Penting
1. **Pemisahan Mode Cetak Dokumen ke Tab Baru (`target="_blank"`):**
   - Halaman cetak dokumen (`/cetak-kartu`, `/cetak-presensi`, `/cetak-meja`) selalu dibuka pada tab baru.
   - **Rasional:** Pengawas dan proktor membutuhkan tampilan bersih siap cetak tanpa terdistraksi elemen sidebar/header admin, serta dapat langsung memanfaatkan dialog cetak browser (`window.print()`) tanpa mengganggu tabel matriks kerja admin di tab utama.
2. **Tabel Matriks Sesi yang Ramping & Cepat:**
   - Tabel `/admin/sesi` didesain bersih dan fokus pada input gelombang, sesi 1-4, ruang, bulk presets, serta import/export Excel.
   - Kolom AKSI hanya menampilkan tombol `Simpan` per baris untuk meminimalisasi kesalahan klik.
3. **Penyimpanan Kunci Jawaban Soal TXT:**
   - Soal yang diunggah via file teks (`.txt`) menyimpan status kebenaran pada properti `isCorrect: true` di dalam array JSON `opsiJawaban`. Fungsi penilaian di `submitExamResult` selalu mengecek kedua kemungkinan (`kunciJawaban` string eksplisit atau `isCorrect` dalam `opsiJawaban`).
4. **Determinisme Query Soal:**
   - Semua pemanggilan soal melalui Prisma **wajib** menyertakan klausul `orderBy: { id: "asc" }` untuk menjamin indeks nomor soal di sisi klien dan server selalu identik 100%.
5. **Proteksi Isolasi Data Produksi (Zero-Data-Loss Deployment):**
   - Database SQLite (`prisma/*.db`, `*.db-wal`, `*.db-shm`), file upload (`public/uploads/**`), serta file environment (`.env`) dikecualikan dari pelacakan Git via `.gitignore`.
   - Hal ini menjamin bahwa setiap kali dilakukan `git pull` dari GitHub, data server lokal/proctoring tidak akan pernah tertimpa atau hilang.
6. **Otomasi Pembaruan Sistem di Server:**
   - Disediakan script shell `update.sh` di root repository untuk menjalankan siklus update aman: `git pull` $\rightarrow$ `npm install` $\rightarrow$ `npx prisma db push` $\rightarrow$ `npm run build` $\rightarrow$ `pm2 restart cbt-app`.

---

## 6. Riwayat Perbaikan Bug Signifikan (Bug Medical History)

| Bug ID | Gejala | Akar Masalah | Solusi Terverifikasi |
|---|---|---|---|
| **MED-01** | Siswa mendapat nilai 0.00 saat submit soal upload TXT. | Evaluasi nilai hanya memeriksa field `kunciJawaban` yang bernilai null pada soal TXT. | Ditambahkan parser fallback membaca `isCorrect: true` di JSON `opsiJawaban` dan sorting `orderBy: { id: "asc" }`. |
| **MED-02** | Blokir kecurangan hilang saat siswa menekan F5 (refresh). | Status blokir hanya disimpan di React memory state. | Disimpan secara persisten di `localStorage` (`cbt_blocked`, `cbt_peringatan`, `cbt_token`). |
| **MED-03** | Siswa terblokir membuka `/login` untuk keluar dari layar blokir. | Route `/login` belum memiliki penjaga sesi siswa aktif. | Ditambahkan server-side session check di `/login`: redirect otomatis kembali ke `/cbt`. |
| **MED-04** | Nomor soal 1-10 di grid kanan tidak dapat diklik. | Header `sticky` dan container soal HTML menimpa area klik secara tak kasat mata. | Dihapus `sticky`, ditambahkan CSS containment (`contain: content`), serta event delegation pada nomor soal. |
| **MED-05** | Layar ujian kembali ke form token saat F5 setelah menit ke-15. | Validasi token 15 menit dieksekusi sebelum pengecekan siswa yang sudah `MENGERJAKAN`. | Ditambahkan prioritas bypass validasi waktu token jika siswa sudah memiliki record `MENGERJAKAN`. |
| **MED-06** | Mismatch rotasi sesi antar hari pada jadwal ujian bergelombang. | Siswa hanya memiliki 1 field sesi tunggal untuk seluruh rangkaian hari ujian. | Ditambahkan field `sesiHari1`, `sesiHari2`, `sesiHari3`, `sesiHari4` serta token dinamis berbasis `hariKe`. |
| **MED-07** | Build failure pada tahap compile TypeScript (`prisma.config.ts TS2307`). | File `prisma.config.ts` tidak kompatibel dengan Prisma 5, dan `postinstall` salah memanggil `prisma skills sync`. | Menghapus `prisma.config.ts`, mengganti `postinstall` menjadi `prisma generate`, memverifikasi build Next.js (22/22 route sukses). |
| **MED-08** | Potensi konflik dan tertindihnya database server/foto siswa saat update Git. | File `.db` dan upload media berpotensi masuk ke staging Git jika `.gitignore` tidak spesifik. | Menambahkan aturan isolasi ketat di `.gitignore` untuk file `.db`, `.sqlite`, dan folder `public/uploads/**` (menjaga `.gitkeep`), serta menyertakan script `update.sh`. |

---

## 7. Panduan Pemeliharaan, Deployment & Perintah Terminal

### Menjalankan Aplikasi Lokal
```powershell
cd C:\Users\iphoenkz\Music\LMS-7TKA-CBT\cbt-app
npm run dev
```

### Sinkronisasi Skema Database Prisma (SQLite)
```powershell
npx prisma db push --accept-data-loss
npx prisma generate
```

### Deployment & Update di LXC Proxmox
- **Instalasi Awal:**
  ```bash
  git clone https://github.com/kajurtkjsmkbp-hub/CBT-TKA-PART3.git /var/www/cbt-app
  cd /var/www/cbt-app
  cp .env.example .env
  npm install
  npx prisma db push
  npm run build
  pm2 start npm --name "cbt-app" -- start
  ```
- **Update Aman Tanpa Menimpa Data:**
  ```bash
  cd /var/www/cbt-app
  ./update.sh
  ```
- **Backup Cepat Database:**
  ```bash
  cp prisma/dev.db /root/backup_$(date +%Y%m%d_%H%M%S).db
  ```
