-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "email_username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SISWA',
    "sekolahId" TEXT,
    "tingkatKelasId" TEXT,
    "jurusanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "Sekolah" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_tingkatKelasId_fkey" FOREIGN KEY ("tingkatKelasId") REFERENCES "TingkatKelas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sekolah" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TingkatKelas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL,
    "tipe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Jurusan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama_jurusan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MataPelajaran" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "tingkatKelasId" TEXT NOT NULL,
    "jurusanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MataPelajaran_tingkatKelasId_fkey" FOREIGN KEY ("tingkatKelasId") REFERENCES "TingkatKelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MataPelajaran_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ujian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "judul" TEXT NOT NULL,
    "mataPelajaranId" TEXT NOT NULL,
    "durasiMenit" INTEGER NOT NULL DEFAULT 90,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ujian_mataPelajaranId_fkey" FOREIGN KEY ("mataPelajaranId") REFERENCES "MataPelajaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "tipeSoal" TEXT NOT NULL DEFAULT 'PG',
    "kontenSoal" TEXT NOT NULL,
    "opsiJawaban" TEXT,
    "kunciJawaban" TEXT,
    "bobot" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "Soal_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SesiUjian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ujianId" TEXT NOT NULL,
    "waktuMulai" DATETIME NOT NULL,
    "waktuSelesai" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TERJADWAL',
    CONSTRAINT "SesiUjian_ujianId_fkey" FOREIGN KEY ("ujianId") REFERENCES "Ujian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HasilUjian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siswaId" TEXT NOT NULL,
    "sesiUjianId" TEXT NOT NULL,
    "nilaiAkhir" REAL NOT NULL DEFAULT 0,
    "detailJawaban" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SELESAI',
    "waktuKumpul" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HasilUjian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HasilUjian_sesiUjianId_fkey" FOREIGN KEY ("sesiUjianId") REFERENCES "SesiUjian" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_username_key" ON "User"("email_username");
