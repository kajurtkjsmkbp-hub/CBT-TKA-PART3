import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PrintButton from "./PrintButton";
import Link from "next/link";

function toRomawi(n: number): string {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 13: "XIII", 7: "VII", 8: "VIII", 9: "IX" };
  return map[n] || String(n);
}

function formatRombel(siswa: any): string {
  if (siswa.rombel) {
    return siswa.rombel.jurusan
      ? `${toRomawi(siswa.rombel.tingkatKelas?.level ?? 10)} ${siswa.rombel.jurusan.nama_jurusan} ${siswa.rombel.nomorKelas}`
      : `${siswa.rombel.tingkatKelas?.tipe ?? "Kelas"} ${toRomawi(siswa.rombel.tingkatKelas?.level ?? 10)} ${siswa.rombel.nomorKelas}`;
  }
  if (siswa.tingkatKelas) {
    return `${siswa.tingkatKelas.tipe} ${toRomawi(siswa.tingkatKelas.level)}${siswa.jurusan ? ` ${siswa.jurusan.nama_jurusan}` : ""}`;
  }
  return "-";
}

type PageProps = {
  searchParams: Promise<{ rombelId?: string; gelombang?: string; siswaId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function CetakKartuPage(props: PageProps) {
  // Verifikasi login admin / guru
  const userRole = (await cookies()).get("cbt_session")?.value;
  if (userRole !== "ADMIN" && userRole !== "GURU") {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const filterRombelId = searchParams?.rombelId || "";
  const filterGelombang = searchParams?.gelombang ? parseInt(searchParams.gelombang) : undefined;
  const filterSiswaId = searchParams?.siswaId || "";

  const whereClause: any = { role: "SISWA" };
  if (filterSiswaId) whereClause.id = filterSiswaId;
  if (filterRombelId) whereClause.rombelId = filterRombelId;
  if (filterGelombang) whereClause.gelombang = filterGelombang;

  const [siswaList, rombelList, listPengaturan] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
        sekolah: true,
        tingkatKelas: true,
        jurusan: true,
        rombel: { include: { tingkatKelas: true, jurusan: true } },
      },
      orderBy: [{ rombelId: "asc" }, { nama: "asc" }],
    }),
    prisma.rombel.findMany({
      include: { tingkatKelas: true, jurusan: true },
      orderBy: [{ tingkatKelas: { level: "asc" } }, { nomorKelas: "asc" }],
    }),
    prisma.pengaturan.findMany(),
  ]);

  const getSetting = (kunci: string, fallback: string = "") => {
    return listPengaturan.find((p) => p.kunci === kunci)?.nilai || fallback;
  };

  const logoSekolah = getSetting("LOGO_PATH", "");
  const jamSesi1 = getSetting("JAM_SESI_1", "07.30 - 09.30");
  const jamSesi2 = getSetting("JAM_SESI_2", "10.30 - 12.30");
  const jamSesi3 = getSetting("JAM_SESI_3", "13.30 - 15.30");

  const getJamSesi = (sesiNum: number) => {
    if (sesiNum === 2) return jamSesi2;
    if (sesiNum === 3) return jamSesi3;
    return jamSesi1;
  };

  const tglHari1 = getSetting("TGL_HARI_1", "Senin, 19 Okt 2026");
  const tglHari2 = getSetting("TGL_HARI_2", "Selasa, 20 Okt 2026");
  const tglHari3 = getSetting("TGL_HARI_3", "Rabu, 21 Okt 2026");
  const tglHari4 = getSetting("TGL_HARI_4", "Kamis, 22 Okt 2026");

  return (
    <div className="bg-slate-100 min-h-screen text-black font-sans print:bg-white">
      {/* Top Bar - Disembunyikan saat mencetak */}
      <div className="print:hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin/siswa" className="text-blue-200 hover:text-white text-xs font-bold transition flex items-center gap-1">
                ← Kembali ke Data Siswa
              </Link>
            </div>
            <h1 className="font-black text-xl tracking-tight mt-0.5">
              CBT Pro <span className="font-normal opacity-80">| Mode Cetak Kartu Peserta Ujian</span>
            </h1>
            <p className="text-xs text-blue-200 mt-0.5">
              Menampilkan {siswaList.length} kartu peserta (dilengkapi Gelombang, Ruang & Jadwal Sesi H1–H4).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Rombel */}
            <form method="GET" className="flex items-center gap-2">
              <select
                name="rombelId"
                defaultValue={filterRombelId}
                className="bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/30 outline-none backdrop-blur-sm cursor-pointer"
              >
                <option value="" className="text-slate-800">Semua Rombel</option>
                {rombelList.map((r) => (
                  <option key={r.id} value={r.id} className="text-slate-800">
                    {r.jurusan
                      ? `${toRomawi(r.tingkatKelas?.level ?? 10)} ${r.jurusan.nama_jurusan} ${r.nomorKelas}`
                      : `${r.tingkatKelas?.tipe ?? "Kelas"} ${toRomawi(r.tingkatKelas?.level ?? 10)} ${r.nomorKelas}`}
                  </option>
                ))}
              </select>

              <select
                name="gelombang"
                defaultValue={searchParams?.gelombang || ""}
                className="bg-white/15 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/30 outline-none backdrop-blur-sm cursor-pointer"
              >
                <option value="" className="text-slate-800">Semua Gelombang</option>
                <option value="1" className="text-slate-800">Gelombang 1</option>
                <option value="2" className="text-slate-800">Gelombang 2</option>
              </select>

              <button
                type="submit"
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-lg transition border border-white/30"
              >
                Filter
              </button>
            </form>

            <PrintButton />
          </div>
        </div>
      </div>

      {/* Grid Kartu Peserta - 2 Kolom untuk Standar A4 */}
      <div
        className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:p-0 print:gap-4 print:m-0"
        style={{ maxWidth: "210mm", margin: "0 auto" }}
      >
        {siswaList.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-2xl border border-slate-300 text-center text-slate-500 font-medium">
            Tidak ada siswa yang cocok dengan filter yang dipilih.
          </div>
        ) : (
          siswaList.map((siswa) => (
            <div
              key={siswa.id}
              className="border-2 border-gray-900 rounded-xl overflow-hidden bg-white shadow-sm break-inside-avoid print:shadow-none print:border-gray-900 flex flex-col justify-between"
            >
              {/* Header Kartu Resmi dengan Logo Sekolah */}
              <div className="bg-gray-100/90 border-b-2 border-gray-900 px-3.5 py-2.5 flex items-center gap-3">
                {/* Logo Sekolah di Kiri */}
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                  {logoSekolah ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSekolah}
                      alt="Logo Sekolah"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-blue-900/10 border border-blue-900/20 flex items-center justify-center text-blue-900 text-lg">
                      🏛️
                    </div>
                  )}
                </div>

                {/* Judul Kartu & Nama Sekolah di Tengah */}
                <div className="flex-1 text-center pr-2">
                  <h2 className="font-black text-xs sm:text-[13px] tracking-wider uppercase text-gray-900 leading-tight">
                    KARTU PESERTA UJIAN (CBT)
                  </h2>
                  <p className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wide leading-tight mt-0.5">
                    TES KEMAMPUAN AKADEMIK (TKA)
                  </p>
                  <p className="font-extrabold text-xs text-blue-900 uppercase tracking-tight leading-tight mt-0.5">
                    {siswa.sekolah?.nama || getSetting("NAMA_SEKOLAH", "SMK Negeri 1 Adiwerna")}
                  </p>
                </div>
              </div>

              {/* Body Kartu: Terstruktur Bersih & Rapi */}
              <div className="p-3 bg-white space-y-2.5 flex-1 flex flex-col justify-between">
                {/* 1. Baris Identitas & Pas Foto */}
                <div className="flex items-start gap-3">
                  {/* Pas Foto 3x4 */}
                  <div className="w-[74px] h-[98px] border-2 border-gray-300 border-dashed rounded-md flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden shadow-xs">
                    {siswa.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-[10px] text-center font-medium leading-tight">
                        Pas Foto<br />3x4
                      </span>
                    )}
                  </div>

                  {/* Tabel Rapi Data Siswa (Titik Dua Lurus Sempurna) */}
                  <table className="flex-1 text-xs border-collapse leading-tight my-auto">
                    <tbody>
                      <tr>
                        <td className="font-semibold text-gray-600 py-0.5 w-24 align-top">Nama Peserta</td>
                        <td className="w-2.5 text-center text-gray-500 py-0.5 align-top font-bold">:</td>
                        <td className="font-bold text-gray-900 py-0.5 align-top">{siswa.nama}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-gray-600 py-0.5 align-top">NIS / No. Urut</td>
                        <td className="text-center text-gray-500 py-0.5 align-top font-bold">:</td>
                        <td className="font-mono font-medium text-gray-800 py-0.5 align-top">{siswa.email_username}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-gray-600 py-0.5 align-top">Kelas / Rombel</td>
                        <td className="text-center text-gray-500 py-0.5 align-top font-bold">:</td>
                        <td className="font-medium text-gray-800 py-0.5 align-top">{formatRombel(siswa)}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-gray-600 py-0.5 align-top">Gelombang</td>
                        <td className="text-center text-gray-500 py-0.5 align-top font-bold">:</td>
                        <td className="font-bold text-blue-900 py-0.5 align-top">Gelombang {siswa.gelombang ?? 1}</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-gray-600 py-0.5 align-top">Ruang Ujian</td>
                        <td className="text-center text-gray-500 py-0.5 align-top font-bold">:</td>
                        <td className="font-bold text-gray-900 py-0.5 align-top">{siswa.ruang || "Ruang 1"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Tabel Jadwal Sesi & Tanggal Pelaksanaan (Rapi & Lengkap Per Sesi) */}
                <div className="border border-gray-300 rounded-lg overflow-hidden shadow-xs">
                  <div className="bg-gray-100 px-3 py-1 border-b border-gray-300 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                      Jadwal Pelaksanaan Ujian (Per Sesi)
                    </span>
                    <span className="text-[8.5px] font-bold text-gray-500 uppercase tracking-tight">
                      Waktu (WIB)
                    </span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-[9px] font-bold text-gray-500 uppercase border-b border-gray-200">
                        <th className="py-1 px-2.5 text-left w-14">Hari</th>
                        <th className="py-1 px-2 text-left">Hari, Tanggal</th>
                        <th className="py-1 px-2 text-center w-16">Sesi</th>
                        <th className="py-1 px-2.5 text-right w-28">Pukul / Jam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-[10px]">
                      {[
                        { no: 1, label: "Hari 1", tgl: tglHari1, sesi: siswa.sesiHari1 ?? siswa.sesi ?? 1 },
                        { no: 2, label: "Hari 2", tgl: tglHari2, sesi: siswa.sesiHari2 ?? siswa.sesi ?? 1 },
                        { no: 3, label: "Hari 3", tgl: tglHari3, sesi: siswa.sesiHari3 ?? siswa.sesi ?? 1 },
                        { no: 4, label: "Hari 4", tgl: tglHari4, sesi: siswa.sesiHari4 ?? siswa.sesi ?? 1 },
                      ].map((h) => (
                        <tr key={h.no} className="hover:bg-blue-50/20">
                          <td className="py-1 px-2.5 font-bold text-gray-600">{h.label}</td>
                          <td className="py-1 px-2 font-semibold text-gray-900">{h.tgl}</td>
                          <td className="py-1 px-2 text-center">
                            <span className="inline-block bg-blue-100 text-blue-900 font-extrabold px-2 py-0.5 rounded text-[9.5px]">
                              Sesi {h.sesi}
                            </span>
                          </td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-gray-800">
                            {getJamSesi(h.sesi)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 3. Akun Login Siswa (Highlight Kuning Jelas & Mudah Dibaca) */}
                <div className="bg-amber-50/70 border border-amber-300 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-900/80 uppercase tracking-wide">Username:</span>
                    <span className="bg-yellow-200 text-gray-900 font-mono font-black text-xs px-2.5 py-0.5 rounded border border-yellow-300 shadow-xs">
                      {siswa.email_username}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-900/80 uppercase tracking-wide">Password:</span>
                    <span className="bg-yellow-200 text-gray-900 font-mono font-black text-xs px-2.5 py-0.5 rounded border border-yellow-300 shadow-xs">
                      {siswa.password}
                    </span>
                  </div>
                </div>

                {/* 4. Footer Kartu Resmi */}
                <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between text-[8.5px] text-gray-500">
                  <span className="italic">* Kartu ini wajib dibawa saat pelaksanaan ujian.</span>
                  <span className="font-semibold text-gray-700">Ttd Pengawas: _________________</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
