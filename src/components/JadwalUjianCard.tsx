"use client";

import { useState, useTransition } from "react";
import { saveJadwalUjianPengaturan } from "@/app/admin/sesi/actions";
import Link from "next/link";

interface JadwalUjianCardProps {
  initialValues: {
    jamSesi1: string;
    jamSesi2: string;
    jamSesi3: string;
    tglHari1: string;
    tglHari2: string;
    tglHari3: string;
    tglHari4: string;
  };
}

export default function JadwalUjianCard({ initialValues }: JadwalUjianCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [jamSesi1, setJamSesi1] = useState(initialValues.jamSesi1 || "07.30 - 09.30");
  const [jamSesi2, setJamSesi2] = useState(initialValues.jamSesi2 || "10.30 - 12.30");
  const [jamSesi3, setJamSesi3] = useState(initialValues.jamSesi3 || "13.30 - 15.30");
  const [tglHari1, setTglHari1] = useState(initialValues.tglHari1 || "Senin, 19 Okt 2026");
  const [tglHari2, setTglHari2] = useState(initialValues.tglHari2 || "Selasa, 20 Okt 2026");
  const [tglHari3, setTglHari3] = useState(initialValues.tglHari3 || "Rabu, 21 Okt 2026");
  const [tglHari4, setTglHari4] = useState(initialValues.tglHari4 || "Kamis, 22 Okt 2026");

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveJadwalUjianPengaturan({
        jamSesi1,
        jamSesi2,
        jamSesi3,
        tglHari1,
        tglHari2,
        tglHari3,
        tglHari4,
      });

      if (res.success) {
        setToast({ message: "Jadwal hari, tanggal & jam sesi berhasil disimpan!", type: "success" });
        setTimeout(() => setToast(null), 3500);
      } else {
        setToast({ message: res.message || "Gagal menyimpan jadwal ujian.", type: "error" });
        setTimeout(() => setToast(null), 4000);
      }
    });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* HEADER CARD */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-500/20">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-800 text-base sm:text-lg tracking-tight">
                Input Hari, Tanggal & Jam Pelaksanaan Sesi Ujian
              </h2>
              <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                Standar TKA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Data tanggal dan jam ini akan dicetak otomatis pada Kartu Peserta Ujian siswa sesuai sesi masing-masing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href="/cetak-kartu"
            target="_blank"
            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <span>🖨️</span> Lihat Kartu Peserta
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl transition shadow-2xs"
          >
            {isOpen ? "Tutup Form ▲" : "Buka Form ▼"}
          </button>
        </div>
      </div>

      {/* FORM BODY */}
      {isOpen && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* TOAST NOTIFIKASI */}
          {toast && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                toast.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
              <span>{toast.message}</span>
            </div>
          )}

          {/* SECTION 1: HARI & TANGGAL PELAKSANAAN HARI 1 - 4 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🗓️</span> 1. Hari & Tanggal Pelaksanaan Ujian (Hari 1 s.d. 4)
              </label>
              <span className="text-[11px] text-slate-400">Contoh format: &quot;Senin, 19 Okt 2026&quot;</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hari Ke-1</span>
                <input
                  type="text"
                  value={tglHari1}
                  onChange={(e) => setTglHari1(e.target.value)}
                  placeholder="Senin, 19 Okt 2026"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hari Ke-2</span>
                <input
                  type="text"
                  value={tglHari2}
                  onChange={(e) => setTglHari2(e.target.value)}
                  placeholder="Selasa, 20 Okt 2026"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hari Ke-3</span>
                <input
                  type="text"
                  value={tglHari3}
                  onChange={(e) => setTglHari3(e.target.value)}
                  placeholder="Rabu, 21 Okt 2026"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hari Ke-4</span>
                <input
                  type="text"
                  value={tglHari4}
                  onChange={(e) => setTglHari4(e.target.value)}
                  placeholder="Kamis, 22 Okt 2026"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: WAKTU / JAM PELAKSANAAN SESI (WIB) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🕒</span> 2. Jam / Waktu Pelaksanaan Sesi (WIB)
              </label>
              <span className="text-[11px] text-slate-400">Contoh format: &quot;07.30 - 09.30&quot;</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Jam Sesi 1</span>
                <input
                  type="text"
                  value={jamSesi1}
                  onChange={(e) => setJamSesi1(e.target.value)}
                  placeholder="07.30 - 09.30"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Jam Sesi 2</span>
                <input
                  type="text"
                  value={jamSesi2}
                  onChange={(e) => setJamSesi2(e.target.value)}
                  placeholder="10.30 - 12.30"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Jam Sesi 3</span>
                <input
                  type="text"
                  value={jamSesi3}
                  onChange={(e) => setJamSesi3(e.target.value)}
                  placeholder="13.30 - 15.30"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Perubahan tanggal dan jam akan langsung memperbarui seluruh Kartu Peserta Ujian.
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition flex items-center gap-2 ${
                isPending
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              <span>{isPending ? "⏳ Menyimpan..." : "💾 Simpan Jadwal & Jam Sesi"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
