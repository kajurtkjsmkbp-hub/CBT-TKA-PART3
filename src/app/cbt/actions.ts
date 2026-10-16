"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function getSiswaSesiForHari(siswa: { sesiHari1?: number | null; sesiHari2?: number | null; sesiHari3?: number | null; sesiHari4?: number | null; sesi?: number }, hariKe: number): number {
  if (hariKe === 1) return siswa.sesiHari1 ?? siswa.sesi ?? 1;
  if (hariKe === 2) return siswa.sesiHari2 ?? siswa.sesi ?? 1;
  if (hariKe === 3) return siswa.sesiHari3 ?? siswa.sesi ?? 1;
  if (hariKe === 4) return siswa.sesiHari4 ?? siswa.sesi ?? 1;
  return siswa.sesi ?? 1;
}

export async function getCurrentUser() {
  const userId = (await cookies()).get("cbt_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { sekolah: true }
  });
  
  if (!user) return null;

  const activeSesis = await prisma.sesiUjian.findMany({
    where: { status: "AKTIF", ruang: user.ruang },
    include: { ujian: { include: { mataPelajaran: true } } }
  });

  const activeSesi = activeSesis.find(s => {
    const sesiHariIni = getSiswaSesiForHari(user, s.hariKe ?? 1);
    const gelombangSiswa = user.gelombang ?? 1;
    return (s.gelombang ?? 1) === gelombangSiswa && s.sesi === sesiHariIni;
  });

  return { 
    id: user.id,
    nama: user.nama, 
    email_username: user.email_username,
    foto: user.foto,
    sekolah: user.sekolah?.nama || null,
    gelombang: user.gelombang ?? 1,
    ruang: user.ruang,
    mapelAktif: activeSesi ? activeSesi.ujian.mataPelajaran.nama : null
  };
}

