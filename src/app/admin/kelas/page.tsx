import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Helper: angka ke romawi
function toRomawi(n: number): string {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 13: "XIII" };
  return map[n] || String(n);
}

// --- Server Actions untuk Kelas ---
async function addKelas(formData: FormData) {
  "use server";
  const level = parseInt(formData.get("level") as string);
  const tipe = formData.get("tipe") as string;

  if (level && tipe) {
    await prisma.tingkatKelas.create({
      data: { level, tipe },
    });
    revalidatePath("/admin/kelas");
  }
}

async function deleteKelas(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    await prisma.tingkatKelas.delete({ where: { id } });
    revalidatePath("/admin/kelas");
  }
}

// --- Server Actions untuk Jurusan ---
async function addJurusan(formData: FormData) {
  "use server";
  const nama_jurusan = formData.get("nama_jurusan") as string;

  if (nama_jurusan) {
    await prisma.jurusan.create({
      data: { nama_jurusan },
    });
    revalidatePath("/admin/kelas");
  }
}

async function deleteJurusan(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    await prisma.jurusan.delete({ where: { id } });
    revalidatePath("/admin/kelas");
  }
}

// --- Server Actions untuk Rombel ---
async function addRombel(formData: FormData) {
  "use server";
  const tingkatKelasId = formData.get("tingkatKelasId") as string;
  const jurusanId = (formData.get("jurusanId") as string) || null;
  const nomorKelas = (formData.get("nomorKelas") as string)?.trim();

  if (tingkatKelasId && nomorKelas) {
    try {
      await prisma.rombel.create({
        data: {
          tingkatKelasId,
          jurusanId: jurusanId || null,
          nomorKelas,
        },
      });
    } catch (error) {
      // Duplicate rombel - abaikan
      console.error("Rombel sudah ada:", error);
    }
    revalidatePath("/admin/kelas");
  }
}

async function deleteRombel(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    // Set rombelId = null pada semua siswa yang terkait sebelum hapus
    await prisma.user.updateMany({
      where: { rombelId: id },
      data: { rombelId: null },
    });
    await prisma.rombel.delete({ where: { id } });
    revalidatePath("/admin/kelas");
  }
}

export default async function DataKelasJurusanPage() {
  // Fetch data dari database
  const kelasList = await prisma.tingkatKelas.findMany({
    orderBy: [{ tipe: "asc" }, { level: "asc" }],
  });
  
  const jurusanList = await prisma.jurusan.findMany({
    orderBy: { nama_jurusan: "asc" },
  });

  const rombelList = await prisma.rombel.findMany({
    include: {
      tingkatKelas: true,
      jurusan: true,
      _count: { select: { users: true } },
    },
    orderBy: [
      { tingkatKelas: { level: "asc" } },
      { nomorKelas: "asc" },
    ],
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Data Kelas & Jurusan</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* ================= BAGIAN KELAS ================= */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Tingkat Kelas</h2>
            <form action={addKelas} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat (1-12)</label>
                <input
                  type="number"
                  name="level"
                  min="1"
                  max="12"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Misal: 10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenjang</label>
                <select 
                  name="tipe" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Pilih...</option>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                  <option value="SMK">SMK</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Simpan Kelas
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Jenjang</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Tingkat (Level)</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {kelasList.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-gray-500">Belum ada data kelas.</td></tr>
                ) : (
                  kelasList.map((kelas) => (
                    <tr key={kelas.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 text-gray-800 font-medium">{kelas.tipe}</td>
                      <td className="p-4 text-gray-500">Kelas {toRomawi(kelas.level)}</td>
                      <td className="p-4 text-right">
                        <form action={deleteKelas}>
                          <input type="hidden" name="id" value={kelas.id} />
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


        {/* ================= BAGIAN JURUSAN ================= */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Jurusan</h2>
            <form action={addJurusan} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jurusan</label>
                <input
                  type="text"
                  name="nama_jurusan"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="Contoh: Rekayasa Perangkat Lunak (RPL)"
                />
              </div>
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition whitespace-nowrap"
              >
                Simpan Jurusan
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Nama Jurusan</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jurusanList.length === 0 ? (
                  <tr><td colSpan={2} className="p-8 text-center text-gray-500">Belum ada data jurusan.</td></tr>
                ) : (
                  jurusanList.map((jurusan) => (
                    <tr key={jurusan.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 text-gray-800 font-medium">{jurusan.nama_jurusan}</td>
                      <td className="p-4 text-right">
                        <form action={deleteJurusan}>
                          <input type="hidden" name="id" value={jurusan.id} />
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

      {/* ================= BAGIAN ROMBEL ================= */}
      <div className="mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Tambah Rombongan Belajar (Rombel)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Gabungkan Tingkat Kelas + Jurusan (opsional) + Nomor/Karakter Kelas. Contoh: <span className="font-semibold text-gray-700">XII TKJ 1</span> atau <span className="font-semibold text-gray-700">XI IPA A</span>
          </p>
          <form action={addRombel} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat Kelas</label>
              <select 
                name="tingkatKelasId" 
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
              >
                <option value="">Pilih Kelas...</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.tipe} - Kelas {toRomawi(k.level)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan (Opsional)</label>
              <select 
                name="jurusanId" 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
              >
                <option value="">-- Tanpa Jurusan / Umum --</option>
                {jurusanList.map(j => (
                  <option key={j.id} value={j.id}>{j.nama_jurusan}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor / Karakter Kelas</label>
              <input
                type="text"
                name="nomorKelas"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="Contoh: 1, 2, A, B"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Simpan Rombel
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-semibold text-gray-600">Rombel</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Tingkat</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Jurusan</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">No. / Karakter</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Jumlah Siswa</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rombelList.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Belum ada data rombel. Tambahkan Tingkat Kelas dan Jurusan terlebih dahulu.</td></tr>
              ) : (
                rombelList.map((rombel) => {
                  const label = rombel.jurusan
                    ? `${toRomawi(rombel.tingkatKelas.level)} ${rombel.jurusan.nama_jurusan} ${rombel.nomorKelas}`
                    : `${rombel.tingkatKelas.tipe} ${toRomawi(rombel.tingkatKelas.level)} ${rombel.nomorKelas}`;
                  return (
                    <tr key={rombel.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4">
                        <span className="inline-block bg-teal-100 text-teal-800 text-sm font-bold px-3 py-1 rounded-lg">
                          {label}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">{rombel.tingkatKelas.tipe} {toRomawi(rombel.tingkatKelas.level)}</td>
                      <td className="p-4 text-gray-500">{rombel.jurusan?.nama_jurusan || "-"}</td>
                      <td className="p-4 text-center text-gray-800 font-bold">{rombel.nomorKelas}</td>
                      <td className="p-4 text-center">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                          {rombel._count.users} siswa
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <form action={deleteRombel}>
                          <input type="hidden" name="id" value={rombel.id} />
                          <button type="submit" className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition">
                            Hapus
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
