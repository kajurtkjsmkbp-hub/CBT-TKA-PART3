import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ujianId: string }> }
) {
  try {
    const resolvedParams = await params;
    const ujianId = resolvedParams.ujianId;

    const ujian = await prisma.ujian.findUnique({
      where: { id: ujianId },
      include: { mataPelajaran: true, soals: true, _count: { select: { soals: true } } },
    });

    if (!ujian) {
      return new NextResponse("Ujian tidak ditemukan", { status: 404 });
    }

    const hasilSiswa = await prisma.hasilUjian.findMany({
      where: { sesiUjian: { ujianId: ujianId } },
      include: {
        siswa: {
          include: { tingkatKelas: true, jurusan: true },
        },
      },
      orderBy: { nilaiAkhir: "desc" },
    });

    // Format data untuk Excel (Rekap Nilai & Analisis Butir Soal)
    const dataExcel = hasilSiswa.map((h, index) => {
      const totalSoal = ujian._count.soals;
      const benar = Math.round((h.nilaiAkhir / 100) * totalSoal);
      const salah = totalSoal - benar;

      // Extract answers for Item Analysis
      let answers: Record<string, any> = {};
      try {
        answers = JSON.parse(h.detailJawaban || "{}");
      } catch (e) {}

      const kkm = ujian.kkm ?? 75;
      const rowData: any = {
        "Peringkat": index + 1,
        "Nama Siswa": h.siswa.nama,
        "NIS/Username": h.siswa.email_username,
        "Sesi": h.siswa.sesi,
        "Ruang": h.siswa.ruang,
        "Tingkat Kelas": h.siswa.tingkatKelas ? `${h.siswa.tingkatKelas.tipe} ${h.siswa.tingkatKelas.level}` : "-",
        "Jurusan": h.siswa.jurusan?.nama_jurusan || "-",
        "Jawaban Benar": benar,
        "Jawaban Salah": salah,
        "Total Soal": totalSoal,
        "Nilai Akhir": h.nilaiAkhir.toFixed(2),
        "Standar KKM": kkm,
        "Status Kelulusan": h.nilaiAkhir >= kkm ? "LULUS" : "REMEDIAL",
      };

      // Append Soal status (1 = Benar, 0 = Salah)
      ujian.soals.forEach((soal, sIdx) => {
        const studentAnswer = answers[sIdx];
        const isCorrect = (studentAnswer !== undefined && studentAnswer.toString() === soal.kunciJawaban) ? 1 : 0;
        rowData[`Soal ${sIdx + 1}`] = isCorrect;
      });

      return rowData;
    });

    // Buat Workbook
    const worksheet = xlsx.utils.json_to_sheet(dataExcel);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Analisis Butir Soal");

    // Tulis ke buffer
    const buf = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return file
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Analisis_Butir_Soal_${ujian.judul.replace(/\s+/g, "_")}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    return new NextResponse("Gagal membuat Excel: " + error.message, { status: 500 });
  }
}
