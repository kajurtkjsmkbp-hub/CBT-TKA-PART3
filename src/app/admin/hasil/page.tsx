import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HasilUjianPage() {
  // Ambil semua paket ujian beserta statistik hasilnya
  const daftarUjian = await prisma.ujian.findMany({
    include: {
      mataPelajaran: true,
      _count: {
        select: {
          sesiUjians: true, // Ubah dari hasil ke sesiUjians
          soals: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Analitik & Hasil Ujian</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Daftar Paket Ujian</h2>
            <p className="text-sm text-gray-500">Pilih ujian untuk melihat rekap nilai dan analisis butir soal.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-semibold text-gray-600">Judul Ujian</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Mata Pelajaran</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Jumlah Soal</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Peserta Hadir</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarUjian.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Belum ada paket ujian yang terdaftar.
                  </td>
                </tr>
              ) : (
                daftarUjian.map((ujian) => (
                  <tr key={ujian.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-4">
                      <p className="text-gray-800 font-bold">{ujian.judul}</p>
                      <p className="text-gray-500 text-xs">Durasi: {ujian.durasiMenit} Menit</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-sm font-medium">
                        {ujian.mataPelajaran.nama}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-semibold text-gray-700">{ujian._count.soals}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold px-3 py-1 rounded-full text-sm ${ujian._count.sesiUjians > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {ujian._count.sesiUjians} Sesi
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/admin/hasil/${ujian.id}`}
                        className="inline-block bg-[#0b5c92] hover:bg-[#074775] text-white font-semibold px-4 py-2 rounded-lg transition shadow-sm text-sm"
                      >
                        Lihat Hasil 📊
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
