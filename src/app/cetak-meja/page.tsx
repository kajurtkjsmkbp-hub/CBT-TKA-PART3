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
    ruang?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CetakMejaPage(props: PageProps) {
  const userRole = (await cookies()).get("cbt_session")?.value;
  if (userRole !== "ADMIN" && userRole !== "GURU") {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const filterRombelId = searchParams?.rombelId || "";
  const filterGelombang = searchParams?.gelombang ? parseInt(searchParams.gelombang) : undefined;
  const filterRuang = searchParams?.ruang || "";

  const whereClause: any = { role: "SISWA" };
  if (filterRombelId) whereClause.rombelId = filterRombelId;
  if (filterGelombang) whereClause.gelombang = filterGelombang;
  if (filterRuang) whereClause.ruang = filterRuang;

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
  const logoSekolah = getSetting("LOGO_PATH", "");

  const ruangOptions = Array.from(
    new Set(distinctRuang.map((r) => r.ruang).filter(Boolean))
  ) as string[];

  return (
    <div className="bg-slate-100 min-h-screen text-black font-sans print:bg-white print:p-0">
      {/* TOP BAR FILTER */}
      <div className="print:hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin/sesi" className="text-blue-200 hover:text-white text-xs font-bold transition flex items-center gap-1">
                ← Kembali ke Pengaturan Sesi
              </Link>
            </div>
            <h1 className="font-black text-xl tracking-tight mt-0.5">
              Cetak Nomor & Label Meja Peserta Ujian (Tent Card)
            </h1>
            <p className="text-xs text-blue-200 mt-0.5">
              Label stiker/kartu nomor meja komputer laboratorium (4 kartu per lembar A4).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex flex-wrap items-center gap-2 text-xs">
              <select
                name="gelombang"
                defaultValue={searchParams?.gelombang || ""}
                className="bg-white/15 text-white font-semibold px-2.5 py-1.5 rounded-lg border border-white/30 outline-none cursor-pointer"
              >
                <option value="" className="text-slate-800">Semua Gelombang</option>
                <option value="1" className="text-slate-800">Gelombang 1</option>
                <option value="2" className="text-slate-800">Gelombang 2</option>
              </select>

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

      {/* GRID KARTU MEJA (2 KOLOM x N BARIS - 4 KARTU PER LEMBAR A4) */}
      <div
        className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:p-0 print:gap-4 print:m-0"
        style={{ maxWidth: "210mm", margin: "0 auto" }}
      >
        {siswaList.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-2xl border border-slate-300 text-center text-slate-500 font-medium">
            Tidak ada siswa yang sesuai dengan filter yang dipilih.
          </div>
        ) : (
          siswaList.map((siswa, idx) => {
            const noMeja = (idx + 1).toString().padStart(2, "0");

            return (
              <div
                key={siswa.id}
                className="border-2 border-dashed border-gray-800 rounded-xl overflow-hidden bg-white shadow-sm break-inside-avoid print:shadow-none print:border-gray-900 flex flex-col justify-between"
              >
                {/* HEADER KARTU MEJA */}
                <div className="bg-gray-100 border-b-2 border-gray-800 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {logoSekolah ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoSekolah} alt="Logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="w-7 h-7 bg-blue-900/10 rounded flex items-center justify-center text-xs">🏛️</div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-gray-900 tracking-wider leading-none">
                        KARTU MEJA PESERTA (CBT)
                      </h4>
                      <p className="text-[9px] font-bold text-blue-900 uppercase leading-tight mt-0.5">
                        {namaSekolah}
                      </p>
                    </div>
                  </div>

                  {/* BADGE BESAR NOMOR MEJA */}
                  <div className="bg-blue-900 text-white font-black text-sm px-2.5 py-1 rounded-md border border-blue-950 shadow-xs flex items-center gap-1">
                    <span className="text-[9px] font-semibold text-blue-200">MEJA</span>
                    <span>{noMeja}</span>
                  </div>
                </div>

                {/* BODY KARTU MEJA */}
                <div className="p-3 bg-white space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                  {/* IDENTITAS PESERTA */}
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-20 border-2 border-gray-300 border-dashed rounded flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                      {siswa.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-[9px] text-center font-medium leading-tight">
                          Foto<br />3x4
                        </span>
                      )}
                    </div>

                    <table className="flex-1 text-[11px] border-collapse leading-tight my-auto">
                      <tbody>
                        <tr>
                          <td className="font-semibold text-gray-600 py-0.5 w-20 align-top">Nama</td>
                          <td className="w-2 font-bold text-gray-600 py-0.5 align-top">:</td>
                          <td className="font-bold text-gray-900 py-0.5 align-top">{siswa.nama}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-gray-600 py-0.5 align-top">NIS / No</td>
                          <td className="font-bold text-gray-600 py-0.5 align-top">:</td>
                          <td className="font-mono font-medium text-gray-800 py-0.5 align-top">{siswa.email_username}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-gray-600 py-0.5 align-top">Kelas</td>
                          <td className="font-bold text-gray-600 py-0.5 align-top">:</td>
                          <td className="font-medium text-gray-800 py-0.5 align-top">{formatRombel(siswa)}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-gray-600 py-0.5 align-top">Ruang</td>
                          <td className="font-bold text-gray-600 py-0.5 align-top">:</td>
                          <td className="font-bold text-gray-900 py-0.5 align-top">{siswa.ruang || "Ruang 1"}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold text-gray-600 py-0.5 align-top">Gelombang</td>
                          <td className="font-bold text-gray-600 py-0.5 align-top">:</td>
                          <td className="font-bold text-blue-900 py-0.5 align-top">Gelombang {siswa.gelombang ?? 1}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* JADWAL SESI H1 - H4 */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-1.5 grid grid-cols-4 gap-1 text-center text-[9px]">
                    <div className="bg-white border border-gray-200 rounded py-0.5">
                      <div className="text-[7.5px] font-bold text-gray-400 uppercase">H1</div>
                      <div className="font-black text-blue-900">Sesi {siswa.sesiHari1 ?? 1}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded py-0.5">
                      <div className="text-[7.5px] font-bold text-gray-400 uppercase">H2</div>
                      <div className="font-black text-blue-900">Sesi {siswa.sesiHari2 ?? 1}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded py-0.5">
                      <div className="text-[7.5px] font-bold text-gray-400 uppercase">H3</div>
                      <div className="font-black text-blue-900">Sesi {siswa.sesiHari3 ?? 1}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded py-0.5">
                      <div className="text-[7.5px] font-bold text-gray-400 uppercase">H4</div>
                      <div className="font-black text-blue-900">Sesi {siswa.sesiHari4 ?? 1}</div>
                    </div>
                  </div>

                  {/* AKUN LOGIN SISWA */}
                  <div className="bg-amber-50 border border-amber-300 rounded px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">User:</span>
                      <span className="bg-yellow-200 font-mono font-black text-xs px-2 py-0.5 rounded border border-yellow-300">
                        {siswa.email_username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">Pass:</span>
                      <span className="bg-yellow-200 font-mono font-black text-xs px-2 py-0.5 rounded border border-yellow-300">
                        {siswa.password}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
