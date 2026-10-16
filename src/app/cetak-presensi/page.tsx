import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PrintButton from "@/app/cetak-kartu/PrintButton";
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
  searchParams: Promise<{
    rombelId?: string;
    gelombang?: string;
    hariKe?: string;
    sesi?: string;
    ruang?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CetakPresensiPage(props: PageProps) {
  const userRole = (await cookies()).get("cbt_session")?.value;
  if (userRole !== "ADMIN" && userRole !== "GURU") {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const filterRombelId = searchParams?.rombelId || "";
  const filterGelombang = searchParams?.gelombang ? parseInt(searchParams.gelombang) : undefined;
  const filterHariKe = searchParams?.hariKe ? parseInt(searchParams.hariKe) : 1;
  const filterSesi = searchParams?.sesi ? parseInt(searchParams.sesi) : undefined;
  const filterRuang = searchParams?.ruang || "";

  const whereClause: any = { role: "SISWA" };
  if (filterRombelId) whereClause.rombelId = filterRombelId;
  if (filterGelombang) whereClause.gelombang = filterGelombang;
  if (filterRuang) whereClause.ruang = filterRuang;

  if (filterSesi) {
    if (filterHariKe === 1) whereClause.sesiHari1 = filterSesi;
    else if (filterHariKe === 2) whereClause.sesiHari2 = filterSesi;
    else if (filterHariKe === 3) whereClause.sesiHari3 = filterSesi;
    else if (filterHariKe === 4) whereClause.sesiHari4 = filterSesi;
  }

  const [siswaList, rombelList, listPengaturan, distinctRuang] = await Promise.all([
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
    prisma.user.findMany({
      where: { role: "SISWA" },
      select: { ruang: true },
      distinct: ["ruang"],
    }),
  ]);

  const getSetting = (k: string, def: string = "") =>
    listPengaturan.find((p) => p.kunci === k)?.nilai || def;

  const namaSekolah = getSetting("NAMA_SEKOLAH") || siswaList[0]?.sekolah?.nama || "SMK Negeri 1 Adiwerna";
  const alamatSekolah = getSetting("ALAMAT_SEKOLAH", "Jl. Raya Pesarean");
  const logoSekolah = getSetting("LOGO_PATH", "");
  const npsn = getSetting("NPSN", "2060545");

  const tglMap: Record<number, string> = {
    1: getSetting("TGL_HARI_1", "Senin, 19 Okt 2026"),
    2: getSetting("TGL_HARI_2", "Selasa, 20 Okt 2026"),
    3: getSetting("TGL_HARI_3", "Rabu, 21 Okt 2026"),
    4: getSetting("TGL_HARI_4", "Kamis, 22 Okt 2026"),
  };

  const jamMap: Record<number, string> = {
    1: getSetting("JAM_SESI_1", "07.30 - 09.30"),
    2: getSetting("JAM_SESI_2", "10.30 - 12.30"),
    3: getSetting("JAM_SESI_3", "13.30 - 15.30"),
  };

  const ruangOptions = Array.from(
    new Set(distinctRuang.map((r) => r.ruang).filter(Boolean))
  ) as string[];

  const activeTgl = tglMap[filterHariKe] || "Senin, 19 Okt 2026";
  const activeJam = filterSesi ? jamMap[filterSesi] || "07.30 - 09.30" : "Semua Sesi";

  return (
    <div className="bg-slate-100 min-h-screen text-black font-sans print:bg-white print:p-0">
      {/* TOP BAR FILTER (DISEMBUNYIKAN SAAT CETAK) */}
      <div className="print:hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin/sesi" className="text-blue-200 hover:text-white text-xs font-bold transition flex items-center gap-1">
                ← Kembali ke Pengaturan Sesi
              </Link>
            </div>
            <h1 className="font-black text-xl tracking-tight mt-0.5">
              Cetak Daftar Hadir Peserta Ujian (Presensi Resmi)
            </h1>
            <p className="text-xs text-blue-200 mt-0.5">
              Filter data presensi per Gelombang, Hari ke-X, Sesi, dan Ruang Laboratorium.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex flex-wrap items-center gap-2 text-xs">
              {/* Filter Gelombang */}
              <select
                name="gelombang"
                defaultValue={searchParams?.gelombang || ""}
                className="bg-white/15 text-white font-semibold px-2.5 py-1.5 rounded-lg border border-white/30 outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800">Semua Gelombang</option>
                <option value="1" className="text-slate-800">Gelombang 1</option>
                <option value="2" className="text-slate-800">Gelombang 2</option>
              </select>

              {/* Filter Hari Ke */}
              <select
                name="hariKe"
                defaultValue={filterHariKe.toString()}
                className="bg-white/15 text-white font-semibold px-2.5 py-1.5 rounded-lg border border-white/30 outline-none cursor-pointer"
              >
                <option value="1" className="text-slate-800">Hari 1</option>
                <option value="2" className="text-slate-800">Hari 2</option>
                <option value="3" className="text-slate-800">Hari 3</option>
                <option value="4" className="text-slate-800">Hari 4</option>
              </select>

              {/* Filter Sesi */}
              <select
                name="sesi"
                defaultValue={searchParams?.sesi || ""}
                className="bg-white/15 text-white font-semibold px-2.5 py-1.5 rounded-lg border border-white/30 outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800">Semua Sesi</option>
                <option value="1" className="text-slate-800">Sesi 1</option>
                <option value="2" className="text-slate-800">Sesi 2</option>
                <option value="3" className="text-slate-800">Sesi 3</option>
              </select>

              {/* Filter Ruang */}
              <select
                name="ruang"
                defaultValue={filterRuang}
                className="bg-white/15 text-white font-semibold px-2.5 py-1.5 rounded-lg border border-white/30 outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800">Semua Ruang</option>
                {ruangOptions.map((r) => (
                  <option key={r} value={r} className="text-slate-800">
                    {r}
                  </option>
                ))}
              </select>

              {/* Filter Rombel */}
              <select
                name="rombelId"
                defaultValue={filterRombelId}
                className="bg-white/15 text-white font-semibold px-2.5 py-1.5 rounded-lg border border-white/30 outline-none cursor-pointer"
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

              <button
                type="submit"
                className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-lg transition border border-white/30"
              >
                Terapkan
              </button>
            </form>

            <PrintButton />
          </div>
        </div>
      </div>

      {/* DOKUMEN CETAK A4 PRESENSI */}
      <div className="max-w-[210mm] mx-auto p-6 md:p-10 print:p-0 print:m-0">
        <div className="bg-white p-8 md:p-10 shadow-sm border border-slate-300 rounded-xl print:shadow-none print:border-none print:p-0 print:m-0">
          {/* KOP SURAT RESMI */}
          <div className="border-b-4 border-double border-gray-900 pb-3 mb-4 flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              {logoSekolah ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSekolah} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-14 h-14 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xl">🏛️</div>
              )}
            </div>
            <div className="flex-1 text-center pr-10">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-800 leading-tight">
                PANITIA PELAKSANAAN UJIAN BERBASIS KOMPUTER (CBT)
              </h2>
              <h1 className="text-lg font-black uppercase text-blue-900 tracking-tight leading-tight mt-0.5">
                {namaSekolah}
              </h1>
              <p className="text-xs text-gray-600 mt-0.5 leading-tight">
                {alamatSekolah} • NPSN: {npsn}
              </p>
            </div>
          </div>

          {/* JUDUL DOKUMEN */}
          <div className="text-center my-4">
            <h3 className="text-sm font-black uppercase tracking-wider underline text-gray-900">
              DAFTAR HADIR PESERTA UJIAN (CBT)
            </h3>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mt-0.5">
              STANDAR TES KEMAMPUAN AKADEMIK (TKA) / ANBK
            </p>
          </div>

          {/* METADATA PELAKSANAAN (2-KOLOM BERSIH) */}
          <div className="border border-gray-400 rounded-lg p-3 bg-gray-50/70 mb-4 text-xs grid grid-cols-2 gap-4">
            <table className="border-collapse">
              <tbody>
                <tr>
                  <td className="w-28 font-semibold text-gray-600 py-0.5">Hari / Tanggal</td>
                  <td className="w-2 font-bold text-gray-700 py-0.5">:</td>
                  <td className="font-bold text-gray-900 py-0.5">Hari {filterHariKe} ({activeTgl})</td>
                </tr>
                <tr>
                  <td className="font-semibold text-gray-600 py-0.5">Sesi Ujian</td>
                  <td className="font-bold text-gray-700 py-0.5">:</td>
                  <td className="font-bold text-blue-900 py-0.5">
                    {filterSesi ? `Sesi ${filterSesi} (${activeJam} WIB)` : "Semua Sesi"}
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-gray-600 py-0.5">Gelombang</td>
                  <td className="font-bold text-gray-700 py-0.5">:</td>
                  <td className="font-semibold text-gray-900 py-0.5">
                    {filterGelombang ? `Gelombang ${filterGelombang}` : "Semua Gelombang"}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="border-collapse">
              <tbody>
                <tr>
                  <td className="w-28 font-semibold text-gray-600 py-0.5">Ruang Laboratorium</td>
                  <td className="w-2 font-bold text-gray-700 py-0.5">:</td>
                  <td className="font-bold text-gray-900 py-0.5">{filterRuang || "Semua Ruang"}</td>
                </tr>
                <tr>
                  <td className="font-semibold text-gray-600 py-0.5">Jumlah Peserta</td>
                  <td className="font-bold text-gray-700 py-0.5">:</td>
                  <td className="font-bold text-gray-900 py-0.5">{siswaList.length} Orang</td>
                </tr>
                <tr>
                  <td className="font-semibold text-gray-600 py-0.5">Waktu Pelaksanaan</td>
                  <td className="font-bold text-gray-700 py-0.5">:</td>
                  <td className="font-mono text-gray-800 py-0.5">{activeJam} WIB</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL PRESENSI SISWA DENGAN TANDA TANGAN ZIG-ZAG */}
          <table className="w-full border-collapse border border-gray-900 text-xs mb-6">
            <thead>
              <tr className="bg-gray-200 text-gray-900 font-bold uppercase text-[10px] text-center border-b border-gray-900">
                <th className="border border-gray-900 p-1.5 w-10">No</th>
                <th className="border border-gray-900 p-1.5 w-24">NIS / No. Peserta</th>
                <th className="border border-gray-900 p-1.5 text-left pl-3">Nama Lengkap Peserta</th>
                <th className="border border-gray-900 p-1.5 w-32">Kelas / Rombel</th>
                <th className="border border-gray-900 p-1.5 w-16">Sesi</th>
                <th className="border border-gray-900 p-1.5 w-44" colSpan={2}>
                  Tanda Tangan Peserta
                </th>
                <th className="border border-gray-900 p-1.5 w-20">Ket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {siswaList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-gray-900 p-6 text-center text-gray-500 font-semibold italic">
                    Tidak ada siswa yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                siswaList.map((siswa, idx) => {
                  const no = idx + 1;
                  const isGanjil = no % 2 !== 0;
                  const sesiHariIni =
                    filterHariKe === 1
                      ? siswa.sesiHari1
                      : filterHariKe === 2
                      ? siswa.sesiHari2
                      : filterHariKe === 3
                      ? siswa.sesiHari3
                      : siswa.sesiHari4;

                  return (
                    <tr key={siswa.id} className="text-gray-900">
                      <td className="border border-gray-900 p-1.5 text-center font-bold">{no}</td>
                      <td className="border border-gray-900 p-1.5 text-center font-mono">{siswa.email_username}</td>
                      <td className="border border-gray-900 p-1.5 font-bold pl-3">{siswa.nama}</td>
                      <td className="border border-gray-900 p-1.5 text-center">{formatRombel(siswa)}</td>
                      <td className="border border-gray-900 p-1.5 text-center font-black text-blue-900">
                        Sesi {sesiHariIni ?? 1}
                      </td>
                      {/* Tanda Tangan Zig-zag */}
                      <td className="border border-gray-900 p-1.5 w-22 h-8 align-top text-[10px] text-gray-400">
                        {isGanjil ? <span className="font-bold text-gray-500">{no}. ..........</span> : ""}
                      </td>
                      <td className="border border-gray-900 p-1.5 w-22 h-8 align-top text-[10px] text-gray-400">
                        {!isGanjil ? <span className="font-bold text-gray-500">{no}. ..........</span> : ""}
                      </td>
                      <td className="border border-gray-900 p-1.5 text-center text-[10px] font-semibold text-gray-500">
                        [ &nbsp; &nbsp; ]
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* REKAPITULASI & TANDA TANGAN PENGAWAS */}
          <div className="border border-gray-400 rounded-lg p-4 bg-gray-50/60 mb-6 text-xs flex flex-col sm:flex-row justify-between items-start gap-4 break-inside-avoid">
            <div>
              <span className="font-bold text-gray-800 uppercase tracking-wide block mb-1">
                Catatan Rekapitulasi Presensi:
              </span>
              <ul className="text-gray-700 space-y-0.5 text-xs">
                <li>• Jumlah Peserta Seharusnya : <strong>{siswaList.length}</strong> orang</li>
                <li>• Jumlah Peserta Hadir : <strong>______</strong> orang</li>
                <li>• Jumlah Peserta Tidak Hadir : <strong>______</strong> orang</li>
              </ul>
            </div>
            <div className="text-gray-500 text-[11px] italic self-end">
              * Beri tanda centang [ ✓ ] pada kolom Ket untuk siswa yang hadir.
            </div>
          </div>

          <div className="flex justify-between items-start text-xs pt-4 break-inside-avoid">
            <div className="text-center w-56">
              <p className="font-semibold text-gray-700">Proktor Ruang,</p>
              <div className="h-16"></div>
              <p className="font-bold text-gray-900 underline">( ______________________ )</p>
              <p className="text-gray-500 text-[11px] mt-0.5">NIP. ___________________</p>
            </div>

            <div className="text-center w-56">
              <p className="font-semibold text-gray-700">Pengawas Ruang Ujian,</p>
              <div className="h-16"></div>
              <p className="font-bold text-gray-900 underline">( ______________________ )</p>
              <p className="text-gray-500 text-[11px] mt-0.5">NIP. ___________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
