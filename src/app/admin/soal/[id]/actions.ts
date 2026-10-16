"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ParsedSoal = {
  kontenSoal: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  opsiE: string;
  kunci: string;
};

export async function saveParsedTxtSoals(ujianId: string, soals: ParsedSoal[]) {
  for (const soal of soals) {
    const opsiJawaban = [
      { id: "A", text: soal.opsiA, isCorrect: soal.kunci === "A" },
      { id: "B", text: soal.opsiB, isCorrect: soal.kunci === "B" },
      { id: "C", text: soal.opsiC, isCorrect: soal.kunci === "C" },
      { id: "D", text: soal.opsiD, isCorrect: soal.kunci === "D" },
      { id: "E", text: soal.opsiE, isCorrect: soal.kunci === "E" },
    ].filter(o => o.text !== "");

    await prisma.soal.create({
      data: {
        ujianId,
        tipeSoal: "PG",
        kontenSoal: soal.kontenSoal,
        bobot: 1.0, // Default bobot 1.0
        opsiJawaban: opsiJawaban.length > 0 ? JSON.stringify(opsiJawaban) : null,
      }
    });
  }

  revalidatePath(`/admin/soal/${ujianId}`);
}
