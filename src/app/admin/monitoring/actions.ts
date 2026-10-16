"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Fungsi untuk menyelesaikan ujian siswa secara otomatis atau paksa
export async function finishStudentExam(hasilId: string) {
  if (!hasilId) return { success: false, message: "ID Hasil tidak valid" };

  try {
    const hasil = await prisma.hasilUjian.findUnique({
      where: { id: hasilId },
      include: {
        sesiUjian: {
          include: {
            ujian: {
              include: { soals: { orderBy: { id: "asc" } } }
            }
          }
        }
      }
    });

    if (!hasil) return { success: false, message: "Data hasil ujian tidak ditemukan" };
    if (hasil.status === "SELESAI") return { success: true, message: "Ujian sudah selesai" };

    let answers: Record<string, any> = {};
    try {
      answers = JSON.parse(hasil.detailJawaban || "{}");
    } catch (e) {
      answers = {};
    }

    let benar = 0;
    const soals = hasil.sesiUjian.ujian.soals;

    // Hitung jawaban yang ada; soal yang belum dijawab otomatis dianggap 0
    soals.forEach((soal, idx) => {
      const ans = answers[idx];
      if (ans !== undefined && ans !== null && ans !== "") {
        if (soal.tipeSoal === "PG") {
          if (soal.kunciJawaban && ans.toString() === soal.kunciJawaban) {
            benar++;
          } else if (soal.opsiJawaban) {
            try {
              const parsedOpsi = JSON.parse(soal.opsiJawaban);
              const selectedOpsi = parsedOpsi[Number(ans)];
              if (selectedOpsi && selectedOpsi.isCorrect) benar++;
            } catch (e) {}
          }
        } else if (
          soal.tipeSoal === "PGK" &&
          Array.isArray(ans) &&
          ans.sort().join(",") === soal.kunciJawaban
        ) {
          benar++;
        } else if (
          soal.tipeSoal === "ISIAN" &&
          ans.toString().toLowerCase().trim() ===
            (soal.kunciJawaban || "").toLowerCase().trim()
        ) {
          benar++;
        }
      }
    });

    const nilaiAkhir = soals.length > 0 ? (benar / soals.length) * 100 : 0;

    await prisma.hasilUjian.update({
      where: { id: hasilId },
      data: {
        status: "SELESAI",
        nilaiAkhir,
        waktuKumpul: new Date()
      }
    });

    revalidatePath("/admin/monitoring");
    return { success: true, nilai: nilaiAkhir };
  } catch (error: any) {
    console.error("Error auto-finishing student exam:", error);
    return { success: false, message: error.message || "Gagal menyelesaikan ujian" };
  }
}

// Action untuk Proktor menutup paksa ujian via form
export async function forceSubmitAction(formData: FormData) {
  const hasilId = formData.get("hasilId") as string;
  if (!hasilId) return;
  await finishStudentExam(hasilId);
}

// Action untuk mengubah PIN Proktor
export async function updatePinProktor(formData: FormData) {
  const newPin = formData.get("newPin") as string;
  if (!newPin || newPin.trim() === "") return;

  await prisma.pengaturan.upsert({
    where: { kunci: "PIN_PROKTOR" },
    update: { nilai: newPin.trim().toUpperCase() },
    create: { kunci: "PIN_PROKTOR", nilai: newPin.trim().toUpperCase() }
  });
  revalidatePath("/admin/monitoring");
  revalidatePath("/admin/status-tes");
}

// Action untuk me-reset status isLogin siswa
export async function resetLogin(formData: FormData) {
  const userId = formData.get("userId") as string;
  if (!userId) return;
  await prisma.user.update({
    where: { id: userId },
    data: { isLogin: false }
  });
  revalidatePath("/admin/monitoring");
}

// Action untuk merilis / refresh token sesi ujian
export async function refreshTokenAction(formData: FormData) {
  const sesiId = formData.get("sesiId") as string;
  if (!sesiId) return;

  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let newToken = "";
  for (let i = 0; i < 6; i++) {
    newToken += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  await prisma.sesiUjian.update({
    where: { id: sesiId },
    data: {
      token: newToken,
      waktuMulai: new Date()
    }
  });

  revalidatePath("/admin/monitoring");
}

// Action untuk memberi kompensasi tambahan waktu ujian siswa
export async function addExtraTimeAction(formData: FormData) {
  const hasilId = formData.get("hasilId") as string;
  const minutes = parseInt((formData.get("minutes") as string) || "10");

  if (!hasilId || isNaN(minutes) || minutes <= 0) return;

  try {
    const hasil = await prisma.hasilUjian.findUnique({
      where: { id: hasilId }
    });

    if (!hasil) return;

    await prisma.hasilUjian.update({
      where: { id: hasilId },
      data: {
        tambahanMenit: (hasil.tambahanMenit || 0) + minutes
      }
    });

    revalidatePath("/admin/monitoring");
  } catch (error) {
    console.error("Error adding extra time:", error);
  }
}
