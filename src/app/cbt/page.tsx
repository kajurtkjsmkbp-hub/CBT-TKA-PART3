"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { checkTokenAndFetchExam, submitExamResult, verifyProctorPin, getCurrentUser } from "./actions";

export default function CBTPage() {
  const [examState, setExamState] = useState<"TOKEN" | "RUNNING" | "FINISHED" | "BLOCKED" | "COMPLETED">("TOKEN");
  const [inputToken, setInputToken] = useState("");
  const [peringatan, setPeringatan] = useState(0);
  const [unblockPin, setUnblockPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [completedInfo, setCompletedInfo] = useState<{userId?: string, namaSiswa: string, judulUjian: string, mataPelajaran: string, nilai: number, kkm?: number} | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [keyBlockedAlert, setKeyBlockedAlert] = useState<{show: boolean, keyName: string, message: string} | null>(null);

  const handleUnblock = async () => {
    setPinError(null);
    const trimmedPin = unblockPin.trim();
    if (!trimmedPin) {
      setPinError("Silakan masukkan PIN Otorisasi Proktor terlebih dahulu.");
      return;
    }

    setIsUnblocking(true);
    try {
      const res = await verifyProctorPin(trimmedPin);
      if (res.success) {
        setPinError(null);
        setPeringatan(0);
        setCheatCount(0);
        setShowCheatModal(false);
        localStorage.setItem("cbt_peringatan", "0");
        localStorage.setItem("cbt_blocked", "false");
        localStorage.setItem("cbt_show_cheat_modal", "false");
        localStorage.setItem("cbt_exam_state", "RUNNING");

        // Sinkronisasi waktu sisa dan jawaban tersimpan dari server
        const activeToken = inputToken.trim() || (typeof window !== "undefined" ? localStorage.getItem("cbt_token") || "" : "");
        if (activeToken) {
          try {
            const fetchRes = await checkTokenAndFetchExam(activeToken, true);
            if (fetchRes.success && fetchRes.data) {
              setExamInfo(fetchRes.data);
              localStorage.setItem("cbt_exam_info", JSON.stringify(fetchRes.data));
              setTimeLeft(fetchRes.data.sisaDetik);

              // Pulihkan soal jika belum ada di state
              if (fetchRes.data.soal && (!soalData || soalData.length === 0)) {
                setSoalData(fetchRes.data.soal);
                localStorage.setItem("cbt_shuffled_soal", JSON.stringify(fetchRes.data.soal));
              }

              // Pulihkan & gabungkan jawaban agar tidak hilang
              let localAns = {};
              try {
                const saved = localStorage.getItem("cbt_answers");
                if (saved) localAns = JSON.parse(saved);
              } catch (e) {}

              const mergedAnswers = { ...(fetchRes.data.savedAnswers || {}), ...localAns, ...answers };
              setAnswers(mergedAnswers);
              localStorage.setItem("cbt_answers", JSON.stringify(mergedAnswers));
            }
          } catch (e) {
            console.error("Gagal sinkronisasi data unblock:", e);
          }
        }

        setExamState("RUNNING");
        setUnblockPin("");

        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
        } catch (e) {}
      } else {
        setPinError("PIN PROKTOR TIDAK VALID / SALAH! Otorisasi pembukaan blokir ujian ditolak.");
      }
    } catch (e) {
      setPinError("Gagal menghubungi server untuk memvalidasi PIN Proktor.");
    } finally {
      setIsUnblocking(false);
    }
  };
  const [soalData, setSoalData] = useState<any[]>([]);
  const [examInfo, setExamInfo] = useState<any>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [raguRagu, setRaguRagu] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(5400); // 90 Menit
  const [currentUser, setCurrentUser] = useState<{id?: string, nama: string, email_username: string, foto?: string | null, sekolah?: string | null, mapelAktif: string | null} | null>(null);

  const [isOffline, setIsOffline] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDaftarSoalMobile, setShowDaftarSoalMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCheatModal, setShowCheatModal] = useState(false);
  const [cheatCount, setCheatCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isNotFullscreen, setIsNotFullscreen] = useState(false);
  const hasAutoSubmittedRef = useRef(false);

  // Helper untuk acak Array (Fisher-Yates)
  const shuffleArray = (array: any[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Deteksi Koneksi Internet
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleLogout = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cbt_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    window.location.href = "/api/logout";
  };

  // Auto-load & Auto-save (Ketahanan Sistem Local terisolasi per Siswa)
  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setCurrentUser(user);

      // KUNCI ISOLASI: Cek apakah user id sama dengan user sebelumnya di browser ini
      const savedActiveUserId = localStorage.getItem("cbt_active_user_id");
      if (savedActiveUserId && user.id && savedActiveUserId !== user.id) {
        // Jika user berbeda (siswa bergantian perangkat), bersihkan cache user sebelumnya!
        const keysToPurge: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("cbt_")) keysToPurge.push(k);
        }
        keysToPurge.forEach((k) => localStorage.removeItem(k));
      }
      if (user.id) {
        localStorage.setItem("cbt_active_user_id", user.id);
      }

      const savedAnswers = localStorage.getItem("cbt_answers");
      const savedRagu = localStorage.getItem("cbt_ragu");
      const savedShuffled = localStorage.getItem("cbt_shuffled_soal");
      const savedPeringatan = localStorage.getItem("cbt_peringatan");
      const isBlocked = localStorage.getItem("cbt_blocked");
      const savedToken = localStorage.getItem("cbt_token");
      const savedExamState = localStorage.getItem("cbt_exam_state");
      const savedCheatModal = localStorage.getItem("cbt_show_cheat_modal");
      const savedExamInfo = localStorage.getItem("cbt_exam_info");
      const savedCompletedInfo = localStorage.getItem("cbt_completed_info");
      
      if (savedAnswers) {
        try { setAnswers(JSON.parse(savedAnswers)); } catch (e) {}
      }
      if (savedRagu) {
        try { setRaguRagu(JSON.parse(savedRagu)); } catch (e) {}
      }
      if (savedShuffled) {
        try { setSoalData(JSON.parse(savedShuffled)); } catch (e) {}
      }
      if (savedToken) setInputToken(savedToken);
      if (savedExamInfo) {
        try { setExamInfo(JSON.parse(savedExamInfo)); } catch (e) {}
      }
      if (savedCompletedInfo) {
        try { 
          const parsed = JSON.parse(savedCompletedInfo);
          // Hanya muat completedInfo jika sesuai dengan user saat ini
          if (!parsed.userId || (user.id && parsed.userId === user.id)) {
            setCompletedInfo(parsed);
          } else {
            localStorage.removeItem("cbt_completed_info");
          }
        } catch (e) {}
      }

      const pCount = savedPeringatan ? Number(savedPeringatan) : 0;
      setPeringatan(pCount);
      setCheatCount(pCount);

      // KUNCI: Prioritas pemulihan status saat refresh
      if (isBlocked === "true" || pCount >= 3) {
        setExamState("BLOCKED");
        setShowCheatModal(false);
        if (savedToken) {
          checkTokenAndFetchExam(savedToken, true).then(res => {
            if (res.success && res.data) {
              setExamInfo(res.data);
              localStorage.setItem("cbt_exam_info", JSON.stringify(res.data));
              setTimeLeft(res.data.sisaDetik);
              if (res.data.savedAnswers && Object.keys(res.data.savedAnswers).length > 0) {
                setAnswers(prev => ({ ...res.data.savedAnswers, ...prev }));
              }
            }
            setIsHydrated(true);
          }).catch(() => {
            setIsHydrated(true);
          });
        } else {
          setIsHydrated(true);
        }
      } else if (savedExamState === "RUNNING" || (savedToken && savedShuffled)) {
        setExamState("RUNNING");
        if (savedCheatModal === "true") {
          setShowCheatModal(true);
        }
        // Re-fetch waktu sisa dan data ujian dari server
        if (savedToken) {
          checkTokenAndFetchExam(savedToken, true).then(res => {
            if (res.success && res.data) {
              setExamInfo(res.data);
              localStorage.setItem("cbt_exam_info", JSON.stringify(res.data));
              setTimeLeft(res.data.sisaDetik);
              if (res.data.savedAnswers && Object.keys(res.data.savedAnswers).length > 0) {
                setAnswers(prev => ({ ...res.data.savedAnswers, ...prev }));
              }
            } else if (res.alreadyCompleted && res.completedData) {
              setCompletedInfo(res.completedData);
              localStorage.setItem("cbt_completed_info", JSON.stringify(res.completedData));
              setExamState("COMPLETED");
              localStorage.setItem("cbt_exam_state", "COMPLETED");
            } else {
              alert(res.message || "Sesi ujian sudah tidak aktif.");
              localStorage.removeItem("cbt_exam_state");
              localStorage.removeItem("cbt_token");
              localStorage.removeItem("cbt_exam_info");
              localStorage.removeItem("cbt_shuffled_soal");
              setExamState("TOKEN");
            }
            setIsHydrated(true);
          }).catch(() => {
            setIsHydrated(true);
          });
        } else {
          setExamState("TOKEN");
          setIsHydrated(true);
        }
      } else if (savedExamState === "COMPLETED" && savedCompletedInfo) {
        setExamState("COMPLETED");
        setIsHydrated(true);
      } else {
        setExamState("TOKEN");
        setIsHydrated(true);
      }
    }).catch(() => {
      window.location.href = "/login";
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) return; // KUNCI PENTING: Jangan timpa localStorage sebelum proses hidrasi selesai!
    localStorage.setItem("cbt_answers", JSON.stringify(answers));
    localStorage.setItem("cbt_ragu", JSON.stringify(raguRagu));
    if (soalData.length > 0) localStorage.setItem("cbt_shuffled_soal", JSON.stringify(soalData));
  }, [answers, raguRagu, soalData, isHydrated]);

  // Anti-Cheat: Tab Switch & Window Blur Detection (Deteksi Pindah Tab / Klik Jendela Sebelah / Aplikasi Lain)
  useEffect(() => {
    if (examState !== "RUNNING") return;

    let blurTimeout: any;

    const triggerCheatWarning = () => {
      setPeringatan(prev => {
        const newCount = prev + 1;
        localStorage.setItem("cbt_peringatan", newCount.toString());
        if (newCount >= 3) {
          setExamState("BLOCKED");
          localStorage.setItem("cbt_blocked", "true");
          localStorage.setItem("cbt_exam_state", "BLOCKED");
          localStorage.setItem("cbt_show_cheat_modal", "false");
          setShowCheatModal(false);
        } else {
          setCheatCount(newCount);
          localStorage.setItem("cbt_show_cheat_modal", "true");
          setShowCheatModal(true);
        }
        return newCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatWarning();
      }
    };

    const handleWindowBlur = () => {
      // Ketika siswa mengklik jendela sebelah / aplikasi lain
      clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (!document.hasFocus() && examState === "RUNNING") {
          triggerCheatWarning();
        }
      }, 300);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      clearTimeout(blurTimeout);
    };
  }, [examState]);

  // Anti-Split Screen & Strict Fullscreen Enforcement (Desktop / Laptop)
  useEffect(() => {
    if (examState !== "RUNNING") {
      setIsNotFullscreen(false);
      return;
    }

    const checkFullscreenAndSplit = () => {
      // Hanya wajib di Desktop / Laptop (lebar layar >= 768px)
      const isMobile = window.innerWidth < 640 && window.screen.width < 640;
      if (!isMobile) {
        const isFS = !!document.fullscreenElement;
        // Deteksi split screen (jendela diperkecil kurang dari 85% lebar layar)
        const isSplit = window.innerWidth < (window.screen.availWidth * 0.85);
        if (!isFS || isSplit) {
          setIsNotFullscreen(true);
        } else {
          setIsNotFullscreen(false);
        }
      }
    };

    checkFullscreenAndSplit();
    document.addEventListener("fullscreenchange", checkFullscreenAndSplit);
    window.addEventListener("resize", checkFullscreenAndSplit);

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreenAndSplit);
      window.removeEventListener("resize", checkFullscreenAndSplit);
    };
  }, [examState]);

  // Sekuriti 1: Pencegah Penutupan Tab / Jendela / Browser (Alt+F4, Ctrl+W, Tombol Close X)
  useEffect(() => {
    if (examState !== "RUNNING") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Standar browser modern: memicu dialog konfirmasi native agar browser tidak langsung tertutup
      e.returnValue = "Ujian sedang berlangsung! Apakah Anda yakin ingin meninggalkan atau menutup halaman ini?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [examState]);

  // Sekuriti 2: Intersepsi Tombol Berbahaya (Alt+F4, Ctrl+W, F5, Ctrl+R, DevTools, Klik Kanan)
  useEffect(() => {
    if (examState !== "RUNNING") return;

    let alertTimeout: any;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Deteksi Alt+F4
      const isAltF4 = (e.altKey || e.metaKey) && (e.key === "F4" || e.keyCode === 115);
      // Deteksi Ctrl+W (Tutup Tab)
      const isCtrlW = (e.ctrlKey || e.metaKey) && (e.key === "w" || e.key === "W" || e.keyCode === 87);
      // Deteksi Ctrl+Shift+W (Tutup Jendela)
      const isCtrlShiftW = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "w" || e.key === "W");
      // Deteksi Refresh (F5 / Ctrl+R)
      const isF5 = e.key === "F5" || e.keyCode === 116;
      const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R" || e.keyCode === 82);
      // Deteksi DevTools (F12 / Ctrl+Shift+I / Ctrl+Shift+J) & View Source (Ctrl+U)
      const isF12 = e.key === "F12" || e.keyCode === 123;
      const isDevTools = (e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key);
      const isViewSource = (e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U");

      if (isAltF4 || isCtrlW || isCtrlShiftW) {
        e.preventDefault();
        e.stopPropagation();
        
        clearTimeout(alertTimeout);
        setKeyBlockedAlert({
          show: true,
          keyName: isAltF4 ? "Alt + F4" : "Ctrl + W",
          message: "Kombinasi tombol penutup jendela terdeteksi dan berhasil dinonaktifkan oleh sistem CBT. Tetaplah berada di lembar ujian."
        });
        alertTimeout = setTimeout(() => setKeyBlockedAlert(null), 5000);
        return false;
      }

      if (isF5 || isCtrlR) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(alertTimeout);
        setKeyBlockedAlert({
          show: true,
          keyName: isF5 ? "F5 (Refresh)" : "Ctrl + R",
          message: "Muat ulang (refresh) halaman dinonaktifkan selama ujian berlangsung demi melindungi integritas jawaban Anda."
        });
        alertTimeout = setTimeout(() => setKeyBlockedAlert(null), 4000);
        return false;
      }

      if (isF12 || isDevTools || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(alertTimeout);
        setKeyBlockedAlert({
          show: true,
          keyName: "Inspect / DevTools",
          message: "Akses Developer Tools dan Inspect Element dilarang keras selama sesi ujian."
        });
        alertTimeout = setTimeout(() => setKeyBlockedAlert(null), 4000);
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu);
      clearTimeout(alertTimeout);
    };
  }, [examState]);

  // Timer Countdown Logic
  useEffect(() => {
    let timer: any;
    if (examState === "RUNNING") {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examState]);

  // Auto Submit when time is up (00:00:00)
  useEffect(() => {
    if (examState === "RUNNING" && timeLeft === 0 && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      setIsSubmitting(true);
      const activeToken = inputToken.trim() || (typeof window !== "undefined" ? localStorage.getItem("cbt_token") || "" : "");

      submitExamResult(activeToken, answers).then((res) => {
        setIsSubmitting(false);
        if (res.success && res.completedData) {
          setCompletedInfo(res.completedData);
          localStorage.setItem("cbt_completed_info", JSON.stringify(res.completedData));
        }
        localStorage.removeItem("cbt_token");
        localStorage.removeItem("cbt_answers");
        localStorage.removeItem("cbt_ragu");
        localStorage.removeItem("cbt_shuffled_soal");
        localStorage.setItem("cbt_exam_state", "COMPLETED");
        setExamState("COMPLETED");
      }).catch((err) => {
        console.error("Gagal auto submit waktu habis:", err);
        setIsSubmitting(false);
        setExamState("COMPLETED");
        localStorage.setItem("cbt_exam_state", "COMPLETED");
      });
    }
  }, [timeLeft, examState, inputToken, answers]);

  const mulaiUjian = async () => {
    setTokenError(null);
    if (!inputToken.trim()) {
      setTokenError("Silakan masukkan Kode Token Ujian terlebih dahulu.");
      return;
    }
    
    setIsValidatingToken(true);
    try {
      // Validasi ke Server
      const res = await checkTokenAndFetchExam(inputToken.trim()) as any;
      
      // Cek apakah ujian sudah pernah dikerjakan
      if (res.alreadyCompleted && res.completedData) {
        setCompletedInfo(res.completedData);
        localStorage.setItem("cbt_completed_info", JSON.stringify(res.completedData));
        localStorage.setItem("cbt_exam_state", "COMPLETED");
        setExamState("COMPLETED");
        setIsValidatingToken(false);
        return;
      }
      
      if (!res.success || !res.data) {
        setTokenError(res.message || "Token tidak valid atau tidak aktif.");
        setIsValidatingToken(false);
        return;
      }
      
      // Acak Soal dan Opsi jika belum diacak di localStorage (baru pertama kali buka sesi ini)
      localStorage.setItem("cbt_token", inputToken.trim());
      localStorage.setItem("cbt_exam_state", "RUNNING");
    
    const savedShuffled = localStorage.getItem("cbt_shuffled_soal");
    if (!savedShuffled) {
      let shuffledSoals = shuffleArray(res.data.soal);
      shuffledSoals = shuffledSoals.map(s => ({
        ...s,
        opsi: shuffleArray(s.opsi)
      }));
      setSoalData(shuffledSoals);
    }
    
    setExamInfo(res.data);
    localStorage.setItem("cbt_exam_info", JSON.stringify(res.data));
    setTimeLeft(res.data.sisaDetik);
    
    if (res.data.savedAnswers && Object.keys(res.data.savedAnswers).length > 0) {
       setAnswers(res.data.savedAnswers);
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.log("Fullscreen ditolak/tidak didukung", e);
    }
    setExamState("RUNNING");
  } catch (e: any) {
    setTokenError("Terjadi kendala koneksi saat memvalidasi token. Silakan coba lagi.");
  } finally {
    setIsValidatingToken(false);
  }
};

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sinkronisasi ke Server secara debounced (agar tidak lag)
  useEffect(() => {
    const handler = setTimeout(() => {
      const activeToken = inputToken.trim() || (typeof window !== "undefined" ? localStorage.getItem("cbt_token") || "" : "");
      if (isHydrated && examState === "RUNNING" && !isOffline && activeToken && Object.keys(answers).length > 0) {
        fetch('/api/cbt-sync', {
           method: 'POST', 
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ token: activeToken, answers })
        }).catch(() => {});
      }
    }, 1000); // Tunggu 1 detik setelah user berhenti mengetik/memilih

    return () => clearTimeout(handler);
  }, [answers, examState, isOffline, inputToken, isHydrated]);

  const handleAnswer = (value: any, isPGK: boolean = false) => {
    const soal = soalData[currentIdx];
    let finalValue = value;
    
    if (isPGK) {
       const currentAns = Array.isArray(answers[soal.originalIndex]) ? answers[soal.originalIndex] : [];
       if (currentAns.includes(value)) {
          finalValue = currentAns.filter((v: any) => v !== value);
       } else {
          finalValue = [...currentAns, value];
       }
    }

    setAnswers({ ...answers, [soal.originalIndex]: finalValue });
  };

  const toggleRagu = () => {
    const soal = soalData[currentIdx];
    setRaguRagu({ ...raguRagu, [soal.originalIndex]: !raguRagu[soal.originalIndex] });
  };

  const totalSoal = soalData.length;
  const currentSoal = soalData[currentIdx] || { text: "", opsi: [] };

  // Hitung statistik jawaban untuk modal konfirmasi
  const jumlahDijawab = soalData.filter(s => {
    const ans = answers[s.originalIndex];
    if (ans === undefined || ans === null || ans === "") return false;
    if (Array.isArray(ans) && ans.length === 0) return false;
    return true;
  }).length;
  const jumlahRagu = soalData.filter(s => raguRagu[s.originalIndex]).length;
  const jumlahBelum = Math.max(0, totalSoal - jumlahDijawab);

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const activeToken = inputToken.trim() || (typeof window !== "undefined" ? localStorage.getItem("cbt_token") || "" : "");
      const res = await submitExamResult(activeToken, answers);
      if (res.success) {
        if (res.completedData) {
          setCompletedInfo(res.completedData);
          localStorage.setItem("cbt_completed_info", JSON.stringify(res.completedData));
        }
        localStorage.removeItem("cbt_token");
        localStorage.removeItem("cbt_answers");
        localStorage.removeItem("cbt_ragu");
        localStorage.removeItem("cbt_shuffled_soal");
        localStorage.setItem("cbt_exam_state", "COMPLETED");
        setExamState("COMPLETED");
      } else {
        alert("Gagal mengakhiri ujian: " + (res.message || "Terjadi kesalahan"));
        setIsSubmitting(false);
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi saat mengirim jawaban. Silakan coba kembali.");
      setIsSubmitting(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#eef2f6] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-[#0b5c92] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-semibold text-sm">Memuat sesi ujian...</p>
      </div>
    );
  }

  if (examState === "TOKEN") {
    const isExpiredError = tokenError && (
      tokenError.toLowerCase().includes("kadaluarsa") || 
      tokenError.toLowerCase().includes("15 menit") ||
      tokenError.toLowerCase().includes("batas")
    );

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* HEADER ANBK STYLE (LOGIN) */}
        <header className="bg-[#0b5c92] text-white shadow-md z-10 sticky top-0">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 shadow">
                <div className="w-8 h-8 rounded-full border-2 border-[#0b5c92] flex items-center justify-center text-[#0b5c92] font-black text-xs tracking-wider">CBT</div>
              </div>
              <div>
                <h1 className="font-bold text-base md:text-lg leading-tight tracking-wide uppercase">CBT - TES KEMAMPUAN AKADEMIK</h1>
                <p className="text-xs text-blue-200">Portal Ujian Siswa</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-blue-100 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Konfirmasi Token</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transition-all">
            
            {/* CARD TOP DECORATIVE BANNER */}
            <div className="bg-gradient-to-r from-[#0b5c92] via-[#106fa7] to-[#084b77] text-white px-6 pt-7 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner mb-3 text-2xl">
                🔑
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">KONFIRMASI TES & TOKEN</h2>
              <p className="text-xs md:text-sm text-blue-100 mt-1 max-w-md mx-auto">
                Pastikan data identitas Anda telah sesuai, kemudian masukkan kode token yang dirilis oleh Proktor.
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">

              {/* IDENTITAS SISWA CARD */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0b5c92] to-sky-500 text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0">
                    {currentUser?.foto ? (
                      <img src={currentUser.foto} alt="Foto" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      currentUser?.nama ? currentUser.nama.substring(0, 2).toUpperCase() : "XX"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-base leading-tight truncate uppercase">
                      {currentUser?.nama || "Memuat Peserta..."}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      NIS: <span className="font-mono text-slate-700">{currentUser?.email_username || "-"}</span> • {currentUser?.sekolah || "Peserta Ujian"}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Mata Pelajaran</span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#0b5c92]">
                    {currentUser?.mapelAktif || "Menunggu..."}
                  </span>
                </div>
              </div>

              {/* JIKA TOKEN KADALUARSA - BANNER BESAR & JELAS */}
              {isExpiredError && (
                <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 p-5 rounded-2xl text-left shadow-sm flex items-start gap-4 animate-shake">
                  <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow">
                    ⛔
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                      <h4 className="font-black text-base text-rose-900 uppercase tracking-wide">
                        TOKEN UJIAN TELAH KADALUARSA
                      </h4>
                    </div>
                    <p className="text-sm text-rose-700 mt-1 leading-relaxed">
                      Token yang Anda masukkan telah melewati batas waktu aktif 15 menit. Anda tidak dapat memulai ujian dengan token yang lama.
                    </p>
                    <div className="mt-3 bg-white/95 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                      <span className="text-base">📢</span>
                      <span>Silakan lapor kepada <strong>Pengawas / Proktor Ruangan</strong> untuk meminta <strong>Token Baru</strong> yang telah diperbarui.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* JIKA ERROR LAIN (MISAL SALAH TOKEN / SESI TIDAK COCOK) */}
              {tokenError && !isExpiredError && (
                <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-4 rounded-2xl text-left shadow-sm flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <p className="font-black text-sm text-rose-900 uppercase">Gagal Memulai Ujian</p>
                    <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{tokenError}</p>
                  </div>
                </div>
              )}

              {/* TOKEN INPUT BOX */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Kode Token Ujian
                  </label>
                  <span className="text-xs text-slate-400 font-medium">Kombinasi 6 huruf / angka</span>
                </div>
                <input 
                  type="text" 
                  value={inputToken}
                  onChange={(e) => {
                    setInputToken(e.target.value.toUpperCase());
                    if (tokenError) setTokenError(null);
                  }}
                  maxLength={10}
                  placeholder="MASUKKAN TOKEN"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-slate-300 focus:border-[#0b5c92] focus:bg-white bg-slate-50 outline-none text-center font-mono font-black text-3xl sm:text-4xl tracking-[0.25em] text-[#0b5c92] transition-all shadow-inner uppercase"
                />
              </div>

              {/* SUBMIT BUTTON */}
              <button 
                onClick={mulaiUjian}
                disabled={isValidatingToken}
                className="w-full bg-[#0b5c92] hover:bg-[#074775] disabled:bg-slate-400 text-white font-black py-4 px-6 rounded-2xl transition shadow-lg text-base tracking-wide flex items-center justify-center gap-2"
              >
                {isValidatingToken ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>MEMVALIDASI TOKEN...</span>
                  </>
                ) : (
                  <>
                    <span>MULAI UJIAN SEKARANG</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={handleLogout} 
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Bukan Anda? Keluar Akun</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  if (examState === "COMPLETED") {
    const kkm = completedInfo?.kkm ?? 75;
    const nilaiFormatted = completedInfo?.nilai !== undefined ? completedInfo.nilai.toFixed(2) : "0.00";
    const nilaiNum = completedInfo?.nilai ?? 0;
    const isLulus = nilaiNum >= kkm;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* TOP BRANDING BAR (ANBK STYLE) */}
        <header className="bg-[#0b5c92] text-white shadow-md z-10 sticky top-0">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 shadow">
                <div className="w-8 h-8 rounded-full border-2 border-[#0b5c92] flex items-center justify-center text-[#0b5c92] font-bold text-xs tracking-wider">CBT</div>
              </div>
              <div>
                <h1 className="font-bold text-base md:text-lg leading-tight tracking-wide uppercase">CBT - TES KEMAMPUAN AKADEMIK</h1>
                <p className="text-xs text-blue-200">Portal Evaluasi & Hasil Ujian Siswa</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-blue-100 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sesi Terkunci (Selesai)</span>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA WITH PROPER SCROLLING & PADDING */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden transition-all">
            
            {/* CARD TOP DECORATIVE BANNER */}
            <div className="bg-gradient-to-r from-[#0b5c92] via-[#116da9] to-[#0e4e7c] text-white px-6 pt-7 pb-6 text-center relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">LEMBAR HASIL UJIAN</h2>
              <p className="text-xs md:text-sm text-blue-100 mt-1 max-w-md mx-auto">
                Ujian telah selesai dikerjakan dan tersimpan secara permanen pada sistem proktor.
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">

              {/* STUDENT PROFILE CARD */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0b5c92] to-sky-500 text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0">
                    {currentUser?.foto ? (
                      <img src={currentUser.foto} alt="Foto" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      currentUser?.nama ? currentUser.nama.substring(0, 2).toUpperCase() : (completedInfo?.namaSiswa ? completedInfo.namaSiswa.substring(0, 2).toUpperCase() : "XX")
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-base leading-tight truncate uppercase">
                      {currentUser?.nama || completedInfo?.namaSiswa || "Peserta Ujian"}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      NIS: <span className="font-mono text-slate-700">{currentUser?.email_username || "-"}</span> • {currentUser?.sekolah || "Peserta Ujian"}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Selesai
                  </span>
                </div>
              </div>

              {/* EXAM DETAIL GRID */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mata Pelajaran</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{completedInfo?.mataPelajaran || "-"}</p>
                </div>
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Paket Ujian</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{completedInfo?.judulUjian || "Ujian CBT"}</p>
                </div>
              </div>

              {/* SCORE & KKM ACHIEVEMENT CARD */}
              <div className={`p-6 rounded-2xl border-2 text-center transition-all ${
                isLulus 
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-sm shadow-emerald-100' 
                  : 'bg-rose-50/60 border-rose-300 shadow-sm shadow-rose-100'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                    NILAI AKHIR ANDA
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                    Target KKM: <strong className="text-slate-800">{kkm}</strong>
                  </span>
                </div>

                <div className="py-2">
                  <span className={`text-6xl font-black tracking-tight ${isLulus ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {nilaiFormatted}
                  </span>
                </div>

                {/* Progress Bar Visualizing Score vs KKM */}
                <div className="mt-3 mb-4">
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isLulus ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, nilaiNum))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 font-bold mt-1 px-0.5">
                    <span>Skor 0</span>
                    <span className="text-amber-800">Batas KKM ({kkm})</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-extrabold text-xs shadow-xs tracking-wide uppercase border ${
                  isLulus 
                    ? 'bg-emerald-500 text-white border-emerald-600' 
                    : 'bg-rose-500 text-white border-rose-600'
                }`}>
                  <span>{isLulus ? '🎉' : '⚠️'}</span>
                  <span>{isLulus ? 'LULUS KKM (TUNTAS)' : 'BELUM TUNTAS (PERLU REMEDIAL)'}</span>
                </div>
              </div>

              {/* HELPFUL NOTICE / ATURAN */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5 flex-shrink-0">ℹ️</span>
                <div className="leading-relaxed text-left">
                  <p className="font-bold text-amber-950 mb-0.5">Ketentuan Ujian Satu Kali</p>
                  <p className="text-amber-800">
                    Jawaban Anda telah terkunci. Siswa tidak diizinkan mengerjakan ulang ujian yang sama kecuali atas izin Proktor/Guru Pengawas.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
                <button 
                  type="button"
                  onClick={handleLogout} 
                  className="w-full bg-[#0b5c92] hover:bg-[#084872] active:scale-[0.99] text-white font-extrabold py-3.5 px-6 rounded-2xl transition shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Keluar & Kembali ke Halaman Login</span>
                </button>

            </div>

          </div>
        </main>
      </div>
    );
  }

  if (examState === "BLOCKED") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* TOP BRANDING BAR (ANBK STYLE) */}
        <header className="bg-rose-700 text-white shadow-md z-10 sticky top-0">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 shadow">
                <div className="w-8 h-8 rounded-full border-2 border-rose-700 flex items-center justify-center text-rose-700 font-bold text-xs tracking-wider">CBT</div>
              </div>
              <div>
                <h1 className="font-bold text-base md:text-lg leading-tight tracking-wide uppercase">CBT - TES KEMAMPUAN AKADEMIK</h1>
                <p className="text-xs text-rose-200">Sesi Terkunci / Pelanggaran Aturan Ujian</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full text-xs text-rose-100 border border-white/20">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-300 animate-ping"></span>
              <span className="font-bold">STATUS: DIBLOKIR</span>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-rose-200/80 overflow-hidden transition-all">
            
            {/* CARD TOP DECORATIVE BANNER */}
            <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white px-6 pt-7 pb-6 text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner mb-3">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">UJIAN DIBLOKIR SEMENTARA</h2>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-md mx-auto leading-relaxed">
                Sistem mendeteksi aktivitas mencurigakan atau perpindahan aplikasi melebihi batas toleransi.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">

              {/* IDENTITAS SISWA CARD */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0">
                    {currentUser?.foto ? (
                      <img src={currentUser.foto} alt="Foto" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      currentUser?.nama ? currentUser.nama.substring(0, 2).toUpperCase() : "XX"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-base leading-tight truncate uppercase">
                      {currentUser?.nama || "Peserta Ujian"}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      NIS: <span className="font-mono text-slate-700">{currentUser?.email_username || "-"}</span> • {currentUser?.sekolah || "Peserta Ujian"}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="text-[10px] font-bold text-rose-500 block uppercase">Status</span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    Terkunci
                  </span>
                </div>
              </div>

              {/* ALASAN & INSTRUKSI */}
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">📋</span>
                  <div className="text-xs text-amber-950 leading-relaxed space-y-1.5">
                    <p className="font-bold text-sm text-amber-900">
                      Instruksi Peserta Ujian:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-900 font-medium">
                      <li>Tetap tenang dan <strong>angkat tangan</strong> di tempat duduk Anda.</li>
                      <li>Panggil <strong>Guru Pengawas / Proktor Ruangan</strong>.</li>
                      <li>Proktor akan memasukkan <strong>PIN Otorisasi</strong> di bawah ini untuk membuka kembali sesi ujian Anda.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* JIKA PIN PROKTOR SALAH - BANNER BESAR & JELAS */}
              {pinError && (
                <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 p-4 sm:p-5 rounded-2xl text-left shadow-lg shadow-rose-500/15 flex items-start gap-3.5 sm:gap-4 animate-shake">
                  <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                    ⛔
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                      <h4 className="font-black text-sm sm:text-base text-rose-900 uppercase tracking-wide">
                        PIN PROKTOR TIDAK SESUAI / SALAH!
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-rose-700 mt-1 font-semibold leading-relaxed">
                      {pinError}
                    </p>
                    <div className="mt-2.5 bg-white/95 border border-rose-200 p-2.5 rounded-xl text-[11px] sm:text-xs text-rose-900 font-semibold flex items-center gap-2">
                      <span className="text-base">🔐</span>
                      <span>Pastikan <strong>Pengawas / Proktor</strong> memasukkan PIN yang benar sesuai di menu Pengaturan Proktor.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PIN INPUT CARD (KHUSUS PROKTOR) */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 sm:p-6 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0b5c92] text-white flex items-center justify-center text-sm shadow-xs">
                    🔐
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                      Otorisasi Pengawas / Proktor
                    </h3>
                    <p className="text-[11px] text-slate-400">Masukkan PIN resmi untuk membuka blokir siswa</p>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUnblock();
                  }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <input 
                      type={showPinPassword ? "text" : "password"}
                      value={unblockPin}
                      onChange={(e) => {
                        setUnblockPin(e.target.value.toUpperCase());
                        if (pinError) setPinError(null);
                      }}
                      placeholder="MASUKKAN PIN PROKTOR" 
                      maxLength={20}
                      autoFocus
                      className={`w-full px-4 py-4 sm:py-5 rounded-2xl border-2 outline-none text-center font-mono font-black text-2xl sm:text-3xl tracking-[0.25em] transition shadow-inner uppercase ${
                        pinError 
                          ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:border-rose-600 focus:bg-white' 
                          : 'border-slate-300 bg-white focus:border-[#0b5c92] text-[#0b5c92]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinPassword(!showPinPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2 rounded-xl transition text-lg cursor-pointer"
                      title={showPinPassword ? "Sembunyikan PIN" : "Tampilkan PIN"}
                    >
                      {showPinPassword ? "👁️" : "🙈"}
                    </button>
                  </div>

                  <button 
                    type="submit"
                    disabled={isUnblocking || !unblockPin.trim()}
                    className="w-full bg-[#0b5c92] hover:bg-[#074775] disabled:bg-slate-400 text-white font-black py-4 px-6 rounded-2xl transition shadow-lg text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isUnblocking ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>MEMVERIFIKASI PIN PROKTOR...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🔓</span>
                        <span>BUKA KUNCI BLOKIR SEKARANG</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-3 border-t border-slate-200 mt-4">
                  <button 
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Bukan Anda? Keluar Akun</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>
    );
  }

  if (examState === "RUNNING") {
    if (!examInfo) {
      return (
        <div className="min-h-screen bg-[#eef2f6] flex flex-col items-center justify-center font-sans">
          <div className="w-12 h-12 border-4 border-[#0b5c92] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-semibold text-sm">Menyiapkan lembar ujian...</p>
        </div>
      );
    }

    const currentSoal = soalData[currentIdx] || { text: "", opsi: [] };
    const totalSoal = soalData.length;
    const jumlahDijawab = Object.keys(answers).filter(k => answers[Number(k)] !== undefined && answers[Number(k)] !== "" && (!Array.isArray(answers[Number(k)]) || answers[Number(k)].length > 0)).length;
    const jumlahRagu = Object.keys(raguRagu).filter(k => raguRagu[Number(k)] === true).length;
    const jumlahBelum = Math.max(0, totalSoal - jumlahDijawab);

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* FLOATING SECURITY TOAST (KETIKA TOMBOL DIBLOKIR: ALT+F4, CTRL+W, F5, DLL.) */}
        {keyBlockedAlert && keyBlockedAlert.show && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-shake">
            <div className="bg-slate-900/95 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border-2 border-rose-500 backdrop-blur-md flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-rose-600/30">
                🛡️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                      {keyBlockedAlert.keyName} DIBLOKIR
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setKeyBlockedAlert(null)}
                    className="text-slate-400 hover:text-white text-lg p-1 leading-none cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-white mt-1">
                  Aksi Penutupan / Navigasi Dicegah!
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {keyBlockedAlert.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {isOffline && (
          <div className="bg-rose-600 text-white text-center py-2 px-4 text-xs sm:text-sm font-black shadow-md animate-pulse z-50 sticky top-0">
            ⚠️ KONEKSI TERPUTUS! Jangan tutup halaman ini, periksa koneksi internet Anda.
          </div>
        )}

        {/* HEADER ANBK STYLE (RUNNING) - RESPONSIVE UNTUK HP & LAPTOP */}
        <header className="bg-[#0b5c92] text-white px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-md flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center p-1 shadow flex-shrink-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-[#0b5c92] flex items-center justify-center text-[#0b5c92] font-black text-[10px] sm:text-xs">CBT</div>
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-base md:text-lg leading-tight tracking-wide uppercase truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                {examInfo?.judulUjian || "UJIAN CBT"}
              </h1>
              <p className="text-[11px] sm:text-xs text-blue-200 truncate">{examInfo?.mataPelajaran || ""}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Tombol Buka Daftar Soal di HP/Mobile */}
            <button
              type="button"
              onClick={() => setShowDaftarSoalMobile(true)}
              className="lg:hidden flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl border border-white/25 transition shadow-sm"
              title="Buka Daftar Soal"
            >
              <span>📑</span>
              <span className="hidden xs:inline">Daftar Soal</span>
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                {jumlahDijawab}/{totalSoal}
              </span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="font-bold text-xs sm:text-sm uppercase">{currentUser?.nama || "PESERTA"}</p>
              <p className="text-[10px] sm:text-xs text-blue-200 uppercase truncate max-w-[140px]">{currentUser?.sekolah || "Peserta Ujian"}</p>
            </div>

            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center text-[#0b5c92] font-black text-xs sm:text-sm shadow-inner overflow-hidden border border-white/30 flex-shrink-0">
              {currentUser?.foto ? (
                <img src={currentUser.foto} alt="Foto Peserta" className="w-full h-full object-cover" />
              ) : (
                currentUser?.nama ? currentUser.nama.substring(0, 2).toUpperCase() : "XX"
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA - RESPONSIVE LAYOUT */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-2 sm:p-4 gap-3 lg:gap-4 lg:h-[calc(100vh-75px)] overflow-hidden">
          
          {/* LEFT PANEL: QUESTION AREA (LEMBAR SOAL) */}
          <div className="flex-[3] bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/90 flex flex-col h-full overflow-hidden relative">
            
            {/* Question Header */}
            <div className="flex justify-between items-center bg-slate-50/90 px-3.5 sm:px-6 py-2 sm:py-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold uppercase text-slate-500">SOAL NO.</span>
                <span className="text-xl sm:text-2xl font-black text-[#0b5c92] font-mono">{currentIdx + 1}</span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">dari {totalSoal}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Tombol Nomor Soal Cepat di HP */}
                <button
                  type="button"
                  onClick={() => setShowDaftarSoalMobile(true)}
                  className="lg:hidden flex items-center gap-1 bg-[#0b5c92]/10 hover:bg-[#0b5c92]/15 text-[#0b5c92] px-2.5 py-1 rounded-lg text-xs font-bold border border-[#0b5c92]/20 active:scale-95"
                >
                  <span>📑</span>
                  <span>No. Soal</span>
                </button>
                {/* Timer Countdown */}
                <div className="flex items-center space-x-1.5 bg-rose-50 text-rose-600 px-2.5 sm:px-3.5 py-1 rounded-full border border-rose-200 font-mono font-black text-xs sm:text-sm shadow-inner">
                  <span>⏳</span>
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            {/* Question Content - Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
              <div 
                className="text-slate-800 leading-relaxed text-sm sm:text-base md:text-lg mb-6 sm:mb-8 break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:mx-auto [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:block [&_pre]:overflow-x-auto" 
                dangerouslySetInnerHTML={{ __html: currentSoal.text }}
              ></div>
              
              <div className="space-y-2.5 sm:space-y-3 pb-4">
                {/* Opsi Jawaban (PG / PGK) */}
                {(currentSoal.tipeSoal === "PG" || currentSoal.tipeSoal === "PGK" || !currentSoal.tipeSoal) && 
                  currentSoal.opsi.map((opsiData: any, idx: number) => {
                  
                  let isSelected = false;
                  if (currentSoal.tipeSoal === "PGK") {
                    const ansArray = Array.isArray(answers[currentSoal.originalIndex]) ? answers[currentSoal.originalIndex] : [];
                    isSelected = ansArray.includes(opsiData.originalOptionIndex);
                  } else {
                    isSelected = answers[currentSoal.originalIndex] === opsiData.originalOptionIndex;
                  }

                  const label = String.fromCharCode(65 + idx);
                  const isPGK = currentSoal.tipeSoal === "PGK";

                  return (
                    <label 
                      key={idx} 
                      className={`flex items-start p-3 sm:p-4 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition duration-150 group active:scale-[0.99] select-none
                        ${isSelected ? 'bg-blue-50/80 border-[#0b5c92] shadow-sm' : 'border-slate-200 hover:border-[#0b5c92]/50 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center h-6 flex-shrink-0">
                        <input 
                          type={isPGK ? "checkbox" : "radio"}
                          name={`soal-${currentIdx}-${isPGK ? idx : ''}`} 
                          className="hidden" 
                          checked={isSelected}
                          onChange={() => handleAnswer(opsiData.originalOptionIndex, isPGK)}
                        />
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-black text-xs sm:text-sm transition-colors flex-shrink-0
                          ${isPGK ? 'rounded-lg' : 'rounded-full'}
                          ${isSelected ? 'bg-[#0b5c92] border-2 border-[#0b5c92] text-white' : 'border-2 border-slate-400 text-slate-600 group-hover:border-[#0b5c92]'}`}>
                          {label}
                        </div>
                      </div>
                      <div className="ml-3 sm:ml-4 text-slate-700 text-sm sm:text-base pt-0.5 leading-relaxed break-words flex-1 [&_img]:max-w-full [&_img]:h-auto" dangerouslySetInnerHTML={{ __html: opsiData.text }}></div>
                    </label>
                  );
                })}

                {/* Isian Singkat */}
                {currentSoal.tipeSoal === "ISIAN" && (
                  <div className="mt-3 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl">
                     <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Jawaban Singkat:</p>
                     <input 
                       type="text"
                       value={answers[currentSoal.originalIndex] || ""}
                       onChange={(e) => handleAnswer(e.target.value)}
                       placeholder="Ketik jawaban di sini..."
                       className="w-full max-w-xl px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#0b5c92] focus:ring-2 focus:ring-[#0b5c92]/20 outline-none transition font-medium text-sm sm:text-base"
                     />
                  </div>
                )}

                {/* Essay */}
                {currentSoal.tipeSoal === "ESSAY" && (
                  <div className="mt-3 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl">
                     <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Uraian Jawaban:</p>
                     <textarea 
                       value={answers[currentSoal.originalIndex] || ""}
                       onChange={(e) => handleAnswer(e.target.value)}
                       rows={6}
                       placeholder="Ketik uraian jawaban dengan jelas..."
                       className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-[#0b5c92] focus:ring-2 focus:ring-[#0b5c92]/20 outline-none transition font-medium resize-none text-sm sm:text-base"
                     ></textarea>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Bottom Bar - Responsive & Zero Overlap */}
            <div className="bg-slate-50 p-2 sm:p-3.5 border-t border-slate-200 flex items-center justify-between gap-1.5 sm:gap-4 sticky bottom-0 z-10 flex-shrink-0">
              <button 
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="flex-1 sm:flex-initial px-2.5 sm:px-6 py-2.5 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-xl shadow-xs hover:bg-slate-100 disabled:opacity-40 transition text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95"
              >
                <span>◀</span>
                <span className="hidden sm:inline">SOAL </span>
                <span>SEBELUMNYA</span>
              </button>
              
              <button 
                onClick={toggleRagu}
                className={`flex-1 sm:flex-initial px-2 sm:px-6 py-2.5 font-bold rounded-xl shadow-xs transition border-2 text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95 ${
                  raguRagu[currentSoal.originalIndex] 
                    ? 'bg-amber-400 border-amber-500 text-amber-950 font-black' 
                    : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50'
                }`}
              >
                <span>{raguRagu[currentSoal.originalIndex] ? '☑' : '□'}</span>
                <span className="hidden xs:inline">RAGU-RAGU</span>
                <span className="xs:hidden">RAGU</span>
              </button>

              {currentIdx === totalSoal - 1 ? (
                <button 
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 sm:flex-initial px-2.5 sm:px-8 py-2.5 bg-rose-600 hover:bg-rose-700 border-2 border-rose-700 text-white font-black rounded-xl shadow-md transition text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95"
                >
                  <span>SELESAI</span>
                  <span>✔</span>
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIdx(prev => Math.min(totalSoal - 1, prev + 1))}
                  className="flex-1 sm:flex-initial px-2.5 sm:px-6 py-2.5 bg-[#0b5c92] hover:bg-[#084b77] border-2 border-[#0b5c92] text-white font-bold rounded-xl shadow-md transition text-xs sm:text-sm flex items-center justify-center gap-1 active:scale-95"
                >
                  <span><span className="hidden sm:inline">SOAL </span>BERIKUTNYA</span>
                  <span>▶</span>
                </button>
              )}
            </div>

          </div>

          {/* RIGHT PANEL: DAFTAR SOAL (PALETTE) - HANYA TAMPIL DI DESKTOP / LAPTOP (LG:FLEX) */}
          <div className="hidden lg:flex flex-[1] bg-white rounded-2xl shadow-sm border border-slate-200/90 flex-col h-full overflow-hidden min-w-[280px] isolate">
            <div className="bg-[#0b5c92] text-white px-4 py-3 text-center font-black tracking-widest text-sm border-b border-gray-200">
              DAFTAR SOAL
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              <div 
                className="grid grid-cols-5 gap-2"
                onClick={(e) => {
                  const target = (e.target as HTMLElement).closest('[data-idx]') as HTMLElement;
                  if (target && target.dataset.idx) {
                    setCurrentIdx(Number(target.dataset.idx));
                  }
                }}
              >
                {soalData.map((soal, idx) => {
                  const isAnswered = answers[soal.originalIndex] !== undefined && answers[soal.originalIndex] !== "" && answers[soal.originalIndex].length !== 0;
                  const isRagu = raguRagu[soal.originalIndex];
                  const isActive = currentIdx === idx;
                  
                  let bgColor = "bg-white text-gray-800 border-gray-300";
                  if (isRagu) bgColor = "bg-amber-400 text-amber-900 border-amber-500 font-black";
                  else if (isAnswered) bgColor = "bg-gray-800 text-white border-gray-900 font-bold";
                  if (isActive) bgColor += " ring-2 ring-[#0b5c92] ring-offset-1";
                  
                  return (
                    <div 
                      key={idx} 
                      data-idx={idx}
                      className={`h-12 rounded-xl border font-bold text-sm flex items-center justify-center cursor-pointer select-none ${bgColor} hover:opacity-85 active:scale-95 transition-all`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keterangan Warna */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs text-slate-600 space-y-2 font-medium">
               <div className="flex items-center space-x-2">
                 <div className="w-4 h-4 bg-gray-800 rounded border border-gray-900"></div>
                 <span>Sudah Dijawab</span>
               </div>
               <div className="flex items-center space-x-2">
                 <div className="w-4 h-4 bg-amber-400 rounded border border-amber-500"></div>
                 <span>Ragu-ragu</span>
               </div>
               <div className="flex items-center space-x-2">
                 <div className="w-4 h-4 bg-white rounded border border-gray-300"></div>
                 <span>Belum Dijawab</span>
               </div>
            </div>
          </div>
          
        </div>

        {/* MODAL / BOTTOM SHEET DAFTAR SOAL KHUSUS PENGGUNA HP (SMARTPHONE) */}
        {showDaftarSoalMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              
              {/* Header Drawer */}
              <div className="bg-[#0b5c92] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📑</span>
                  <div>
                    <h3 className="font-black text-base tracking-wide">DAFTAR NOMOR SOAL</h3>
                    <p className="text-[11px] text-blue-200">Ketuk nomor untuk langsung membuka soal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDaftarSoalMobile(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-lg transition active:scale-90"
                >
                  ✕
                </button>
              </div>

              {/* Status Ringkasan */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-center text-xs">
                <div className="bg-slate-800 text-white py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1">
                  <span>✔</span>
                  <span>{jumlahDijawab} Dijawab</span>
                </div>
                <div className="bg-amber-400 text-amber-950 py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1">
                  <span>⚠</span>
                  <span>{jumlahRagu} Ragu</span>
                </div>
                <div className="bg-white border border-slate-300 text-slate-700 py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1">
                  <span>⬜</span>
                  <span>{jumlahBelum} Kosong</span>
                </div>
              </div>

              {/* Grid Nomor Soal Touch-Friendly */}
              <div className="p-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-5 gap-2.5">
                  {soalData.map((soal, idx) => {
                    const isAnswered = answers[soal.originalIndex] !== undefined && answers[soal.originalIndex] !== "" && answers[soal.originalIndex].length !== 0;
                    const isRagu = raguRagu[soal.originalIndex];
                    const isActive = currentIdx === idx;
                    
                    let bgColor = "bg-white text-slate-800 border-slate-300";
                    if (isRagu) bgColor = "bg-amber-400 text-amber-950 border-amber-500 font-black";
                    else if (isAnswered) bgColor = "bg-slate-800 text-white border-slate-900 font-bold";
                    if (isActive) bgColor += " ring-2 ring-[#0b5c92] ring-offset-2 scale-105";
                    
                    return (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentIdx(idx);
                          setShowDaftarSoalMobile(false);
                        }}
                        className={`h-12 rounded-xl border-2 font-mono font-bold text-base flex items-center justify-center select-none ${bgColor} active:scale-90 transition-all shadow-xs`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tombol Tutup */}
              <div className="p-3 bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDaftarSoalMobile(false)}
                  className="w-full py-3 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-extrabold rounded-xl text-sm transition"
                >
                  Tutup Daftar Soal
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI SELESAI UJIAN */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 sm:p-6 text-center relative overflow-hidden flex-shrink-0">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-xl pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-inner ring-4 ring-white/30">
                    <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">Konfirmasi Selesai Ujian</h3>
                  <p className="text-red-100 text-xs sm:text-sm mt-0.5">
                    Apakah Anda yakin ingin mengakhiri sesi ujian ini?
                  </p>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                
                {/* Statistik Jawaban */}
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 text-center">
                  Rekapitulasi Lembar Jawaban
                </p>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
                  {/* Sudah Dijawab */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 sm:p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-800 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                      <span className="text-[11px] sm:text-xs font-bold">Dijawab</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900">{jumlahDijawab}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">dari {totalSoal} soal</p>
                  </div>

                  {/* Ragu-ragu */}
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-2.5 sm:p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-800 mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      <span className="text-[11px] sm:text-xs font-bold">Ragu</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-amber-700">{jumlahRagu}</p>
                    <p className="text-[9px] sm:text-[10px] text-amber-600 font-medium">butir soal</p>
                  </div>

                  {/* Belum Dijawab */}
                  <div className={`border rounded-2xl p-2.5 sm:p-3 text-center ${jumlahBelum > 0 ? 'bg-red-50/80 border-red-200' : 'bg-green-50/80 border-green-200'}`}>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <span className={`w-2 h-2 rounded-full inline-block ${jumlahBelum > 0 ? 'bg-red-500' : 'bg-green-500'}`}></span>
                      <span className={`text-[11px] sm:text-xs font-bold ${jumlahBelum > 0 ? 'text-red-700' : 'text-green-700'}`}>Kosong</span>
                    </div>
                    <p className={`text-xl sm:text-2xl font-black ${jumlahBelum > 0 ? 'text-red-600' : 'text-green-600'}`}>{jumlahBelum}</p>
                    <p className={`text-[9px] sm:text-[10px] font-medium ${jumlahBelum > 0 ? 'text-red-500' : 'text-green-600'}`}>soal belum</p>
                  </div>
                </div>

                {/* Warning / Notification Box */}
                {jumlahBelum > 0 || jumlahRagu > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-3.5 mb-4 sm:mb-5 flex items-start gap-2.5 text-left">
                    <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <strong>Perhatian:</strong> Masih ada{" "}
                      {jumlahBelum > 0 && <span className="font-bold underline text-red-700">{jumlahBelum} soal belum dijawab</span>}
                      {jumlahBelum > 0 && jumlahRagu > 0 && " serta "}
                      {jumlahRagu > 0 && <span className="font-bold underline text-amber-800">{jumlahRagu} soal berstatus ragu-ragu</span>}.
                      Pastikan Anda sudah yakin sebelum mengumpulkan.
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-3.5 mb-4 sm:mb-5 flex items-start gap-2.5 text-left">
                    <span className="text-lg shrink-0 mt-0.5">✅</span>
                    <div className="text-xs text-emerald-900 leading-relaxed font-medium">
                      Luar biasa! Seluruh soal telah Anda jawab dan tidak ada soal yang bertanda ragu-ragu.
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-5 text-center">
                  Setelah menekan tombol konfirmasi, lembar jawaban akan langsung dikirim dan <strong className="text-gray-700">tidak dapat diubah kembali</strong>.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-3 sm:px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold rounded-xl transition text-xs sm:text-sm disabled:opacity-50"
                  >
                    Kembali Periksa
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-3 sm:px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 text-white font-bold rounded-xl transition shadow-lg shadow-red-500/25 text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <span>Ya, Selesaikan! ✔</span>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* MODAL PERINGATAN KECURANGAN */}
        {showCheatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-400 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              
              {/* Header Banner - Warning Theme */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-5 sm:p-6 text-center relative overflow-hidden flex-shrink-0">
                <div className="absolute -right-10 -top-10 w-36 h-36 bg-white/15 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-black/15 rounded-full blur-xl pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-inner ring-4 ring-white/30 animate-pulse">
                    <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span className="inline-block px-3 py-0.5 bg-black/20 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-1">
                    Sistem Anti-Cheat CBT
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">PERINGATAN KECURANGAN!</h3>
                  <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
                    Terdeteksi meninggalkan layar ujian atau membuka aplikasi lain
                  </p>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                
                {/* Visual Strike Progress */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Status Pelanggaran:
                    </span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                      Teguran ke-{cheatCount} dari 3
                    </span>
                  </div>

                  {/* 3 Step Visual Indicators */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`p-2.5 rounded-xl border text-center transition ${cheatCount >= 1 ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <p className="text-xs">⚠️ Teguran 1</p>
                      <p className="text-[10px] mt-0.5">{cheatCount >= 1 ? 'Tercatat' : 'Aman'}</p>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-center transition ${cheatCount >= 2 ? 'bg-orange-100 border-orange-400 text-orange-950 font-bold' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <p className="text-xs">⚠️ Teguran 2</p>
                      <p className="text-[10px] mt-0.5">{cheatCount >= 2 ? 'Tercatat' : 'Siaga'}</p>
                    </div>

                    <div className="p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-center font-bold">
                      <p className="text-xs">🔒 Teguran 3</p>
                      <p className="text-[10px] mt-0.5">Ujian Diblokir</p>
                    </div>
                  </div>
                </div>

                {/* Warning Detail Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">🚨</span>
                    <div className="text-xs text-amber-950 leading-relaxed space-y-1">
                      <p className="font-bold text-sm text-amber-900">
                        Peringatan Penting!
                      </p>
                      <p className="text-amber-800">
                        Sistem mencatat setiap aktivitas meninggalkan tab atau berpindah aplikasi. Jika pelanggaran mencapai <strong className="text-red-700 underline">3 kali</strong>, ujian akan <strong className="text-red-700 underline">otomatis diblokir</strong> dan Anda harus meminta pembukaan blokir ke Proktor.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-center text-xs text-slate-600 font-medium">
                  💡 <em>Tetaplah berada di halaman ini sampai ujian selesai.</em>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={async () => {
                    localStorage.setItem("cbt_show_cheat_modal", "false");
                    setShowCheatModal(false);
                    try {
                      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                      }
                    } catch (e) {}
                  }}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold rounded-2xl transition shadow-lg shadow-orange-500/25 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Saya Mengerti & Kembali ke Soal Ujian</span>
                  <span>➜</span>
                </button>

              </div>

            </div>
          </div>
        )}

        {/* MODAL / OVERLAY KUNCI LAYAR PENUH (ANTI-SPLIT SCREEN) */}
        {examState === "RUNNING" && isNotFullscreen && (
          <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-rose-500 w-full max-w-lg rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-4 border border-rose-500/30 animate-pulse shadow-inner">
                🖥️
              </div>
              <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-400 text-[11px] font-black uppercase tracking-wider rounded-full border border-rose-500/30 mb-2">
                Proteksi Anti-Split Screen & Kiosk
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                MODE LAYAR PENUH (FULLSCREEN) WAJIB DIAKTIFKAN
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                Sistem mendeteksi jendela ujian diperkecil, keluar dari layar penuh, atau Anda sedang membagi layar (Split Screen) untuk membuka jendela atau aplikasi lain. Ujian <strong className="text-rose-400 underline">hanya dapat dikerjakan dalam mode 1 Layar Penuh (Fullscreen)</strong>.
              </p>

              <button
                type="button"
                onClick={async () => {
                  try {
                    if (document.documentElement.requestFullscreen) {
                      await document.documentElement.requestFullscreen();
                    }
                    setIsNotFullscreen(false);
                  } catch (e) {
                    console.error("Gagal fullscreen:", e);
                    setIsNotFullscreen(false);
                  }
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold rounded-2xl shadow-xl shadow-blue-500/30 transition text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>KEMBALIKAN KE MODE LAYAR PENUH (FULLSCREEN)</span>
                <span className="text-lg">⛶</span>
              </button>

              <p className="text-[11px] text-slate-400 mt-4">
                ⚠️ Membagi layar atau mengklik jendela lain akan dicatat sebagai teguran kecurangan.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback state if somehow examState is not matched (should not happen)
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
       <div className="p-4 border-t border-gray-300 bg-gray-50 text-center">
         <button 
           type="button"
           onClick={handleLogout} 
           className="text-sm font-semibold text-red-600 hover:underline cursor-pointer"
         >
           Kembali ke Login
         </button>
       </div>
    </div>
  );
}
