"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path 
      ? "bg-blue-900/50 text-blue-400 border border-blue-800/50 shadow-md"
      : "hover:bg-gray-800 hover:text-white text-gray-300";
  };

  return (
    <aside className="w-72 bg-[#0f172a] text-gray-300 flex flex-col shadow-2xl z-20">
      <div className="p-6 border-b border-gray-800 flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">
          A
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">CBT Pro</h2>
          <p className="text-xs text-blue-400 font-medium">Portal {isAdmin ? "Administrator" : "Guru"}</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto custom-scrollbar">
        <Link href="/admin" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin")}`}>
          <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="font-medium">Dashboard</span>
        </Link>

        {isAdmin && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Master Data</p>
            </div>
            <Link href="/admin/sekolah" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/sekolah")}`}>
              <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/sekolah" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span className="font-medium">Data Sekolah</span>
            </Link>
            <Link href="/admin/kelas" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/kelas")}`}>
              <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/kelas" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <span className="font-medium">Kelas & Jurusan</span>
            </Link>
            <Link href="/admin/mapel" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/mapel")}`}>
              <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/mapel" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span className="font-medium">Mata Pelajaran</span>
            </Link>
            <Link href="/admin/guru" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/guru")}`}>
              <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/guru" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span className="font-medium">Data Guru</span>
            </Link>
            <Link href="/admin/siswa" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/siswa")}`}>
              <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/siswa" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span className="font-medium">Data Siswa</span>
            </Link>
          </>
        )}

        <div className="pt-6 pb-2">
          <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Bank Soal & Ujian</p>
        </div>
        <Link href="/admin/soal" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/soal")}`}>
          <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/soal" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          <span className="font-medium">Kelola Bank Soal</span>
        </Link>

        <div className="pt-6 pb-2">
          <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Pelaksanaan Ujian</p>
        </div>
        <Link href="/admin/status-tes" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/status-tes")}`}>
          <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/status-tes" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">Status Tes (Token)</span>
        </Link>

        <Link href="/admin/sesi" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/sesi")}`}>
          <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/sesi" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="font-medium">Pengaturan Sesi</span>
        </Link>
        
        <Link href="/admin/monitoring" className={`flex items-center justify-between px-4 py-3 rounded-xl transition group ${isActive("/admin/monitoring")}`}>
          <div className="flex items-center">
            <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/monitoring" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            <span className="font-bold">Live Monitoring</span>
          </div>
          {pathname === "/admin/monitoring" && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          )}
        </Link>

        <div className="pt-6 pb-2">
          <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Laporan & Evaluasi</p>
        </div>
        <Link href="/admin/hasil" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/hasil")}`}>
          <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/hasil" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="font-medium">Hasil & Analitik</span>
        </Link>

        <div className="pt-6 pb-2">
          <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Cetak Dokumen Ujian</p>
        </div>
        <Link href="/cetak-kartu" target="_blank" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/cetak-kartu")}`}>
          <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
          <span className="font-medium">Kartu Peserta Ujian</span>
        </Link>
        <Link href="/cetak-presensi" target="_blank" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/cetak-presensi")}`}>
          <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="font-medium">Daftar Hadir (Presensi)</span>
        </Link>
        <Link href="/cetak-meja" target="_blank" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/cetak-meja")}`}>
          <svg className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          <span className="font-medium">Nomor Meja Komputer</span>
        </Link>

        {isAdmin && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Sistem</p>
            </div>
            <Link href="/admin/pengaturan" className={`flex items-center px-4 py-3 rounded-xl transition group ${isActive("/admin/pengaturan")}`}>
              <svg className={`w-5 h-5 mr-3 transition ${pathname === "/admin/pengaturan" ? "text-blue-400" : "text-gray-400 group-hover:text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="font-medium">Pengaturan</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-6 border-t border-gray-800">
        <a href="/api/logout" className="flex items-center justify-center w-full px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl transition font-bold">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Keluar Sistem
        </a>
      </div>
    </aside>
  );
}
