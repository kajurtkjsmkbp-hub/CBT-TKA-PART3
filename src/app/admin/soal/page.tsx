import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

// --- Server Actions ---
async function addPaketSoal(formData: FormData) {
  "use server";
  const judul = formData.get("judul") as string;
  const mataPelajaranId = formData.get("mataPelajaranId") as string;
  const kkm = parseFloat(formData.get("kkm") as string) || 75.0;
  const durasiMenit = parseInt(formData.get("durasiMenit") as string);
  const acakSoal = formData.get("acakSoal") === "on";
  const acakOpsi = formData.get("acakOpsi") === "on";

  if (judul && mataPelajaranId && durasiMenit) {
    await prisma.ujian.create({
      data: {
        judul,
        mataPelajaranId,
        kkm,
        durasiMenit,
        acakSoal,
        acakOpsi
      },
    });
    revalidatePath("/admin/soal");
  }
}

async function deletePaketSoal(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    try {
      // Hapus hasil ujian dan sesi ujian yang terkait untuk mencegah error Foreign Key
      const sesiIds = await prisma.sesiUjian.findMany({ where: { ujianId: id }, select: { id: true } });
      if (sesiIds.length > 0) {
        await prisma.hasilUjian.deleteMany({ where: { sesiUjianId: { in: sesiIds.map((s) => s.id) } } });
      }
      await prisma.sesiUjian.deleteMany({ where: { ujianId: id } });
      await prisma.ujian.delete({ where: { id } });
    } catch (e) {
      console.error(e);
    }
    revalidatePath("/admin/soal");
    redirect("/admin/soal");
  }
}

export const dynamic = "force-dynamic";

export default async function BankSoalPage() {
  // Ambil referensi Mapel untuk form
  const mapelList = await prisma.mataPelajaran.findMany({
    include: { tingkatKelas: true, jurusan: true },
    orderBy: { nama: "asc" },
  });

  // Ambil daftar Paket Soal (Ujian) beserta jumlah soalnya
  const paketSoalList = await prisma.ujian.findMany({
    include: {
      mataPelajaran: {
        include: { tingkatKelas: true, jurusan: true }
      },
      sesiUjians: {
        where: { status: "AKTIF" },
        orderBy: { waktuMulai: "desc" }
      },
      _count: {
        select: { soals: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Manajemen Bank Soal</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola paket ujian, buat token, dan atur butir soal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Form Tambah Paket Soal */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 xl:col-span-1 h-fit">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Buat Paket Baru</h2>
          </div>
          <form action={addPaketSoal} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Judul Ujian</label>
              <input type="text" name="judul" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700 bg-gray-50 focus:bg-white" placeholder="Contoh: UTS Semester Ganjil" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mata Pelajaran</label>
              <select name="mataPelajaranId" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700 bg-gray-50 focus:bg-white appearance-none cursor-pointer">
                <option value="">-- Pilih Mata Pelajaran --</option>
                {mapelList.map(mapel => (
                  <option key={mapel.id} value={mapel.id}>
                    {mapel.nama} ({mapel.tingkatKelas.tipe} {mapel.tingkatKelas.level} {mapel.jurusan ? `- ${mapel.jurusan.nama_jurusan}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">KKM (Nilai Kelulusan)</label>
                <input type="number" name="kkm" defaultValue={75} min={0} max={100} step="0.5" required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700 bg-gray-50 focus:bg-white font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Durasi (Menit)</label>
                <input type="number" name="durasiMenit" defaultValue={90} required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700 bg-gray-50 focus:bg-white" />
              </div>
            </div>

            <div className="flex space-x-6 py-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" name="acakSoal" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-sm font-semibold text-gray-700">Acak Urutan Soal</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" name="acakOpsi" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-sm font-semibold text-gray-700">Acak Opsi (A,B,C,D)</span>
              </label>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition mt-2 shadow-sm shadow-blue-200">
              Simpan Paket Soal
            </button>
          </form>
        </div>

        {/* Tabel Data Paket Soal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 xl:col-span-2 overflow-hidden flex flex-col">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Daftar Ujian</h2>
            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{paketSoalList.length} Paket</span>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-12">No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Info Ujian</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Standar KKM</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Jumlah Soal</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paketSoalList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Belum ada paket ujian yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  paketSoalList.map((paket, index) => (
                    <tr key={paket.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 text-center font-bold text-gray-400">{index + 1}</td>
                      <td className="p-4">
                        <p className="text-gray-900 font-bold text-sm">{paket.judul}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold border border-indigo-100">
                            {paket.mataPelajaran.nama}
                          </span>
                          <span className="text-gray-500 text-xs flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {paket.durasiMenit} Menit
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-lg text-sm border border-amber-200">
                          {paket.kkm ?? 75}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-gray-700 font-semibold text-sm">
                          {paket._count?.soals || 0} Soal
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right align-middle">
                        <div className="flex items-center justify-end space-x-2 transition-opacity">
                          <Link href={`/admin/soal/${paket.id}`} title="Kelola Soal" className="text-blue-700 bg-blue-100 hover:bg-blue-200 hover:text-blue-800 p-2 rounded-lg transition border border-transparent hover:border-blue-300 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </Link>
                          <form action={deletePaketSoal}>
                            <input type="hidden" name="id" value={paket.id} />
                            <button type="submit" title="Hapus Paket" className="text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 p-2 rounded-lg transition border border-transparent hover:border-red-200 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </form>
                        </div>
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
