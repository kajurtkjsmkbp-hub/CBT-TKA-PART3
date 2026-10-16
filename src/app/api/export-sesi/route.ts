import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toRomawi(n: number): string {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 13: "XIII", 7: "VII", 8: "VIII", 9: "IX" };
  return map[n] || String(n);
}

function formatRombel(siswa: any): string {
  if (siswa.rombel) {
    return siswa.rombel.jurusan
      ? `${toRomawi(siswa.rombel.tingkatKelas?.level ?? 10)} ${siswa.rombel.jurusan.nama_jurusan} ${siswa.rombel.nomorKelas}`
      : `${siswa.rombel.tingkatKelas?.tipe ?? "Kelas"} ${toRomawi(siswa.rombel.tingkatKelas?.level ?? 10)} ${siswa.rombel.nomorKelas}`;
  }
  if (siswa.tingkatKelas) {
    return `${siswa.tingkatKelas.tipe} ${toRomawi(siswa.tingkatKelas.level)}${siswa.jurusan ? ` ${siswa.jurusan.nama_jurusan}` : ""}`;
  }
  return "-";
}

export async function GET() {
  try {
    const siswaList = await prisma.user.findMany({
      where: { role: "SISWA" },
      include: {
        sekolah: true,
        tingkatKelas: true,
        jurusan: true,
        rombel: { include: { tingkatKelas: true, jurusan: true } },
      },
      orderBy: [{ rombelId: "asc" }, { nama: "asc" }],
    });

    const wb = XLSX.utils.book_new();

    const rows = [
      ["No", "NIS / Username", "Nama Lengkap", "Kelas / Rombel", "Gelombang", "Sesi Hari 1", "Sesi Hari 2", "Sesi Hari 3", "Sesi Hari 4", "Ruang Ujian"],
      ...siswaList.map((s, idx) => [
        idx + 1,
        s.email_username,
        s.nama,
        formatRombel(s),
        s.gelombang ?? 1,
        s.sesiHari1 ?? 1,
        s.sesiHari2 ?? 1,
        s.sesiHari3 ?? 1,
        s.sesiHari4 ?? 1,
        s.ruang || "Ruang 1",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 28 },
      { wch: 30 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Pembagian Sesi");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Data_Pembagian_Sesi_TKA.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Export sesi error:", error);
    return NextResponse.json({ error: error?.message || "Gagal export data sesi" }, { status: 500 });
  }
}
