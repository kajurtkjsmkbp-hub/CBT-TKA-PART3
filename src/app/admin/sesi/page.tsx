import { prisma } from "@/lib/prisma";
import SesiMatrixTable, { SiswaSesiItem } from "@/components/SesiMatrixTable";
import JadwalUjianCard from "@/components/JadwalUjianCard";

function toRomawi(n: number): string {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 13: "XIII", 7: "VII", 8: "VIII", 9: "IX" };
  return map[n] || String(n);
}

function formatRombel(r: any): string {
  if (!r) return "-";
  return r.jurusan
    ? `${toRomawi(r.tingkatKelas?.level ?? 10)} ${r.jurusan.nama_jurusan} ${r.nomorKelas}`
    : `${r.tingkatKelas?.tipe ?? "Kelas"} ${toRomawi(r.tingkatKelas?.level ?? 10)} ${r.nomorKelas}`;
}

export const dynamic = "force-dynamic";

export default async function PengaturanSesiPage() {
  const [rawSiswa, rombels, listPengaturan] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SISWA" },
      include: {
        sekolah: true,
        rombel: {
          include: {
            tingkatKelas: true,
            jurusan: true,
          },
        },
      },
      orderBy: [{ rombelId: "asc" }, { nama: "asc" }],
    }),
    prisma.rombel.findMany({
      include: { tingkatKelas: true, jurusan: true },
      orderBy: [{ tingkatKelas: { level: "asc" } }, { nomorKelas: "asc" }],
    }),
    prisma.pengaturan.findMany(),
  ]);

  const getSetting = (k: string, def: string = "") =>
    listPengaturan.find((p) => p.kunci === k)?.nilai || def;

  const initialJadwal = {
    jamSesi1: getSetting("JAM_SESI_1", "07.30 - 09.30"),
    jamSesi2: getSetting("JAM_SESI_2", "10.30 - 12.30"),
    jamSesi3: getSetting("JAM_SESI_3", "13.30 - 15.30"),
    tglHari1: getSetting("TGL_HARI_1", "Senin, 19 Okt 2026"),
    tglHari2: getSetting("TGL_HARI_2", "Selasa, 20 Okt 2026"),
    tglHari3: getSetting("TGL_HARI_3", "Rabu, 21 Okt 2026"),
    tglHari4: getSetting("TGL_HARI_4", "Kamis, 22 Okt 2026"),
  };

  const pengaturanInfo = {
    ...initialJadwal,
    namaSekolah: getSetting("NAMA_SEKOLAH", "SMK Negeri 1 Adiwerna"),
    logoSekolah: getSetting("LOGO_PATH", ""),
  };

  const siswaList: SiswaSesiItem[] = rawSiswa.map((s) => ({
    id: s.id,
    nama: s.nama,
    email_username: s.email_username,
    password: s.password,
    foto: s.foto || null,
    sekolahNama: s.sekolah?.nama || null,
    rombelLabel: formatRombel(s.rombel),
    rombelId: s.rombelId,
    gelombang: s.gelombang ?? 1,
    sesiHari1: s.sesiHari1 ?? s.sesi ?? 1,
    sesiHari2: s.sesiHari2 ?? s.sesi ?? 1,
    sesiHari3: s.sesiHari3 ?? s.sesi ?? 1,
    sesiHari4: s.sesiHari4 ?? s.sesi ?? 1,
    ruang: s.ruang || "Ruang 1",
  }));

  const rombelOptions = rombels.map((r) => ({
    id: r.id,
    label: formatRombel(r),
  }));

  const totalSiswa = siswaList.length;
  const countGel1 = siswaList.filter((s) => s.gelombang === 1).length;
  const countGel2 = siswaList.filter((s) => s.gelombang === 2).length;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
              Standar ANBK / TKA Nasional
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1">
            Pengaturan Sesi & Gelombang Siswa
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Atur pembagian gelombang dan jadwal rotasi sesi harian (Hari 1 s.d. 4) per siswa untuk simulasi & ujian resmi.
          </p>
        </div>

        {/* STATS BADGES */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Peserta</div>
            <div className="text-lg font-black text-slate-800">{totalSiswa}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-2xl shadow-sm text-center">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Gelombang 1</div>
            <div className="text-lg font-black text-blue-800">{countGel1}</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-2xl shadow-sm text-center">
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Gelombang 2</div>
            <div className="text-lg font-black text-indigo-800">{countGel2}</div>
          </div>
        </div>
      </div>

      {/* JADWAL UJIAN HARI, TANGGAL & JAM SESI */}
      <JadwalUjianCard initialValues={initialJadwal} />

      {/* MATRIX TABLE CLIENT COMPONENT */}
      <SesiMatrixTable initialSiswa={siswaList} rombelList={rombelOptions} pengaturanInfo={pengaturanInfo} />
    </div>
  );
}
