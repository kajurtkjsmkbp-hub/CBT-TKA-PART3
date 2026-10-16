import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActiveTokenHero from "@/components/ActiveTokenHero";
import TokenCountdown from "@/components/TokenCountdown";

// Action untuk mengubah PIN Proktor
async function updatePinProktor(formData: FormData) {
  "use server";
  const newPin = formData.get("newPin") as string;
  if (!newPin || newPin.trim() === "") return;
  
  await prisma.pengaturan.upsert({
    where: { kunci: "PIN_PROKTOR" },
    update: { nilai: newPin.trim().toUpperCase() },
    create: { kunci: "PIN_PROKTOR", nilai: newPin.trim().toUpperCase() }
  });
  revalidatePath("/admin/status-tes");
  revalidatePath("/admin/monitoring");
}

async function generateToken(formData: FormData) {
  "use server";
  try {
    const ujianId = formData.get("ujianId") as string;
    const sesiStr = formData.get("sesi") as string;
    const ruangStr = formData.get("ruang") as string;
    const gelombangStr = formData.get("gelombang") as string;
    const hariKeStr = formData.get("hariKe") as string;
    if (!ujianId) return;

    const sesi = parseInt(sesiStr || "1");
    const ruang = ruangStr || "Ruang 1";
    const gelombang = parseInt(gelombangStr || "1");
    const hariKe = parseInt(hariKeStr || "1");

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const ujian = await prisma.ujian.findUnique({ where: { id: ujianId } });
    if (!ujian) return;

    const durasiMenit = ujian.durasiMenit || 90;
    const waktuMulaiBaru = new Date();
    const waktuSelesaiBaru = new Date(waktuMulaiBaru.getTime() + durasiMenit * 60000);

    await prisma.sesiUjian.updateMany({
      where: { ujianId, status: "AKTIF" },
      data: { status: "SELESAI", token: null }
    });

    await prisma.sesiUjian.upsert({
      where: { id: "sesi-aktif-" + ujianId },
      update: {
        status: "AKTIF",
        token,
        sesi,
        ruang,
        gelombang,
        hariKe,
        waktuMulai: waktuMulaiBaru,
        waktuSelesai: waktuSelesaiBaru
      },
      create: {
        id: "sesi-aktif-" + ujianId,
        ujianId,
        waktuMulai: waktuMulaiBaru,
        waktuSelesai: waktuSelesaiBaru,
        status: "AKTIF",
        token,
        sesi,
        ruang,
        gelombang,
        hariKe
      }
    });
  } catch (error) {
    console.error(error);
  }
  revalidatePath("/admin/status-tes");
  revalidatePath("/admin/monitoring");
  redirect("/admin/status-tes");
}

async function stopSesiUjian(formData: FormData) {
  "use server";
  try {
    const ujianId = formData.get("ujianId") as string;
    if (!ujianId) return;

    await prisma.sesiUjian.updateMany({
      where: { ujianId, status: "AKTIF" },
      data: { status: "SELESAI", token: null }
    });
  } catch (e) {}
  revalidatePath("/admin/status-tes");
  revalidatePath("/admin/monitoring");
  redirect("/admin/status-tes");
}

export const dynamic = "force-dynamic";

