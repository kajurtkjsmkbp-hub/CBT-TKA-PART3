import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

export async function GET() {
  const wb = XLSX.utils.book_new();
  
  const wsData = [
    ["Tipe Soal (PG/ESSAY)", "Pertanyaan", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E", "Kunci Jawaban", "Bobot Nilai"],
    ["PG", "Ibukota provinsi Jawa Barat adalah...", "Bandung", "Jakarta", "Semarang", "Surabaya", "Banten", "A", "1"],
    ["PG", "Berapakah hasil dari 5 + 5?", "5", "10", "15", "20", "25", "B", "1"],
    ["ESSAY", "Jelaskan proses terjadinya hujan!", "", "", "", "", "", "", "5"]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  ws['!cols'] = [
    { wch: 20 }, // Tipe
    { wch: 50 }, // Pertanyaan
    { wch: 20 }, // A
    { wch: 20 }, // B
    { wch: 20 }, // C
    { wch: 20 }, // D
    { wch: 20 }, // E
    { wch: 15 }, // Kunci
    { wch: 15 }  // Bobot
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
  
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Template_Upload_Soal.xlsx"',
    },
  });
}