export async function checkTokenAndFetchExam(token: string, isRecovery: boolean = false) {
  // Dalam skenario asli, token bisa disimpan di model Ujian atau SesiUjian.
  // Untuk versi ini, kita asumsikan jika ada sesi aktif, kita ambil sesi tersebut.
  // Token TKA2026 sebagai dummy master token atau bisa divalidasi dengan DB.
  
  // Validasi token langsung dari database
  const sesiAktif = await prisma.sesiUjian.findFirst({
    where: { token: token, status: "AKTIF" },
    include: {
      ujian: {
        include: {
          soals: { orderBy: { id: "asc" } },
          mataPelajaran: true,
        }
      }
    }
  });

  if (!sesiAktif) {
    return { success: false, message: "Token tidak valid atau tidak ada ujian aktif dengan token tersebut." };
  }

  // Cari session siswa dari cookies
  const userRole = (await cookies()).get("cbt_session")?.value;
  const userId = (await cookies()).get("cbt_user_id")?.value;
  if (userRole !== "SISWA" || !userId) {
     return { success: false, message: "Hanya siswa terdaftar yang dapat mengikuti ujian." };
  }

  // Validasi Kesesuaian Gelombang, Sesi Hari Ini, & Ruang Siswa dengan Sesi Aktif
  const siswa = await prisma.user.findUnique({ where: { id: userId } });
  if (!siswa) {
    return { success: false, message: "Data siswa tidak ditemukan." };
  }
  
  const sesiSiswaHariIni = getSiswaSesiForHari(siswa, sesiAktif.hariKe ?? 1);
  const gelombangSiswa = siswa.gelombang ?? 1;
  const gelombangSesi = sesiAktif.gelombang ?? 1;
  const hariKeSesi = sesiAktif.hariKe ?? 1;

  if (gelombangSiswa !== gelombangSesi || sesiSiswaHariIni !== sesiAktif.sesi || siswa.ruang !== sesiAktif.ruang) {
    return { 
      success: false, 
      message: `Akses ditolak! Ujian ini dijadwalkan untuk Gelombang ${gelombangSesi} • Hari ke-${hariKeSesi} • Sesi ${sesiAktif.sesi} (${sesiAktif.ruang}). Jadwal Anda: Gelombang ${gelombangSiswa} • Hari ke-${hariKeSesi} Sesi ${sesiSiswaHariIni} (${siswa.ruang}).` 
    };
  }

  // Cek apakah siswa sudah punya hasil ujian
  let existingHasil = await prisma.hasilUjian.findFirst({
    where: { siswaId: siswa.id, sesiUjianId: sesiAktif.id }
  });

  // Jika siswa sudah menyelesaikan ujian ini
  if (existingHasil && existingHasil.status === "SELESAI") {
    return { 
      success: false, 
      alreadyCompleted: true,
      completedData: {
        userId: siswa.id,
        namaSiswa: siswa.nama,
        judulUjian: sesiAktif.ujian.judul,
        mataPelajaran: sesiAktif.ujian.mataPelajaran.nama,
        nilai: existingHasil.nilaiAkhir,
        kkm: sesiAktif.ujian.kkm ?? 75,
      },
      message: `Siswa "${siswa.nama}" sudah menyelesaikan ujian ini.`
    };
  }

  // Cek apakah token sudah kadaluarsa (batas aktif 15 menit)
  // Berlaku untuk semua siswa yang memasukkan token di halaman konfirmasi/login token
  const selisihMenit = (Date.now() - sesiAktif.waktuMulai.getTime()) / 60000;
  if (!isRecovery && selisihMenit > 15) {
    return { 
      success: false, 
      isExpired: true,
      message: "Token sudah kadaluarsa (melewati batas 15 menit). Silakan minta token baru ke Proktor." 
    };
  }

  // Buat sesi pengerjaan jika belum ada
  if (!existingHasil) {
    existingHasil = await prisma.hasilUjian.create({
      data: {
        siswaId: siswa.id,
        sesiUjianId: sesiAktif.id,
        status: "MENGERJAKAN",
        detailJawaban: "{}",
        nilaiAkhir: 0
      }
    });
  }

  // Helper untuk acak array menggunakan Fisher-Yates
  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Format soal untuk client
  // Hapus kunciJawaban agar tidak bocor ke client!
  let formattedSoal = sesiAktif.ujian.soals.map((soal, originalIdx) => {
    let opsi = [];
    try {
      const parsedOpsi = JSON.parse(soal.opsiJawaban || "[]");
      opsi = parsedOpsi.map((o: any, idx: number) => ({
        text: o.text,
        originalOptionIndex: idx
      }));
      // Acak Opsi jika diaktifkan dan tipenya Pilihan Ganda
      if (sesiAktif.ujian.acakOpsi && soal.tipeSoal === "PG") {
        opsi = shuffleArray(opsi);
      }
    } catch (e) {
      console.error(e);
    }
    
    return {
      id: soal.id,
      text: soal.kontenSoal,
      tipeSoal: soal.tipeSoal,
      originalIndex: originalIdx,
      opsi: opsi
    };
  });

  // Acak Urutan Soal jika diaktifkan
  if (sesiAktif.ujian.acakSoal) {
    formattedSoal = shuffleArray(formattedSoal);
  }

  // Hitung sisa waktu berdasarkan Waktu Selesai server + kompensasi tambahan waktu proktor
  const extraMillis = (existingHasil.tambahanMenit || 0) * 60000;
  const sisaDetikServer = Math.max(0, Math.floor((sesiAktif.waktuSelesai.getTime() + extraMillis - Date.now()) / 1000));
  
  let existingAnswers = {};
  if (existingHasil && existingHasil.detailJawaban) {
    try {
      existingAnswers = JSON.parse(existingHasil.detailJawaban);
    } catch(e) {}
  }

  return {
    success: true,
    data: {
      judulUjian: sesiAktif.ujian.judul,
      mataPelajaran: sesiAktif.ujian.mataPelajaran.nama,
      sisaDetik: sisaDetikServer,
      kkm: sesiAktif.ujian.kkm ?? 75,
      soal: formattedSoal,
      savedAnswers: existingAnswers
    }
  };
}