export default async function StatusTesPage() {
  const paketSoalList = await prisma.ujian.findMany({
    include: {
      mataPelajaran: true,
      sesiUjians: {
        where: { status: "AKTIF" }
      },
      _count: {
        select: { soals: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const pinSetting = await prisma.pengaturan.findUnique({
    where: { kunci: "PIN_PROKTOR" }
  });
  const currentPin = pinSetting?.nilai || "PROKTOR2026";

  const activeSessions = paketSoalList.flatMap((paket) => 
    paket.sesiUjians.map((sesi) => ({
      ...sesi,
      ujian: paket,
    }))
  );

  return (
    <div>
      <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Status Tes</h1>
          <p className="text-gray-500 mt-1 text-sm">Aktifkan ujian dan atur sesi serta ruang ujian.</p>
        </div>
        <form action={updatePinProktor} className="bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">PIN Buka Blokir Ujian</p>
          <div className="flex space-x-2">
            <input 
              type="text" 
              name="newPin" 
              defaultValue={currentPin} 
              className="w-32 bg-white border border-red-200 text-red-700 font-black font-mono tracking-widest px-2 py-1 rounded outline-none focus:border-red-500 text-sm uppercase text-center"
            />
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded transition">
              Simpan
            </button>
          </div>
        </form>
      </div>

      {/* SHOWCASE TOKEN AKTIF UTAMA JIKA ADA SESI BERLANGSUNG */}
      {activeSessions.map((sesi) => (
        <ActiveTokenHero
          key={sesi.id}
          ujianId={sesi.ujianId}
          judulUjian={sesi.ujian.judul}
          namaMapel={sesi.ujian.mataPelajaran.nama}
          gelombang={sesi.gelombang ?? 1}
          hariKe={sesi.hariKe ?? 1}
          sesi={sesi.sesi}
          ruang={sesi.ruang}
          token={sesi.token || "------"}
          waktuMulai={sesi.waktuMulai}
          onRefreshAction={generateToken}
          onStopAction={stopSesiUjian}
        />
      ))}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Daftar Tes yang Tersedia</h2>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Info Ujian</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status Tes</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Rilis Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paketSoalList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-gray-500">Belum ada paket ujian.</td>
                </tr>
              ) : (
                paketSoalList.map((paket) => {
                  const isActive = paket.sesiUjians.length > 0;
                  const activeSesi = isActive ? paket.sesiUjians[0] : null;

                  return (
                    <tr key={paket.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-6 py-5">
                        <p className="text-gray-900 font-bold text-sm">{paket.judul}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          Mapel: {paket.mataPelajaran.nama} • Durasi: {paket.durasiMenit} mnt • Soal: {paket._count.soals}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-center align-middle">
                        {isActive && activeSesi ? (
                          <div className="inline-flex flex-col items-center bg-white p-3 rounded-2xl border-2 border-emerald-200 shadow-sm min-w-[220px]">
                            <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1">
                              AKTIF (Gel. {activeSesi.gelombang ?? 1} • H-{activeSesi.hariKe ?? 1} • Sesi {activeSesi.sesi} - {activeSesi.ruang})
                            </span>
                            <span className="text-[#0b5c92] font-black font-mono tracking-widest text-2xl my-0.5">
                              {activeSesi.token}
                            </span>
                            <TokenCountdown waktuMulai={activeSesi.waktuMulai} />
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-slate-500 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            NONAKTIF
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right align-middle">
                        {!isActive ? (
                          <form action={generateToken} className="flex flex-col xl:flex-row items-end xl:items-center justify-end gap-2">
                            <input type="hidden" name="ujianId" value={paket.id} />
                            <div className="flex items-center gap-1.5">
                              <select name="gelombang" className="text-xs py-2 px-2.5 rounded-lg border border-gray-300 outline-none bg-white font-medium" defaultValue="1" title="Pilih Gelombang">
                                <option value="1">Gelombang 1</option>
                                <option value="2">Gelombang 2</option>
                              </select>
                              <select name="hariKe" className="text-xs py-2 px-2.5 rounded-lg border border-gray-300 outline-none bg-white font-medium" defaultValue="1" title="Pilih Hari Ke-">
                                <option value="1">Hari 1</option>
                                <option value="2">Hari 2</option>
                                <option value="3">Hari 3</option>
                                <option value="4">Hari 4</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <select name="sesi" className="text-xs py-2 px-2.5 rounded-lg border border-gray-300 outline-none w-24 bg-white font-medium" defaultValue="1" title="Pilih Sesi">
                                <option value="1">Sesi 1</option>
                                <option value="2">Sesi 2</option>
                                <option value="3">Sesi 3</option>
                              </select>
                              <input type="text" name="ruang" className="text-xs py-2 px-2.5 rounded-lg border border-gray-300 outline-none w-28 bg-white" defaultValue="Ruang 1" placeholder="Ruang" title="Ketik Ruang" />
                            </div>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-lg transition shadow-sm text-xs flex items-center gap-1">
                              <span>Rilis Token</span>
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            <form action={generateToken}>
                              <input type="hidden" name="ujianId" value={paket.id} />
                              <input type="hidden" name="gelombang" value={activeSesi?.gelombang ?? 1} />
                              <input type="hidden" name="hariKe" value={activeSesi?.hariKe ?? 1} />
                              <input type="hidden" name="sesi" value={activeSesi?.sesi ?? 1} />
                              <input type="hidden" name="ruang" value={activeSesi?.ruang ?? "Ruang 1"} />
                              <button type="submit" className="text-amber-800 bg-amber-100 hover:bg-amber-200 font-bold py-2 px-3 rounded-lg transition border border-amber-300 shadow-sm text-xs flex items-center gap-1.5" title="Rilis / Refresh Token Baru">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                <span>Rilis Token Baru</span>
                              </button>
                            </form>
                            <form action={stopSesiUjian}>
                              <input type="hidden" name="ujianId" value={paket.id} />
                              <button type="submit" className="text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold py-2 px-3 rounded-lg transition border border-rose-200 shadow-sm text-xs">
                                Tutup Sesi
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
