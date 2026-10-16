import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import * as XLSX from "xlsx";

// --- Server Actions ---
async function addGuru(formData: FormData) {
  "use server";
  const nama = formData.get("nama") as string;
  const email_username = formData.get("email_username") as string;
  const password = formData.get("password") as string;

  if (nama && email_username && password) {
    // Hindari duplikasi NIP/Username
    const existing = await prisma.user.findUnique({
      where: { email_username },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          nama,
          email_username,
          password,
          role: "GURU",
        },
      });
      revalidatePath("/admin/guru");
    }
  }
}

async function deleteGuru(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/guru");
  }
}

async function uploadExcelGuru(formData: FormData) {
  "use server";
  const file = formData.get("fileExcel") as File;
  if (!file || file.size === 0) return;

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Format Excel: Nama | NIP/Username | Password
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  let successCount = 0;
  for (const row of data) {
    if (row.Nama && row["NIP/Username"] && row.Password) {
      const email_username = String(row["NIP/Username"]).trim();
      const nama = String(row.Nama).trim();
      const password = String(row.Password).trim();

      try {
        await prisma.user.create({
          data: {
            nama,
            email_username,
            password,
            role: "GURU"
          }
        });
        successCount++;
      } catch (error) {
        // Abaikan jika NIP/Username sudah ada
        console.error(`Gagal insert Guru: ${email_username}`);
      }
    }
  }
  revalidatePath("/admin/guru");
}

export default async function DataGuruPage() {
  const guruList = await prisma.user.findMany({
    where: { role: "GURU" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Kelola Data Guru</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Form & Upload */}
        <div className="space-y-6 lg:col-span-1">
          {/* Form Tambah Satuan */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Guru (Manual)</h2>
            <form action={addGuru} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  name="nama"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Contoh: Budi Santoso, S.Pd."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIP / Username</label>
                <input
                  type="text"
                  name="email_username"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Contoh: 198001012010011001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Login</label>
                <input
                  type="text"
                  name="password"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Password akun guru"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition mt-4"
              >
                Simpan Data Guru
              </button>
            </form>
          </div>

          {/* Form Upload Massal */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 border-l-4 border-l-green-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Upload via Excel</h2>
            <p className="text-sm text-gray-500 mb-4">
              Punya banyak data guru? Upload sekaligus menggunakan format Excel resmi kami.
            </p>
            
            <a 
              href="/api/template-guru" 
              className="inline-block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition mb-4 text-sm"
              target="_blank" rel="noopener noreferrer"
            >
              ⬇️ Download Template Excel
            </a>

            <form action={uploadExcelGuru} className="space-y-4">
              <div>
                <input
                  type="file"
                  name="fileExcel"
                  accept=".xlsx, .xls"
                  required
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer border border-gray-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                ⬆️ Proses Upload
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Tabel Data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden h-fit">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Daftar Guru Terdaftar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Nama Guru</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">NIP / Username</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Password</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {guruList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Belum ada data guru.
                    </td>
                  </tr>
                ) : (
                  guruList.map((guru) => (
                    <tr key={guru.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <span className="font-bold text-gray-800">{guru.nama}</span>
                        <div className="text-xs text-blue-600 font-semibold mt-1 bg-blue-50 w-fit px-2 py-0.5 rounded">GURU</div>
                      </td>
                      <td className="p-4 font-medium text-gray-700">{guru.email_username}</td>
                      <td className="p-4 text-gray-500">{guru.password}</td>
                      <td className="p-4 text-right">
                        <form action={deleteGuru}>
                          <input type="hidden" name="id" value={guru.id} />
                          <button type="submit" className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition">
                            Hapus
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