export async function saveAnswerRealtime(token: string, answers: Record<number, any>) {
  const userId = (await cookies()).get("cbt_user_id")?.value;
  if (!userId) return { success: false };

  const sesiAktif = await prisma.sesiUjian.findFirst({
    where: { token: token, status: "AKTIF" }
  });
  if (!sesiAktif) return { success: false };

  const siswa = await prisma.user.findUnique({ where: { id: userId } });
  if (siswa) {
    const existingRow = await prisma.hasilUjian.findFirst({
      where: { siswaId: siswa.id, sesiUjianId: sesiAktif.id }
    });
    if (existingRow && existingRow.status === "MENGERJAKAN") {
      if (answers && Object.keys(answers).length > 0) {
        let currentDetail = {};
        try {
          currentDetail = JSON.parse(existingRow.detailJawaban || "{}");
        } catch(e) {}
        const merged = { ...currentDetail, ...answers };
        await prisma.hasilUjian.update({
          where: { id: existingRow.id },
          data: { detailJawaban: JSON.stringify(merged) }
        });
      }
    }
  }
  return { success: true };
}

export async function submitExamResult(token: string, answers: Record<number, number>) {
  const userId = (await cookies()).get("cbt_user_id")?.value;
  if (!userId) return { success: false, message: "Sesi Anda telah berakhir. Silakan login kembali." };

  const sesiAktif = await prisma.sesiUjian.findFirst({
    where: { token: token, status: "AKTIF" },
    include: { 
      ujian: { 
        include: { 
          soals: { orderBy: { id: "asc" } },
          mataPelajaran: true 
        } 
      } 
    }
  });

  if (!sesiAktif) return { success: false, message: "Sesi tidak ditemukan atau token tidak valid" };

  // Hitung Nilai (Sangat sederhana)
  let benar = 0;
  const totalSoal = sesiAktif.ujian.soals.length;
  
  sesiAktif.ujian.soals.forEach((soal, idx) => {
    const ans = answers[idx];
    if (ans !== undefined) {
      if (soal.tipeSoal === "PG") {
        if (soal.kunciJawaban && ans.toString() === soal.kunciJawaban) {
          benar++;
        } else if (soal.opsiJawaban) {
          try {
            const parsedOpsi = JSON.parse(soal.opsiJawaban);
            const selectedOpsi = parsedOpsi[Number(ans)];
            if (selectedOpsi && selectedOpsi.isCorrect) benar++;
          } catch(e) {}
        }
      }
      else if (soal.tipeSoal === "PGK" && Array.isArray(ans) && ans.sort().join(",") === soal.kunciJawaban) benar++;
      else if (soal.tipeSoal === "ISIAN" && ans.toString().toLowerCase().trim() === (soal.kunciJawaban || "").toLowerCase().trim()) benar++;
    }
  });

  const nilaiAkhir = totalSoal > 0 ? (benar / totalSoal) * 100 : 0;

  const siswa = await prisma.user.findUnique({ where: { id: userId } });
  if (!siswa) {
    return { success: false, message: "Data siswa tidak ditemukan." };
  }

  const existingRow = await prisma.hasilUjian.findFirst({
    where: { siswaId: siswa.id, sesiUjianId: sesiAktif.id }
  });

  if (existingRow) {
    await prisma.hasilUjian.update({
      where: { id: existingRow.id },
      data: {
        nilaiAkhir: nilaiAkhir,
        detailJawaban: JSON.stringify(answers),
        status: "SELESAI",
        waktuKumpul: new Date()
      }
    });
  } else {
    await prisma.hasilUjian.create({
      data: {
        siswaId: siswa.id,
        sesiUjianId: sesiAktif.id,
        nilaiAkhir: nilaiAkhir,
        detailJawaban: JSON.stringify(answers),
        status: "SELESAI",
        waktuKumpul: new Date()
      }
    });
  }

  return { 
    success: true, 
    nilai: nilaiAkhir,
    completedData: {
      userId: siswa.id,
      namaSiswa: siswa.nama,
      judulUjian: sesiAktif.ujian.judul,
      mataPelajaran: sesiAktif.ujian.mataPelajaran.nama,
      nilai: nilaiAkhir,
      kkm: sesiAktif.ujian.kkm ?? 75,
    }
  };
}

export async function verifyProctorPin(pin: string) {
  const pinSetting = await prisma.pengaturan.findUnique({
    where: { kunci: "PIN_PROKTOR" }
  });
  
  const correctPin = pinSetting?.nilai || "PROKTOR2026";
  
  if (pin && pin.trim().toUpperCase() === correctPin.trim().toUpperCase()) {
    return { success: true };
  }
  return { success: false, message: "PIN Salah" };
}
