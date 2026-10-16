"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SesiPayload {
  gelombang: number;
  sesiHari1: number;
  sesiHari2: number;
  sesiHari3: number;
  sesiHari4: number;
  ruang: string;
}

export async function updateSingleSiswaSesi(siswaId: string, payload: SesiPayload) {
  try {
    await prisma.user.update({
      where: { id: siswaId },
      data: {
        gelombang: payload.gelombang,
        sesiHari1: payload.sesiHari1,
        sesiHari2: payload.sesiHari2,
        sesiHari3: payload.sesiHari3,
        sesiHari4: payload.sesiHari4,
        sesi: payload.sesiHari1, // Sinkronkan sesi default ke Hari 1
        ruang: payload.ruang,
      },
    });

    revalidatePath("/admin/sesi");
    revalidatePath("/admin/siswa");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating siswa sesi:", error);
    return { success: false, message: error?.message || "Gagal memperbarui sesi siswa." };
  }
}

export async function batchUpdateSiswaSesi(
  siswaIds: string[],
  payload: {
    gelombang?: number;
    sesiHari1?: number;
    sesiHari2?: number;
    sesiHari3?: number;
    sesiHari4?: number;
    ruang?: string;
  }
) {
  try {
    if (!siswaIds || siswaIds.length === 0) {
      return { success: false, message: "Tidak ada siswa yang dipilih." };
    }

    const updateData: any = {};
    if (payload.gelombang !== undefined) updateData.gelombang = payload.gelombang;
    if (payload.sesiHari1 !== undefined) {
      updateData.sesiHari1 = payload.sesiHari1;
      updateData.sesi = payload.sesiHari1;
    }
    if (payload.sesiHari2 !== undefined) updateData.sesiHari2 = payload.sesiHari2;
    if (payload.sesiHari3 !== undefined) updateData.sesiHari3 = payload.sesiHari3;
    if (payload.sesiHari4 !== undefined) updateData.sesiHari4 = payload.sesiHari4;
    if (payload.ruang !== undefined && payload.ruang.trim() !== "") updateData.ruang = payload.ruang.trim();

    await prisma.user.updateMany({
      where: { id: { in: siswaIds } },
      data: updateData,
    });

    revalidatePath("/admin/sesi");
    revalidatePath("/admin/siswa");
    return { success: true, count: siswaIds.length };
  } catch (error: any) {
    console.error("Error batch updating siswa sesi:", error);
    return { success: false, message: error?.message || "Gagal memperbarui sesi massal." };
  }
}

export async function bulkSaveAllSiswaSesi(
  records: Array<{
    id: string;
    gelombang: number;
    sesiHari1: number;
    sesiHari2: number;
    sesiHari3: number;
    sesiHari4: number;
    ruang: string;
  }>
) {
  try {
    if (!records || records.length === 0) {
      return { success: true, count: 0 };
    }

    // Eksekusi update per baris menggunakan prisma.$transaction
    await prisma.$transaction(
      records.map((r) =>
        prisma.user.update({
          where: { id: r.id },
          data: {
            gelombang: r.gelombang,
            sesiHari1: r.sesiHari1,
            sesiHari2: r.sesiHari2,
            sesiHari3: r.sesiHari3,
            sesiHari4: r.sesiHari4,
            sesi: r.sesiHari1,
            ruang: r.ruang,
          },
        })
      )
    );

    revalidatePath("/admin/sesi");
    revalidatePath("/admin/siswa");
    return { success: true, count: records.length };
  } catch (error: any) {
    console.error("Error bulk saving siswa sesi:", error);
    return { success: false, message: error?.message || "Gagal menyimpan seluruh sesi siswa." };
  }
}

export async function saveJadwalUjianPengaturan(payload: {
  jamSesi1: string;
  jamSesi2: string;
  jamSesi3: string;
  tglHari1: string;
  tglHari2: string;
  tglHari3: string;
  tglHari4: string;
}) {
  try {
    const entries = [
      { kunci: "JAM_SESI_1", nilai: payload.jamSesi1.trim() },
      { kunci: "JAM_SESI_2", nilai: payload.jamSesi2.trim() },
      { kunci: "JAM_SESI_3", nilai: payload.jamSesi3.trim() },
      { kunci: "TGL_HARI_1", nilai: payload.tglHari1.trim() },
      { kunci: "TGL_HARI_2", nilai: payload.tglHari2.trim() },
      { kunci: "TGL_HARI_3", nilai: payload.tglHari3.trim() },
      { kunci: "TGL_HARI_4", nilai: payload.tglHari4.trim() },
    ];

    await prisma.$transaction(
      entries.map((e) =>
        prisma.pengaturan.upsert({
          where: { kunci: e.kunci },
          update: { nilai: e.nilai },
          create: { kunci: e.kunci, nilai: e.nilai },
        })
      )
    );

    revalidatePath("/admin/sesi");
    revalidatePath("/admin/pengaturan");
    revalidatePath("/cetak-kartu");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving jadwal ujian pengaturan:", error);
    return { success: false, message: error?.message || "Gagal menyimpan jadwal ujian." };
  }
}
