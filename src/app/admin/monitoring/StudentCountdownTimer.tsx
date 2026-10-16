"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { finishStudentExam } from "./actions";

interface StudentCountdownTimerProps {
  waktuSelesai: string;
  hasilId: string;
  siswaNama?: string;
}

export default function StudentCountdownTimer({
  waktuSelesai,
  hasilId,
  siswaNama,
}: StudentCountdownTimerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const target = new Date(waktuSelesai).getTime();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  });
  const [isFinishing, setIsFinishing] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    const checkAndTick = () => {
      const target = new Date(waktuSelesai).getTime();
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(diff);

      if (diff === 0 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsFinishing(true);
        // Otomatis selesaikan ujian siswa di database
        finishStudentExam(hasilId)
          .then(() => {
            router.refresh();
          })
          .catch((err) => {
            console.error("Gagal auto finish ujian siswa:", err);
            router.refresh();
          });
      }
    };

    checkAndTick();
    const interval = setInterval(checkAndTick, 1000);
    return () => clearInterval(interval);
  }, [waktuSelesai, hasilId, router]);

  if (!mounted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">
        ⏳ --:--:--
      </span>
    );
  }

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const formatted = `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  if (secondsLeft === 0 || isFinishing) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-rose-600 text-white shadow-xs animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
        <span>00:00:00 (WAKTU HABIS)</span>
      </span>
    );
  }

  // Waktu kurang dari 5 menit -> Peringatan kritis merah
  if (secondsLeft <= 300) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-rose-50 text-rose-700 border border-rose-300 animate-pulse shadow-xs"
        title={`Sisa waktu pengerjaan ${siswaNama || "siswa"}`}
      >
        <span>🔥</span>
        <span>Sisa: {formatted}</span>
      </span>
    );
  }

  // Waktu kurang dari 15 menit -> Peringatan kuning/amber
  if (secondsLeft <= 900) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs"
        title={`Sisa waktu pengerjaan ${siswaNama || "siswa"}`}
      >
        <span>⚠️</span>
        <span>Sisa: {formatted}</span>
      </span>
    );
  }

  // Waktu normal -> Badge biru sejuk
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
      title={`Sisa waktu pengerjaan ${siswaNama || "siswa"}`}
    >
      <span className="text-[10px]">⏳</span>
      <span>Sisa: {formatted}</span>
    </span>
  );
}
