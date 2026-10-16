import { prisma } from "@/lib/prisma";
import Link from "next/link";
import TokenCountdown from "@/components/TokenCountdown";
import StudentCountdownTimer from "./StudentCountdownTimer";
import { 
  forceSubmitAction, 
  updatePinProktor, 
  resetLogin, 
  refreshTokenAction,
  addExtraTimeAction
} from "./actions";

// Server component untuk Live Monitoring Ujian Siswa
export default async function LiveMonitoringPage() {
  const now = new Date();
  
  // Auto-submit untuk siswa yang sudah melewati batas waktu (waktuSelesai + kompensasi tambahan waktu proktor)
  const runningHasil = await prisma.hasilUjian.findMany({
    where: {
      status: "MENGERJAKAN",
    },
    include: { sesiUjian: { include: { ujian: { include: { soals: true } } } } } 
  });

  for (const hasil of runningHasil) {
     const extraMillis = (hasil.tambahanMenit || 0) * 60000;
     const effectiveDeadline = new Date(hasil.sesiUjian.waktuSelesai.getTime() + extraMillis);
     if (effectiveDeadline < now) {
     const answers = JSON.parse(hasil.detailJawaban || "{}");
     let benar = 0;
     hasil.sesiUjian.ujian.soals.forEach((soal, idx) => {
        const ans = answers[idx];
        if (ans !== undefined && ans !== null && ans !== "") {
           if (soal.tipeSoal === "PG" && ans.toString() === soal.kunciJawaban) benar++;
           else if (soal.tipeSoal === "PGK" && Array.isArray(ans) && ans.sort().join(",") === soal.kunciJawaban) benar++;
           else if (soal.tipeSoal === "ISIAN" && ans.toString().toLowerCase().trim() === (soal.kunciJawaban || "").toLowerCase().trim()) benar++;
        }
     });
     const nilaiAkhir = hasil.sesiUjian.ujian.soals.length > 0 ? (benar / hasil.sesiUjian.ujian.soals.length) * 100 : 0;
     
     await prisma.hasilUjian.update({
        where: { id: hasil.id },
        data: { 
          status: "SELESAI", 
          nilaiAkhir,
          waktuKumpul: new Date()
        }
     });
    }
  }

  // Ambil siswa yang berstatus isLogin = true
  const activeStudents = await prisma.user.findMany({
    where: { role: "SISWA", isLogin: true },
    include: { tingkatKelas: true, jurusan: true }
  });

  // Ambil sesi ujian yang sedang aktif
  const aktifSesi = await prisma.sesiUjian.findMany({
    where: { status: "AKTIF" },
    include: {
      ujian: { include: { mataPelajaran: true } },
      hasilUjian: {
        include: {
          siswa: { include: { tingkatKelas: true, jurusan: true } }
        },
        orderBy: { waktuKumpul: "desc" }
      }
    }
  });

  const pinSetting = await prisma.pengaturan.findUnique({
    where: { kunci: "PIN_PROKTOR" }
  });
  const currentPin = pinSetting?.nilai || "PROKTOR2026";

  return (
    <div>
      {/* Header Live Monitoring */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Live Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">Sisa waktu ujian siswa berjalan mundur secara real-time dan ujian akan selesai otomatis ketika waktu mencapai 00:00:00.</p>
        </div>
        <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200 h-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-700 font-bold text-sm">Status: LIVE</span>
          </div>
        </div>
      </div>

      {/* PANEL RESET LOGIN */}
      {activeStudents.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg"><span className="text-xl">⚠️</span></div>
            <div>
              <h2 className="text-lg font-bold text-yellow-900">Status Peserta Login Portal</h2>
              <p className="text-xs text-yellow-700">Gunakan tombol "Reset Login" jika siswa tidak bisa masuk di komputer baru karena statusnya masih nyangkut.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStudents.map(siswa => (
              <div key={siswa.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{siswa.nama}</p>
                  <p className="text-xs text-gray-500 font-mono">{siswa.email_username}</p>
                </div>
                <form action={resetLogin}>
                  <input type="hidden" name="userId" value={siswa.id} />
                  <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold px-3 py-1.5 rounded transition">
                    Reset Login
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {aktifSesi.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100">
          <div className="text-4xl mb-4">📴</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Tidak ada Ujian Aktif</h2>
          <p className="text-gray-500">Silakan buka Bank Soal dan "Generate Token" untuk memulai ujian.</p>
        </div>
      ) : (
        aktifSesi.map((sesi) => (
          <div key={sesi.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{sesi.ujian.judul}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded border border-indigo-200">Sesi {sesi.sesi}</span>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded border border-indigo-200">{sesi.ruang}</span>
                  <span className="text-xs text-slate-500 font-bold ml-1">Mapel: {sesi.ujian.mataPelajaran.nama}</span>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-amber-300 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-amber-700">TOKEN:</span>
                    <span className="font-mono font-black tracking-widest text-2xl text-[#0b5c92]">
                      {sesi.token}
                    </span>
                    <TokenCountdown waktuMulai={sesi.waktuMulai} />
                    <form action={refreshTokenAction} className="ml-1">
                      <input type="hidden" name="sesiId" value={sesi.id} />
                      <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg shadow-sm transition text-xs flex items-center gap-1 border border-amber-400" title="Refresh / Rilis Token Baru">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                        <span>Rilis Baru</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right text-sm">
                  <span className="block font-bold text-gray-700">Total Akses: {sesi.hasilUjian.length} Peserta</span>
                  <span className="block text-green-600 font-semibold">{sesi.hasilUjian.filter(h => h.status === 'SELESAI').length} Selesai</span>
                  <span className="block text-blue-600 font-semibold">{sesi.hasilUjian.filter(h => h.status === 'MENGERJAKAN').length} Mengerjakan</span>
                </div>
                <Link 
                  href={`/cetak-bap/${sesi.id}`}
                  target="_blank"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition flex items-center h-fit"
                >
                  <span className="mr-2">📄</span> Cetak BAP & Daftar Hadir
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-700">Nama Siswa</th>
                    <th className="p-4 text-sm font-semibold text-gray-700">Kelas</th>
                    <th className="p-4 text-sm font-semibold text-gray-700 text-center">Status</th>
                    <th className="p-4 text-sm font-semibold text-gray-700 text-center">Waktu Submit / Sisa Waktu</th>
                    <th className="p-4 text-sm font-semibold text-gray-700 text-right">Aksi Proktor</th>
                  </tr>
                </thead>
                <tbody>
                  {sesi.hasilUjian.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Belum ada siswa yang login ke sesi ini.</td></tr>
                  ) : (
                    sesi.hasilUjian.map((hasil) => {
                      const isSelesai = hasil.status === "SELESAI";
                      return (
                        <tr key={hasil.id} className={`border-b border-gray-50 transition ${isSelesai ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5">
                              <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                {isSelesai && <span className="text-green-600">✅</span>}
                                <span>{hasil.siswa.nama}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-500 font-mono">NIS: {hasil.siswa.email_username}</span>
                                {(hasil.tambahanMenit || 0) > 0 && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                    ⏱️ +{hasil.tambahanMenit} mnt
                                  </span>
                                )}
                                {!isSelesai && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <StudentCountdownTimer
                                      waktuSelesai={new Date(sesi.waktuSelesai.getTime() + (hasil.tambahanMenit || 0) * 60000).toISOString()}
                                      hasilId={hasil.id}
                                      siswaNama={hasil.siswa.nama}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700">{hasil.siswa.tingkatKelas ? `${hasil.siswa.tingkatKelas.tipe} ${hasil.siswa.tingkatKelas.level}` : "-"}</p>
                          </td>
                          <td className="p-4 text-center">
                            {isSelesai ? (
                              <span className="bg-green-500 text-white shadow-sm px-3 py-1 rounded-full text-xs font-bold border border-green-600 flex items-center justify-center w-fit mx-auto">
                                <span className="mr-1">✔️</span> TELAH SELESAI
                              </span>
                            ) : (
                              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 animate-pulse flex items-center justify-center w-fit mx-auto">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-ping"></span> MENGERJAKAN
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center text-sm font-semibold text-gray-600">
                            {isSelesai && hasil.waktuKumpul ? (
                              <span className="text-green-700 bg-white px-2.5 py-1 rounded-lg shadow-xs border border-green-200 font-mono text-xs inline-block">
                                Selesai: {new Date(hasil.waktuKumpul).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            ) : !isSelesai ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <StudentCountdownTimer
                                  waktuSelesai={new Date(sesi.waktuSelesai.getTime() + (hasil.tambahanMenit || 0) * 60000).toISOString()}
                                  hasilId={hasil.id}
                                  siswaNama={hasil.siswa.nama}
                                />
                                <span className="text-[10px] text-slate-400">Auto submit saat 00:00</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-1.5">
                               {!isSelesai && (
                                 <form action={addExtraTimeAction} className="inline-flex">
                                   <input type="hidden" name="hasilId" value={hasil.id} />
                                   <input type="hidden" name="minutes" value="10" />
                                   <button
                                     type="submit"
                                     className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1.5 rounded transition shadow-xs flex items-center gap-1 cursor-pointer"
                                     title="Beri tambahan waktu kompensasi +10 menit"
                                   >
                                     <span>⏱️</span> +10 mnt
                                   </button>
                                 </form>
                               )}
                               <form action={forceSubmitAction} className="inline-flex">
                                 <input type="hidden" name="hasilId" value={hasil.id} />
                                 <button 
                                   type="submit"
                                   disabled={isSelesai}
                                   className="text-xs bg-red-500 hover:bg-red-600 text-white font-bold px-2.5 py-1.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                                   title="Tutup paksa ujian siswa ini"
                                 >
                                   Paksa Selesai
                                 </button>
                               </form>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
