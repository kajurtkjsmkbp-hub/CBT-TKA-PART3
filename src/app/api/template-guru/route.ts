import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  // Buat Data Contoh
  const data = [
    {
      "Nama": "Budi Santoso, S.Pd.",
      "NIP/Username": "198001012010011001",
      "Password": "password123",
    },
    {
      "Nama": "Siti Aminah, M.Pd.",
      "NIP/Username": "guru_siti",
      "Password": "123",
    }
  ];

  // Buat Worksheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Atur lebar kolom
  worksheet["!cols"] = [
    { wch: 30 }, // Nama
    { wch: 25 }, // NIP/Username
    { wch: 15 }, // Password
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Guru");

  // Tulis ke buffer (binary)
  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  // Return response untuk trigger download file
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Disposition": 'attachment; filename="Template_Data_Guru.xlsx"',
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
