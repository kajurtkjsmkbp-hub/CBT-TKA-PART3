import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ClientMapelRow from "@/components/ClientMapelRow";

// --- Server Actions ---
async function addMapel(formData: FormData) {
  "use server";
  const nama = formData.get("nama") as string;
  const tingkatKelasId = formData.get("tingkatKelasId") as string;
  const jurusanId = formData.get("jurusanId") as string; // Optional

  if (nama && tingkatKelasId) {
    await prisma.mataPelajaran.create({
      data: {
        nama,
        tingkatKelasId,
        jurusanId: jurusanId || "",
      },
    });
    revalidatePath("/admin/mapel");
  }
}


const toRoman = (num: number) => {
  const map: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
    11: 'XI', 12: 'XII'
  };
  return map[num] || num.toString();
};

export default async function DataMapelPage() {
  // Ambil referensi Kelas & Jurusan untuk dropdown form
  const kelasList = await prisma.tingkatKelas.findMany({
    orderBy: [{ tipe: "asc" }, { level: "asc" }],
  });
  
  const jurusanList = await prisma.jurusan.findMany({
    orderBy: { nama_jurusan: "asc" },
  });

  // Ambil Data Mapel (beserta relasinya agar bisa ditampilkan namanya)
  const mapelList = await prisma.mataPelajaran.findMany({
    include: {
      tingkatKelas: true,
      jurusan: true,
    },
    orderBy: { nama: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Mata Pelajaran</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Tambah Mapel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Mapel Baru</h2>
          <form action={addMapel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mata Pelajaran</label>
              <input
                type="text"
                name="nama"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Contoh: Matematika Lanjut"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Kelas</label>
              <select 
                name="tingkatKelasId" 
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">Pilih Kelas...</option>
                {kelasList.map(kelas => (
                  <option key={kelas.id} value={kelas.id}>
                    {kelas.tipe} - {toRoman(kelas.level)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan (Opsional)</label>
              <select 
                name="jurusanId" 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">-- Berlaku untuk Semua Jurusan --</option>
                {jurusanList.map(jurusan => (
                  <option key={jurusan.id} value={jurusan.id}>
                    {jurusan.nama_jurusan}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition mt-4"
            >
              Simpan Mata Pelajaran
            </button>
          </form>
        </div>

        {/* Tabel Data Mapel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Mata Pelajaran</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Jurusan</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {mapelList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Belum ada data mata pelajaran.
                    </td>
                  </tr>
                ) : (
                  mapelList.map((mapel) => (
                    <ClientMapelRow 
                      key={mapel.id} 
                      mapel={mapel} 
                      kelasList={kelasList} 
                      jurusanList={jurusanList} 
                    />
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
