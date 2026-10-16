import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [totalSekolah, totalSiswa, totalSoal, ujianAktif] = await Promise.all([
    prisma.sekolah.count(),
    prisma.user.count({ where: { role: "SISWA" } }),
    prisma.soal.count(),
    prisma.sesiUjian.count({ where: { status: "AKTIF" } })
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Admin</h1>
      
      {/* Statistik Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-2xl">
            🏫
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Sekolah</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalSekolah}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-2xl">
            👨‍🎓
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Siswa</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalSiswa}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-2xl">
            📚
          </div>
          <div>
            <p className="text-gray-500 text-sm">Bank Soal</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalSoal}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-2xl">
            ⏱️
          </div>
          <div>
            <p className="text-gray-500 text-sm">Ujian Aktif</p>
            <h3 className="text-2xl font-bold text-gray-800">{ujianAktif}</h3>
          </div>
        </div>
      </div>

      {/* Konten Tambahan */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Aktivitas Terkini</h2>
        <div className="space-y-4">
          <p className="text-gray-500 italic">Belum ada aktivitas (Data dinamis akan ditampilkan di sini).</p>
        </div>
      </div>
    </div>
  );
}
