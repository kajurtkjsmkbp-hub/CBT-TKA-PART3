"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function editMapelAction(
  id: string,
  nama: string,
  tingkatKelasId: string,
  jurusanId: string | null
) {
  if (id && nama && tingkatKelasId) {
    await prisma.mataPelajaran.update({
      where: { id },
      data: {
        nama,
        tingkatKelasId,
        jurusanId: jurusanId || "",
      },
    });
    revalidatePath("/admin/mapel");
  }
}

export async function deleteMapelAction(id: string) {
  if (id) {
    await prisma.mataPelajaran.delete({ where: { id } });
    revalidatePath("/admin/mapel");
  }
}
