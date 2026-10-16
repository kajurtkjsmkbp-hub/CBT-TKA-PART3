"use client";
import { useState, useEffect } from "react";

interface TokenCountdownProps {
  waktuMulai: Date | string;
  variant?: "badge" | "hero";
}

export default function TokenCountdown({ waktuMulai, variant = "badge" }: TokenCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const start = new Date(waktuMulai).getTime();
    
    const updateTimer = () => {
      const diff = 15 * 60000 - (Date.now() - start);
      if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [waktuMulai]);

  if (timeLeft === null) return null;

  const isExpired = timeLeft <= 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isWarning = timeLeft <= 120 && !isExpired; // Merah/peringatan jika < 2 menit

  // Varian Hero (Digunakan di Banner Token Utama / Dashboard Proktor)
  if (variant === "hero") {
    if (isExpired) {
      return (
        <div className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5 rounded-2xl shadow-lg border-2 border-red-400 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
              ⛔
            </div>
            <div>
              <h4 className="font-black text-base sm:text-lg tracking-wide uppercase">
                TOKEN TELAH KADALUARSA (15 MENIT HABIS)
              </h4>
              <p className="text-xs sm:text-sm text-red-100 mt-0.5">
                Token ini sudah tidak dapat digunakan login oleh siswa baru. Segera rilis token baru di bawah.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/30">
            Perlu Rilis Ulang
          </div>
        </div>
      );
    }

    // Hitung persentase sisa waktu dari 15 menit (900 detik)
    const percentLeft = Math.min(100, Math.max(0, (timeLeft / 900) * 100));

    return (
      <div className={`w-full p-4 rounded-2xl border transition-all ${
        isWarning 
          ? "bg-rose-50 border-rose-300 text-rose-800" 
          : "bg-emerald-50/70 border-emerald-200 text-emerald-800"
      }`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isWarning ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse"}`}></span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {isWarning ? "Masa Berlaku Segera Berakhir" : "Token Aktif (Berlaku 15 Menit)"}
            </span>
          </div>
          <div className="font-mono font-black text-lg sm:text-xl tracking-tight">
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
        </div>
        
        {/* Progress Bar Sisa Waktu */}
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 rounded-full ${
              isWarning ? "bg-red-500" : percentLeft > 50 ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${percentLeft}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // Varian Default / Badge (Digunakan pada Tabel Status Tes & Monitoring)
  if (isExpired) {
    return (
      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100/90 border border-red-300 rounded-lg text-red-700 text-xs font-black tracking-wide animate-pulse">
        <span className="w-2 h-2 rounded-full bg-red-600"></span>
        <span>⛔ TOKEN KADALUARSA</span>
      </div>
    );
  }

  return (
    <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
      isWarning 
        ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse" 
        : "bg-emerald-50 text-emerald-700 border-emerald-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? "bg-rose-500" : "bg-emerald-500"}`}></span>
      <span>Sisa Waktu: <strong className="font-mono text-sm">{mins}:{secs.toString().padStart(2, "0")}</strong></span>
    </div>
  );
}
