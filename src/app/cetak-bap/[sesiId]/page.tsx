import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import PrintButton from "@/app/cetak-kartu/PrintButton";

export default async function CetakBapPage({ params }: { params: Promise<{ sesiId: string }> }) {
  // Verifikasi login admin/guru
  const userRole = (await cookies()).get("cbt_session")?.value;
  if (userRole !== "ADMIN" && userRole !== "GURU") {
    redirect("/login");
  }

  const { sesiId } = await params;

  const sesi = await prisma.sesiUjian.findUnique({
    where: { id: sesiId },
    include: {
      ujian: { include: { mataPelajaran: true } }
    }
  });

  if (!sesi) return notFound();

  // Ambil semua siswa yang "seharusnya" ikut ujian ini (berdasarkan kelas/jurusan mapel)
  const siswaTerdaftar = await prisma.user.findMany({
    where: {
      role: "SISWA",
      tingkatKelasId: sesi.ujian.mataPelajaran.tingkatKelasId,
      jurusanId: sesi.ujian.mataPelajaran.jurusanId,
    },
    include: { sekolah: true, tingkatKelas: true, jurusan: true },
    orderBy: { nama: "asc" }
  });

  const pengaturanList = await prisma.pengaturan.findMany();
  const getVal = (kunci: string) => pengaturanList.find(p => p.kunci === kunci)?.nilai || "";

  const namaSekolah = getVal("NAMA_SEKOLAH") || "PANITIA UJIAN CBT";
  const alamatSekolah = getVal("ALAMAT_SEKOLAH") || "Alamat Sekolah Belum Diatur";
  const logoPath = getVal("LOGO_PATH");
  const kepalaSekolah = getVal("KEPALA_SEKOLAH") || "__________________";
  const nipKepala = getVal("NIP_KEPALA") || "__________________";

  return (
    <div className="bg-white min-h-screen text-black font-serif pb-20">
      {/* Hide this top bar when printing */}
      <div className="print:hidden bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50 font-sans">
        <h1 className="font-bold text-xl tracking-wide">TKA-CBT <span className="font-light opacity-80">| Mode Cetak BAP & Daftar Hadir</span></h1>
        <PrintButton />
      </div>

      <div className="max-w-[210mm] mx-auto p-8 print:p-0 print:pt-4">
        
        {/* KOP SURAT */}
        <div className="border-b-4 border-black pb-4 mb-6 flex items-center justify-between">
          {logoPath ? (
            <img src={logoPath} alt="Logo" className="h-24 w-24 object-contain mr-4" />
          ) : (
            <div className="h-24 w-24 bg-gray-100 flex items-center justify-center border border-gray-300 mr-4">Logo</div>
          )}
          <div className="flex-1 text-center pr-28">
            <h1 className="text-xl font-bold uppercase">PANITIA PELAKSANA UJIAN BERBASIS KOMPUTER</h1>
            <h2 className="text-2xl font-black uppercase tracking-wider">{namaSekolah}</h2>
            <p className="text-sm">{alamatSekolah}</p>
          </div>
        </div>

        {/* JUDUL */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-bold underline uppercase">Berita Acara Pelaksanaan Ujian (BAP)</h3>
          <p className="text-sm font-semibold mt-1">Token Sesi: {sesi.token}</p>
        </div>

        {/* ISI BAP */}
        <div className="text-justify mb-8 leading-relaxed text-sm">
          <div className="flex flex-wrap items-center gap-1 mb-4 leading-8">
            <span>Pada hari ini</span>
            <input type="text" placeholder="Senin" className="w-24 bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold text-center print:bg-transparent print:border-none print:p-0" />
            <span>tanggal</span>
            <input type="text" placeholder="21" className="w-16 bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold text-center print:bg-transparent print:border-none print:p-0" />
            <span>bulan</span>
            <input type="text" placeholder="September" className="w-32 bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold text-center print:bg-transparent print:border-none print:p-0" />
            <span>tahun</span>
            <input type="text" placeholder="2026" className="w-24 bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold text-center print:bg-transparent print:border-none print:p-0" />
            <span>, di</span>
            <input type="text" placeholder="Lab Komputer 1" className="flex-1 min-w-[150px] bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold print:bg-transparent print:border-none print:p-0" />
            <span>telah dilaksanakan Ujian Berbasis Komputer (CBT) dengan rincian:</span>
          </div>

          <table className="mt-4 mb-4 font-semibold ml-4">
            <tbody>
              <tr><td className="w-56 py-2">1. Mata Pelajaran</td><td>: {sesi.ujian.mataPelajaran.nama}</td></tr>
              <tr><td className="w-56 py-2">2. Judul Ujian</td><td>: {sesi.ujian.judul}</td></tr>
              <tr>
                <td className="w-56 py-2">3. Sesi Ujian / Ruang</td>
                <td>: <input type="text" placeholder="Sesi 1 / Ruang Lab 1" className="w-64 bg-blue-50 border-b border-blue-300 px-2 outline-none print:bg-transparent print:border-none print:p-0" /></td>
              </tr>
              <tr>
                <td className="w-56 py-2">4. Jumlah Peserta Seharusnya</td>
                <td>: {siswaTerdaftar.length > 0 ? siswaTerdaftar.length : <input type="text" className="w-16 bg-blue-50 border-b border-blue-300 text-center outline-none print:bg-transparent print:border-none print:p-0" />} Orang</td>
              </tr>
              <tr>
                <td className="w-56 py-2">5. Jumlah Peserta Hadir</td>
                <td>: <input type="text" className="w-16 bg-blue-50 border-b border-blue-300 text-center outline-none print:bg-transparent print:border-none print:p-0" /> Orang</td>
              </tr>
              <tr>
                <td className="w-56 py-2">6. Jumlah Tidak Hadir</td>
                <td>: <input type="text" className="w-16 bg-blue-50 border-b border-blue-300 text-center outline-none print:bg-transparent print:border-none print:p-0" /> Orang</td>
              </tr>
              <tr>
                <td className="w-56 py-2 align-top">7. NIS / Nama Tidak Hadir</td>
                <td className="align-top">: 
                  <div className="inline-flex flex-col space-y-2 w-80 align-top">
                    <div className="flex items-center"><span className="w-5">1.</span> <input type="text" className="flex-1 bg-blue-50 border-b border-blue-300 px-2 outline-none print:bg-transparent print:border-none print:p-0" /></div>
                    <div className="flex items-center"><span className="w-5">2.</span> <input type="text" className="flex-1 bg-blue-50 border-b border-blue-300 px-2 outline-none print:bg-transparent print:border-none print:p-0" /></div>
                    <div className="flex items-center"><span className="w-5">3.</span> <input type="text" className="flex-1 bg-blue-50 border-b border-blue-300 px-2 outline-none print:bg-transparent print:border-none print:p-0" /></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div className="mt-6">
            <p className="mb-2 font-semibold">Catatan selama pelaksanaan ujian:</p>
            <textarea 
              rows={3} 
              className="w-full bg-blue-50 border border-blue-300 rounded p-3 outline-none resize-none leading-relaxed print:bg-transparent print:border-none print:p-0 print:resize-none"
              placeholder="Ketik catatan kejadian di sini. Kosongkan jika tidak ada."
            ></textarea>
          </div>

          <p className="mt-4">
            Berita acara ini dibuat dengan sesungguhnya untuk dapat digunakan sebagaimana mestinya.
          </p>
        </div>

        {/* TTD BAP */}
        <div className="flex justify-between mt-12 mb-16 text-sm">
          <div className="text-center w-64">
            <p>Proktor,</p>
            <div className="h-24"></div>
            <p className="font-bold">
              (<input type="text" placeholder="Nama Proktor" className="w-48 text-center bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold print:bg-transparent print:border-none print:p-0" />)
            </p>
            <p>NIP. <input type="text" placeholder="-" className="w-40 text-center bg-blue-50 border-b border-blue-300 outline-none print:bg-transparent print:border-none print:p-0" /></p>
          </div>
          <div className="text-center w-64">
            <p>Pengawas Ruang,</p>
            <div className="h-24"></div>
            <p className="font-bold">
              (<input type="text" placeholder="Nama Pengawas" className="w-48 text-center bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold print:bg-transparent print:border-none print:p-0" />)
            </p>
            <p>NIP. <input type="text" placeholder="-" className="w-40 text-center bg-blue-50 border-b border-blue-300 outline-none print:bg-transparent print:border-none print:p-0" /></p>
          </div>
        </div>

        {/* PAGE BREAK (UNTUK DAFTAR HADIR) */}
        <div className="break-before-page"></div>

        {/* KOP DAFTAR HADIR */}
        <div className="text-center mb-8 pt-8 relative">
          {/* Tanda ini membantu mengidentifikasi halaman saat print */}
          <span className="absolute top-0 right-0 text-xs text-gray-300 print:hidden">Hal. 2</span>
          <h3 className="text-lg font-bold underline uppercase">Daftar Hadir Peserta Ujian</h3>
          <p className="text-sm font-semibold mt-1">Mata Pelajaran: {sesi.ujian.mataPelajaran.nama}</p>
          <div className="mt-2 text-sm flex justify-center space-x-6">
            <span>Sesi: <input type="text" placeholder="1" className="w-16 text-center bg-blue-50 border-b border-blue-300 outline-none font-bold print:bg-transparent print:border-none print:p-0" /></span>
            <span>Ruang: <input type="text" placeholder="Lab 1" className="w-32 text-center bg-blue-50 border-b border-blue-300 outline-none font-bold print:bg-transparent print:border-none print:p-0" /></span>
          </div>
        </div>

        {/* DAFTAR HADIR */}
        <table className="w-full border-collapse border border-black text-sm mb-12">
          <thead>
            <tr className="bg-gray-100 text-center font-bold">
              <th className="border border-black p-2 w-10">No</th>
              <th className="border border-black p-2 w-20">Foto</th>
              <th className="border border-black p-2">Nama Peserta</th>
              <th className="border border-black p-2 w-32">NIS / Username</th>
              <th className="border border-black p-2 w-32">Kelas</th>
              <th className="border border-black p-2 w-40">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {siswaTerdaftar.length > 0 ? (
              siswaTerdaftar.map((siswa, idx) => (
                <tr key={siswa.id}>
                  <td className="border border-black p-2 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 text-center h-16 w-16">
                    {siswa.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={siswa.foto} alt="Foto" className="h-16 w-14 object-cover mx-auto" />
                    ) : (
                      <div className="h-16 w-14 border border-dashed border-gray-400 mx-auto bg-gray-50 flex items-center justify-center text-[8px] text-gray-400">3x4</div>
                    )}
                  </td>
                  <td className="border border-black p-2 font-semibold uppercase">{siswa.nama}</td>
                  <td className="border border-black p-2 text-center">{siswa.email_username}</td>
                  <td className="border border-black p-2 text-center">
                    {siswa.tingkatKelas ? `${siswa.tingkatKelas.tipe} ${siswa.tingkatKelas.level}` : "-"} {siswa.jurusan ? ` ${siswa.jurusan.nama_jurusan}` : ""}
                  </td>
                  <td className="border border-black p-2 relative h-16">
                    <span className="absolute top-1 left-2 text-xs text-gray-500">{idx % 2 === 0 ? `${idx + 1}.` : ""}</span>
                    <span className="absolute top-1 right-2 text-xs text-gray-500">{idx % 2 !== 0 ? `${idx + 1}.` : ""}</span>
                  </td>
                </tr>
              ))
            ) : (
              // Jika data siswa kosong, cetak baris kosong 20 baris
              Array.from({ length: 20 }).map((_, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-2 text-center h-16">{idx + 1}</td>
                  <td className="border border-black p-2"><div className="h-16 w-14 border border-dashed border-gray-400 mx-auto bg-gray-50"></div></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2 relative h-16">
                    <span className="absolute top-1 left-2 text-xs text-gray-400">{idx % 2 === 0 ? `${idx + 1}.` : ""}</span>
                    <span className="absolute top-1 right-2 text-xs text-gray-400">{idx % 2 !== 0 ? `${idx + 1}.` : ""}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* TTD PENGESAHAN DAFTAR HADIR */}
        <div className="flex justify-between mt-8 text-sm mb-12">
          <div className="text-center w-64">
            <p>Mengetahui,</p>
            <p>Kepala Sekolah,</p>
            <div className="h-20"></div>
            <p className="font-bold border-b border-black inline-block px-4">{kepalaSekolah}</p>
            <p className="mt-1">NIP. {nipKepala}</p>
          </div>
          <div className="text-center w-64">
            <p>Pengawas Ruang,</p>
            <div className="h-24"></div>
            <p className="font-bold">
              (<input type="text" placeholder="Nama Pengawas" className="w-48 text-center bg-blue-50 border-b border-blue-300 px-2 outline-none font-bold print:bg-transparent print:border-none print:p-0" />)
            </p>
            <p>NIP. <input type="text" placeholder="-" className="w-40 text-center bg-blue-50 border-b border-blue-300 outline-none print:bg-transparent print:border-none print:p-0" /></p>
          </div>
        </div>
      </div>
    </div>
  );
}
