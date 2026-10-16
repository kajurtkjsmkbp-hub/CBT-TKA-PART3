import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

async function uploadArsipBap(formData: FormData) {
  "use server";
  const file = formData.get("arsip") as File;
  const sesiId = formData.get("sesiId") as string;
  const ujianId = formData.get("ujianId") as string;
  
  if (!file || !sesiId || file.size === 0) return;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Simpan file ke public/uploads/bap (atau direktori yg aman)
  const uploadDir = path.join(process.cwd(), "public", "uploads", "bap");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const ext = file.name.split('.').pop();
  const fileName = `BAP_${sesiId}_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  
  fs.writeFileSync(filePath, buffer);
  
  // Simpan path ke DB
  await prisma.sesiUjian.update({
    where: { id: sesiId },
    data: { arsipBap: `/uploads/bap/${fileName}` }
  });
  
  revalidatePath(`/admin/hasil/${ujianId}`);
}

export default async function DetailHasilUjianPage({ params }: { params: Promise<{ ujianId: string }> }) {
  const resolvedParams = await params;
  
  const ujian = await prisma.ujian.findUnique({
    where: { id: resolvedParams.ujianId },
    include: {
      mataPelajaran: true,
      soals: true,
      sesiUjians: { orderBy: { waktuMulai: "desc" } },
      _count: { select: { soals: true } }
    }
  });

  if (!ujian) return notFound();

  // Ambil semua hasil siswa yang mengerjakan ujian ini melalui sesiUjian
  const hasilSiswa = await prisma.hasilUjian.findMany({
    where: {
      sesiUjian: {
        ujianId: resolvedParams.ujianId
      }
    },
    include: {
      siswa: {
        include: { tingkatKelas: true, jurusan: true }
      }
    },
    orderBy: { nilaiAkhir: "desc" }
  });

  // Kalkulasi Statistik Sederhana
  const totalPeserta = hasilSiswa.length;
  let rataRata = 0;
  let nilaiTertinggi = 0;
  let nilaiTerendah = 0;

  if (totalPeserta > 0) {
    const totalNilai = hasilSiswa.reduce((acc, curr) => acc + curr.nilaiAkhir, 0);
    rataRata = totalNilai / totalPeserta;
    nilaiTertinggi = Math.max(...hasilSiswa.map(h => h.nilaiAkhir));
    nilaiTerendah = Math.min(...hasilSiswa.map(h => h.nilaiAkhir));
  }

  const kkm = ujian.kkm ?? 75;
  const jumlahLulus = hasilSiswa.filter(h => h.nilaiAkhir >= kkm).length;
  const persenLulus = totalPeserta > 0 ? ((jumlahLulus / totalPeserta) * 100).toFixed(0) : "0";

  // Analisis Butir Soal
  const analisisButirSoal = ujian.soals.map((soal, index) => {
    let benar = 0;
    
    hasilSiswa.forEach(h => {
       try {
         const answers = JSON.parse(h.detailJawaban || "{}");
         if (answers[index] !== undefined && answers[index].toString() === soal.kunciJawaban) benar++;
       } catch (e) {}
    });

    return {
      no: index + 1,
      konten: soal.kontenSoal.length > 50 ? soal.kontenSoal.substring(0, 50) + "..." : soal.kontenSoal,
      benar,
      salah: totalPeserta - benar,
      persentaseBenar: totalPeserta > 0 ? (benar / totalPeserta) * 100 : 0
    };
  });

  // Urutkan soal paling sulit (persentase benar terendah)
  analisisButirSoal.sort((a, b) => a.persentaseBenar - b.persentaseBenar);

  return (
    <div>
      <div className="mb-6 flex items-center space-x-4">
        <Link href="/admin/hasil" className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition font-medium">
          ← Kembali
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Rekap Nilai: {ujian.judul}</h1>
          <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
            <span>Mata Pelajaran: <strong className="text-gray-700">{ujian.mataPelajaran.nama}</strong></span>
            <span>•</span>
            <span>Standar KKM: <strong className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{kkm}</strong></span>
          </div>
        </div>
      </div>

      {/* Ringkasan Analitik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Peserta</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-2">{totalPeserta} <span className="text-sm text-gray-400 font-normal">Siswa</span></p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Kelulusan (KKM: {kkm})</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{jumlahLulus} <span className="text-sm text-gray-500 font-medium">({persenLulus}%)</span></p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rata-Rata Kelas</p>
          <p className="text-2xl font-extrabold text-gray-800 mt-2">{rataRata.toFixed(1)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nilai Tertinggi</p>
          <p className="text-2xl font-extrabold text-green-600 mt-2">{nilaiTertinggi.toFixed(1)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nilai Terendah</p>
          <p className="text-2xl font-extrabold text-red-600 mt-2">{nilaiTerendah.toFixed(1)}</p>
        </div>
      </div>

      {/* Arsip Pelaksanaan (BAP & Daftar Hadir) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Arsip Pelaksanaan (BAP & Daftar Hadir)</h2>
            <p className="text-sm text-gray-500">Upload dan kelola bukti fisik administrasi untuk tiap sesi ujian.</p>
          </div>
        </div>
        <div className="p-6">
          {ujian.sesiUjians.length === 0 ? (
            <p className="text-gray-500 text-center">Belum ada sesi yang dilaksanakan untuk ujian ini.</p>
          ) : (
            <div className="space-y-4">
              {ujian.sesiUjians.map((sesi, index) => (
                <div key={sesi.id} className="flex flex-col md:flex-row justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div>
                    <h3 className="font-bold text-gray-800">Pelaksanaan {index + 1} (Token: {sesi.token || "-"})</h3>
                    <p className="text-sm text-gray-500">
                      Sesi {sesi.sesi} - {sesi.ruang} | Tanggal: {sesi.waktuMulai.toLocaleDateString("id-ID")} | Status: {sesi.status}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    {sesi.arsipBap ? (
                      <a href={sesi.arsipBap} target="_blank" rel="noopener noreferrer" className="bg-green-100 text-green-700 hover:bg-green-200 font-semibold px-4 py-2 rounded-lg transition inline-flex items-center text-sm border border-green-200">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Lihat Arsip BAP
                      </a>
                    ) : (
                      <form action={uploadArsipBap} className="flex items-center space-x-2">
                        <input type="hidden" name="sesiId" value={sesi.id} />
                        <input type="hidden" name="ujianId" value={ujian.id} />
                        <input type="file" name="arsip" accept=".pdf,image/*" required className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm">
                          Upload Arsip
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabel Detail Nilai Siswa */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Rincian Hasil per Siswa</h2>
          <a 
            href={`/api/export-hasil/${ujian.id}`}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition shadow-sm text-sm flex items-center"
          >
            <span>⬇️ Export Excel</span>
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="p-4 text-sm font-semibold text-gray-700">Peringkat</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Nama Siswa</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Kelas / Jurusan</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center">Jawaban Benar</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center">Jawaban Salah</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center">Status Ketuntasan</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-right">NILAI AKHIR</th>
              </tr>
            </thead>
            <tbody>
              {totalPeserta === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="text-gray-400 mb-2 text-4xl">📭</div>
                    <p className="text-gray-500 font-medium">Belum ada siswa yang mengerjakan ujian ini.</p>
                  </td>
                </tr>
              ) : (
                hasilSiswa.map((h, idx) => {
                  const s = h.siswa;
                  let rankBadge = "";
                  if (idx === 0) rankBadge = "🥇";
                  else if (idx === 1) rankBadge = "🥈";
                  else if (idx === 2) rankBadge = "🥉";
                  const isSiswaLulus = h.nilaiAkhir >= kkm;

                  return (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-blue-50 transition">
                      <td className="p-4 text-center">
                        <span className="font-bold text-gray-600 text-lg">
                          {rankBadge || `#${idx + 1}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-900 font-bold">{s.nama}</p>
                        <p className="text-gray-500 text-xs">NIS: {s.email_username}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-700 text-sm">
                          {s.tingkatKelas ? `${s.tingkatKelas.tipe} ${s.tingkatKelas.level}` : "-"}
                        </p>
                        <p className="text-gray-500 text-xs">{s.jurusan?.nama_jurusan || ""}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                          {Math.round((h.nilaiAkhir / 100) * (ujian._count?.soals || 0))}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                          {(ujian._count?.soals || 0) - Math.round((h.nilaiAkhir / 100) * (ujian._count?.soals || 0))}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {isSiswaLulus ? (
                          <span className="bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                            LULUS
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                            REMEDIAL
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-2xl font-black text-[#0b5c92]">{h.nilaiAkhir.toFixed(2)}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Analisis Butir Soal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Analisis Butir Soal (Tingkat Kesulitan)</h2>
          <p className="text-sm text-gray-500">Menampilkan soal yang paling banyak dijawab salah hingga yang paling mudah.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="p-4 text-sm font-semibold text-gray-700 w-16 text-center">No</th>
                <th className="p-4 text-sm font-semibold text-gray-700">Potongan Soal</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center w-32">Penjawab Benar</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-center w-32">Penjawab Salah</th>
                <th className="p-4 text-sm font-semibold text-gray-700 text-right w-32">Persentase Benar</th>
              </tr>
            </thead>
            <tbody>
              {analisisButirSoal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Belum ada data soal.</td>
                </tr>
              ) : (
                analisisButirSoal.map((item) => (
                  <tr key={item.no} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-4 text-center font-bold text-gray-600">{item.no}</td>
                    <td className="p-4 text-sm text-gray-800">{item.konten}</td>
                    <td className="p-4 text-center">
                      <span className="text-green-600 font-semibold">{item.benar} Siswa</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-red-500 font-semibold">{item.salah} Siswa</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className={`font-bold ${item.persentaseBenar < 40 ? 'text-red-600' : item.persentaseBenar > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {item.persentaseBenar.toFixed(0)}%
                        </span>
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
  );
}
