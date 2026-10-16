import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";

async function savePengaturan(formData: FormData) {
  "use server";
  
  const fields = [
    "NAMA_SEKOLAH", "NPSN", "ALAMAT_SEKOLAH", "KEPALA_SEKOLAH", "NIP_KEPALA",
    "JAM_SESI_1", "JAM_SESI_2", "JAM_SESI_3",
    "TGL_HARI_1", "TGL_HARI_2", "TGL_HARI_3", "TGL_HARI_4"
  ];
  
  for (const field of fields) {
    const value = formData.get(field) as string;
    if (value !== null) {
      await prisma.pengaturan.upsert({
        where: { kunci: field },
        update: { nilai: value },
        create: { kunci: field, nilai: value }
      });
    }
  }

  // Handle Logo Upload
  const logoFile = formData.get("LOGO_PATH") as File;
  if (logoFile && logoFile.size > 0) {
    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadDir = path.join(process.cwd(), "public", "uploads", "logo");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const ext = logoFile.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, buffer);
    
    await prisma.pengaturan.upsert({
      where: { kunci: "LOGO_PATH" },
      update: { nilai: `/uploads/logo/${fileName}` },
      create: { kunci: "LOGO_PATH", nilai: `/uploads/logo/${fileName}` }
    });
  }

  revalidatePath("/admin/pengaturan");
  redirect("/admin/pengaturan?success=1");
}

export default async function PengaturanPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const listPengaturan = await prisma.pengaturan.findMany();
  const getVal = (kunci: string) => listPengaturan.find(p => p.kunci === kunci)?.nilai || "";

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pengaturan Sekolah</h1>
      
      {success === "1" && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="font-semibold">Berhasil! Pengaturan sekolah telah disimpan.</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Identitas Sekolah & Kop Surat</h2>
          <p className="text-sm text-gray-500">Data ini akan digunakan untuk cetak BAP, Daftar Hadir, dan Laporan Hasil Ujian.</p>
        </div>
        
        <form action={savePengaturan} className="p-6 max-w-2xl">
          <div className="space-y-6">
            
            {/* Logo */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Logo Sekolah</label>
              <div className="flex items-center space-x-4">
                {getVal("LOGO_PATH") ? (
                  <img src={getVal("LOGO_PATH")} alt="Logo" className="h-20 w-20 object-contain border border-gray-200 rounded-lg p-1 bg-gray-50" />
                ) : (
                  <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 text-xs text-center p-2">Belum ada logo</div>
                )}
                <div>
                  <input type="file" name="LOGO_PATH" accept="image/*" className="text-sm file:mr-2 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  <p className="text-xs text-gray-500 mt-1">Kosongkan jika tidak ingin mengubah logo saat ini.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Sekolah</label>
                <input type="text" name="NAMA_SEKOLAH" defaultValue={getVal("NAMA_SEKOLAH")} required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">NPSN</label>
                <input type="text" name="NPSN" defaultValue={getVal("NPSN")} required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Sekolah</label>
              <textarea name="ALAMAT_SEKOLAH" defaultValue={getVal("ALAMAT_SEKOLAH")} rows={3} required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Kepala Sekolah</label>
                <input type="text" name="KEPALA_SEKOLAH" defaultValue={getVal("KEPALA_SEKOLAH")} required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">NIP Kepala Sekolah</label>
                <input type="text" name="NIP_KEPALA" defaultValue={getVal("NIP_KEPALA")} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition" placeholder="Kosongkan jika tidak ada" />
              </div>
            </div>

            {/* PENGATURAN WAKTU & JADWAL UJIAN STANDAR TKA / ANBK */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span>🕒</span> Waktu Pelaksanaan Sesi Ujian (Standar TKA / ANBK)
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Waktu ini akan dicetak otomatis pada Kartu Peserta Ujian sesuai sesi masing-masing siswa.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Jam Sesi 1</label>
                  <input
                    type="text"
                    name="JAM_SESI_1"
                    defaultValue={getVal("JAM_SESI_1") || "07.30 - 09.30"}
                    placeholder="Contoh: 07.30 - 09.30"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Jam Sesi 2</label>
                  <input
                    type="text"
                    name="JAM_SESI_2"
                    defaultValue={getVal("JAM_SESI_2") || "10.30 - 12.30"}
                    placeholder="Contoh: 10.30 - 12.30"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Jam Sesi 3</label>
                  <input
                    type="text"
                    name="JAM_SESI_3"
                    defaultValue={getVal("JAM_SESI_3") || "13.30 - 15.30"}
                    placeholder="Contoh: 13.30 - 15.30"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* PENGATURAN HARI & TANGGAL PELAKSANAAN HARI 1 - 4 */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <span>📅</span> Hari & Tanggal Pelaksanaan Ujian (Hari 1 s.d 4)
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Nama hari atau tanggal yang tertera pada kolom jadwal di Kartu Peserta Ujian.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Hari Ke-1</label>
                  <input
                    type="text"
                    name="TGL_HARI_1"
                    defaultValue={getVal("TGL_HARI_1") || "Senin, 19 Okt 2026"}
                    placeholder="Contoh: Senin, 19 Okt 2026"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Hari Ke-2</label>
                  <input
                    type="text"
                    name="TGL_HARI_2"
                    defaultValue={getVal("TGL_HARI_2") || "Selasa, 20 Okt 2026"}
                    placeholder="Contoh: Selasa, 20 Okt 2026"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Hari Ke-3</label>
                  <input
                    type="text"
                    name="TGL_HARI_3"
                    defaultValue={getVal("TGL_HARI_3") || "Rabu, 21 Okt 2026"}
                    placeholder="Contoh: Rabu, 21 Okt 2026"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Hari Ke-4</label>
                  <input
                    type="text"
                    name="TGL_HARI_4"
                    defaultValue={getVal("TGL_HARI_4") || "Kamis, 22 Okt 2026"}
                    placeholder="Contoh: Kamis, 22 Okt 2026"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>
            
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-sm">
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
