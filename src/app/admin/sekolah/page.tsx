import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

// Server Actions
async function addSekolah(formData: FormData) {
  "use server";
  const nama = formData.get("nama") as string;
  const alamat = formData.get("alamat") as string;
  if (nama) {
    await prisma.sekolah.create({ data: { nama, alamat } });
    revalidatePath("/admin/sekolah");
  }
}

async function updateSekolah(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const nama = formData.get("nama") as string;
  const alamat = formData.get("alamat") as string;
  if (id && nama) {
    await prisma.sekolah.update({
      where: { id },
      data: { nama, alamat },
    });
    revalidatePath("/admin/sekolah");
    redirect("/admin/sekolah");
  }
}

async function deleteSekolah(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    await prisma.sekolah.delete({ where: { id } });
    revalidatePath("/admin/sekolah");
  }
}

export default async function DataSekolahPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  // Fetch list sekolah
  const sekolahList = await prisma.sekolah.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Jika sedang mode edit, fetch data sekolah tertentu
  let editData = null;
  if (params.edit) {
    editData = await prisma.sekolah.findUnique({
      where: { id: params.edit },
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Data Sekolah</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah/Edit Sekolah */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {editData ? "Edit Sekolah" : "Tambah Sekolah"}
          </h2>
          <form action={editData ? updateSekolah : addSekolah} className="space-y-4">
            {editData && <input type="hidden" name="id" value={editData.id} />}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
              <input
                type="text"
                name="nama"
                required
                defaultValue={editData?.nama || ""}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Contoh: SMA Negeri 1 Jakarta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat (Opsional)</label>
              <textarea
                name="alamat"
                rows={3}
                defaultValue={editData?.alamat || ""}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan alamat sekolah..."
              ></textarea>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {editData ? "Update Data" : "Simpan Data"}
              </button>
              {editData && (
                <Link
                  href="/admin/sekolah"
                  className="w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Batal
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Tabel Data Sekolah */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Nama Sekolah</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Alamat</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sekolahList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">
                      Belum ada data sekolah. Silakan tambah data baru.
                    </td>
                  </tr>
                ) : (
                  sekolahList.map((sekolah) => (
                    <tr key={sekolah.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4 text-gray-800 font-medium">{sekolah.nama}</td>
                      <td className="p-4 text-gray-500 text-sm">{sekolah.alamat || "-"}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/admin/sekolah?edit=${sekolah.id}`}
                            className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm font-medium transition"
                          >
                            Edit
                          </Link>
                          <form action={deleteSekolah}>
                            <input type="hidden" name="id" value={sekolah.id} />
                            <button 
                              type="submit" 
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition"
                            >
                              Hapus
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
