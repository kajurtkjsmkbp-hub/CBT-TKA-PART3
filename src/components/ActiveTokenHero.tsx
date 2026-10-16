"use client";

import { useState } from "react";
import TokenCountdown from "./TokenCountdown";

interface ActiveTokenHeroProps {
  ujianId: string;
  judulUjian: string;
  namaMapel: string;
  gelombang?: number;
  hariKe?: number;
  sesi: number;
  ruang: string;
  token: string;
  waktuMulai: Date | string;
  onRefreshAction: (formData: FormData) => void;
  onStopAction: (formData: FormData) => void;
}

export default function ActiveTokenHero({
  ujianId,
  judulUjian,
  namaMapel,
  gelombang = 1,
  hariKe = 1,
  sesi,
  ruang,
  token,
  waktuMulai,
  onRefreshAction,
  onStopAction,
}: ActiveTokenHeroProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-[#0b5c92]/30 overflow-hidden mb-8 transition-all">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0b5c92] via-[#106fa7] to-[#084b77] text-white p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl flex-shrink-0">
            🔑
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                Sesi Ujian Aktif
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">{judulUjian}</h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
              Mata Pelajaran: <strong className="text-white">{namaMapel}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-extrabold px-3 py-1.5 rounded-xl border border-white/25">
            Gelombang {gelombang}
          </span>
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-extrabold px-3 py-1.5 rounded-xl border border-white/25">
            Hari ke-{hariKe}
          </span>
          <span className="bg-amber-400 text-slate-900 text-xs font-black px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm">
            Sesi {sesi}
          </span>
          <span className="bg-white/15 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/25">
            {ruang}
          </span>
        </div>
      </div>

      {/* TOKEN DISPLAY & COUNTDOWN AREA */}
      <div className="p-6 sm:p-8 bg-slate-50/60 flex flex-col items-center text-center">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
          KODE TOKEN UJIAN (ANBK / CBT)
        </p>

        {/* GIANT PROMINENT TOKEN BOX */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg mb-6">
          <div className="w-full sm:flex-1 bg-white border-2 border-[#0b5c92]/30 px-6 py-4 rounded-2xl shadow-inner flex items-center justify-center">
            <span className="font-mono text-4xl sm:text-5xl md:text-6xl font-black tracking-[0.25em] text-[#0b5c92] select-all">
              {token}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`w-full sm:w-auto px-5 py-4 rounded-2xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 border flex-shrink-0 ${
              copied
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
            title="Salin Token"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Salin</span>
              </>
            )}
          </button>
        </div>

        {/* HERO COUNTDOWN & KADALUARSA BANNER */}
        <div className="w-full max-w-xl mb-6">
          <TokenCountdown waktuMulai={waktuMulai} variant="hero" />
        </div>

        {/* ACTION BUTTONS: RILIS ULANG & TUTUP SESI */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md pt-2 border-t border-slate-200">
          <form action={onRefreshAction} className="w-full sm:w-auto flex-1">
            <input type="hidden" name="ujianId" value={ujianId} />
            <input type="hidden" name="gelombang" value={gelombang} />
            <input type="hidden" name="hariKe" value={hariKe} />
            <input type="hidden" name="sesi" value={sesi} />
            <input type="hidden" name="ruang" value={ruang} />
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold py-3 px-5 rounded-xl transition shadow-md flex items-center justify-center gap-2 border border-amber-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Rilis Token Baru (Reset 15 Mnt)</span>
            </button>
          </form>

          <form action={onStopAction} className="w-full sm:w-auto">
            <input type="hidden" name="ujianId" value={ujianId} />
            <button
              type="submit"
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3 px-5 rounded-xl transition border border-rose-200 shadow-sm"
            >
              Tutup Sesi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
