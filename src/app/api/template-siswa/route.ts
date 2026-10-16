import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: angka ke romawi
function toRomawi(n: number): string {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 13: "XIII", 7: "VII", 8: "VIII", 9: "IX" };
  return map[n] || String(n);
}

export async function GET() {
  const wb = XLSX.utils.book_new();

  // Ambil data referensi dari database untuk contoh yang akurat
  const sekolahList = await prisma.sekolah.findMany({ select: { nama: true } });
  const rombelList = await prisma.rombel.findMany({
    include: { tingkatKelas: true, jurusan: true },
    orderBy: [
      { tingkatKelas: { level: "asc" } },
      { nomorKelas: "asc" }
    ]
  });

  const namaSekolahContoh = sekolahList[0]?.nama || "SMK Negeri 1 Adiwerna";
  
  let rombelContoh1 = "XII TKJ 1";
  let rombelContoh2 = "XII TKJ 1";
  let rombelContoh3 = "XII TKJ 2";

  if (rombelList.length > 0) {
    const r1 = rombelList[0];
    rombelContoh1 = r1.jurusan 
      ? `${toRomawi(r1.tingkatKelas.level)} ${r1.jurusan.nama_jurusan} ${r1.nomorKelas}`
      : `${r1.tingkatKelas.tipe} ${toRomawi(r1.tingkatKelas.level)} ${r1.nomorKelas}`;
    rombelContoh2 = rombelContoh1;
    if (rombelList.length > 1) {
      const r2 = rombelList[1];
      rombelContoh3 = r2.jurusan 
        ? `${toRomawi(r2.tingkatKelas.level)} ${r2.jurusan.nama_jurusan} ${r2.nomorKelas}`
        : `${r2.tingkatKelas.tipe} ${toRomawi(r2.tingkatKelas.level)} ${r2.nomorKelas}`;
    }
  }

  // Sheet 1: Template Data Siswa (Format Standar ANBK / TKA)
  const wsData = [
    ["Nama Lengkap", "NIS / Username", "Password", "Asal Sekolah", "Rombel / Kelas", "Gelombang", "Sesi Hari 1", "Sesi Hari 2", "Sesi Hari 3", "Sesi Hari 4", "Ruang Ujian"],
    ["Budi Santoso", "1001", "123456", namaSekolahContoh, rombelContoh1, 1, 1, 2, 1, 2, "Ruang 1"],
    ["Siti Aminah", "1002", "123456", namaSekolahContoh, rombelContoh2, 1, 1, 2, 1, 2, "Ruang 1"],
    ["Ahmad Fauzi", "1003", "123456", namaSekolahContoh, rombelContoh3, 1, 2, 1, 2, 1, "Ruang 2"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 25 }, // Nama Lengkap
    { wch: 18 }, // NIS / Username
    { wch: 16 }, // Password
    { wch: 32 }, // Asal Sekolah
    { wch: 30 }, // Rombel / Kelas
    { wch: 14 }, // Gelombang
    { wch: 14 }, // Sesi Hari 1
    { wch: 14 }, // Sesi Hari 2
    { wch: 14 }, // Sesi Hari 3
    { wch: 14 }, // Sesi Hari 4
    { wch: 18 }, // Ruang Ujian
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");

  // Sheet 2: Petunjuk & Daftar Referensi
  const refData: any[][] = [
    ["PANDUAN & PETUNJUK PENGISIAN TEMPLATE DATA SISWA (STANDAR TKA / ANBK)"],
    [],
    ["KOLOM", "STATUS", "KETERANGAN"],
    ["Nama Lengkap", "Wajib", "Nama lengkap siswa (contoh: Budi Santoso)"],
    ["NIS / Username", "Wajib", "Nomor Induk Siswa atau Username login unik (contoh: 1001)"],
    ["Password", "Opsional", "Password login siswa. Jika dikosongkan, otomatis sama dengan NIS / Username"],
    ["Asal Sekolah", "Wajib", "Nama sekolah tempat siswa terdaftar (sesuai data Master Sekolah)"],
    ["Rombel / Kelas", "Wajib", "Nama Rombongan Belajar siswa (contoh: XII TKJ 1)"],
    ["Gelombang", "Opsional", "Gelombang pelaksanaan ujian (1 atau 2). Default: 1"],
    ["Sesi Hari 1", "Opsional", "Sesi ujian pada hari ke-1 (1, 2, atau 3). Default: 1"],
    ["Sesi Hari 2", "Opsional", "Sesi ujian pada hari ke-2 (1, 2, atau 3). Default: 1"],
    ["Sesi Hari 3", "Opsional", "Sesi ujian pada hari ke-3 (1, 2, atau 3). Default: 1"],
    ["Sesi Hari 4", "Opsional", "Sesi ujian pada hari ke-4 (1, 2, atau 3). Default: 1"],
    ["Ruang Ujian", "Opsional", "Nama ruang tempat siswa ujian (contoh: Ruang 1, Lab Komputer). Default: Ruang 1"],
    [],
    ["--- DAFTAR SEKOLAH TERDAFTAR DI SISTEM ---"],
    ...sekolahList.map(s => [s.nama]),
    [],
    ["--- DAFTAR ROMBEL / KELAS TERDAFTAR DI SISTEM ---"],
    ...rombelList.map(r => {
      const lbl = r.jurusan 
        ? `${toRomawi(r.tingkatKelas.level)} ${r.jurusan.nama_jurusan} ${r.nomorKelas}`
        : `${r.tingkatKelas.tipe} ${toRomawi(r.tingkatKelas.level)} ${r.nomorKelas}`;
      return [lbl];
    })
  ];

  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Petunjuk & Referensi");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Template_Data_Siswa.xlsx"',
    },
  });
}
