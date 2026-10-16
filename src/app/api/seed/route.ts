import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Buat Sekolah
    const sekolah = await prisma.sekolah.create({
      data: {
        nama: "SMA Bintang Kejora",
        alamat: "Jl. Pendidikan No. 1, Jakarta",
      },
    });

    // 2. Buat Jurusan
    const jurusanIPA = await prisma.jurusan.create({
      data: { nama_jurusan: "IPA" },
    });

    // 3. Buat Kelas
    const kelas12 = await prisma.tingkatKelas.create({
      data: { level: 12, tipe: "SMA" },
    });

    // 4. Buat Mapel
    const mapelBiologi = await prisma.mataPelajaran.create({
      data: {
        nama: "Biologi Lanjutan",
        tingkatKelasId: kelas12.id,
        jurusanId: jurusanIPA.id,
      },
    });

    // 5. Buat Siswa
    const siswa = await prisma.user.create({
      data: {
        nama: "Andi Siswa",
        email_username: "andi123", // Username untuk login
        password: "password123", // Password untuk login
        role: "SISWA",
        sekolahId: sekolah.id,
        jurusanId: jurusanIPA.id,
        tingkatKelasId: kelas12.id,
      },
    });

    // 6. Buat Guru
    const guru = await prisma.user.create({
      data: {
        nama: "Bapak Guru Budi",
        email_username: "gutu_budi",
        password: "password123",
        role: "GURU",
        sekolahId: sekolah.id,
      },
    });

    // 7. Buat Ujian & Soal Real di Database
    const ujian = await prisma.ujian.create({
      data: {
        judul: "Ujian Tengah Semester - Biologi",
        mataPelajaranId: mapelBiologi.id,
        durasiMenit: 90,
      },
    });

    // Insert Soal Dummy
    const mockSoal = [
      { text: "Dalam suatu reaksi kimia, zat yang mempercepat laju reaksi tanpa ikut bereaksi disebut...", opsi: ["Katalisator", "Inhibitor", "Reaktan", "Produk"], kunci: "0" },
      { text: "Hewan mamalia bernapas menggunakan...", opsi: ["Insang", "Paru-paru", "Trakea", "Kulit"], kunci: "1" },
    ];

    for (const s of mockSoal) {
      const opsiObj = s.opsi.map((txt, i) => ({ id: i.toString(), text: txt, isCorrect: i.toString() === s.kunci }));
      await prisma.soal.create({
        data: {
          ujianId: ujian.id,
          tipeSoal: "PG",
          kontenSoal: s.text,
          opsiJawaban: JSON.stringify(opsiObj),
          kunciJawaban: s.kunci,
          bobot: 1.0,
        },
      });
    }

    // 8. Buat Sesi Ujian (Agar muncul di dashboard admin & bisa dikerjakan)
    await prisma.sesiUjian.create({
      data: {
        ujianId: ujian.id,
        waktuMulai: new Date(),
        waktuSelesai: new Date(Date.now() + 90 * 60000), // +90 menit
        status: "AKTIF",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Data dummy berhasil dimasukkan!",
      akun_siswa: { username: "andi123", password: "password123" },
      akun_guru: { username: "gutu_budi", password: "password123" }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
