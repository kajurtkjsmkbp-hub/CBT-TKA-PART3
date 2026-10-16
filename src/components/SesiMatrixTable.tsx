"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { updateSingleSiswaSesi, bulkSaveAllSiswaSesi, batchUpdateSiswaSesi } from "@/app/admin/sesi/actions";

export interface SiswaSesiItem {
  id: string;
  nama: string;
  email_username: string;
  password?: string;
  foto?: string | null;
  sekolahNama?: string | null;
  rombelLabel: string;
  rombelId: string | null;
  gelombang: number;
  sesiHari1: number;
  sesiHari2: number;
  sesiHari3: number;
  sesiHari4: number;
  ruang: string;
}

export interface PengaturanInfo {
  jamSesi1: string;
  jamSesi2: string;
  jamSesi3: string;
  tglHari1: string;
  tglHari2: string;
  tglHari3: string;
  tglHari4: string;
  namaSekolah: string;
  logoSekolah: string;
}

interface SesiMatrixTableProps {
  initialSiswa: SiswaSesiItem[];
  rombelList: Array<{ id: string; label: string }>;
  pengaturanInfo?: PengaturanInfo;
}

export default function SesiMatrixTable({ initialSiswa, rombelList, pengaturanInfo }: SesiMatrixTableProps) {
  const [data, setData] = useState<SiswaSesiItem[]>(initialSiswa);
  const [originalData, setOriginalData] = useState<SiswaSesiItem[]>(initialSiswa);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [filterGelombang, setFilterGelombang] = useState("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Bulk action state
  const [bulkGelombang, setBulkGelombang] = useState<number>(1);
  const [bulkPreset, setBulkPreset] = useState<string>("ROTASI_1");
  const [bulkRuang, setBulkRuang] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          showToast("File Excel kosong atau format tidak sesuai.", "error");
          return;
        }

        const header = rows[0].map((h: any) => String(h || "").trim().toLowerCase());
        const nisIdx = header.findIndex((h) => h.includes("nis") || h.includes("username"));
        const gelIdx = header.findIndex((h) => h.includes("gelombang"));
        const h1Idx = header.findIndex((h) => h.includes("sesi hari 1") || h.includes("sesi 1") || h.includes("h1"));
        const h2Idx = header.findIndex((h) => h.includes("sesi hari 2") || h.includes("sesi 2") || h.includes("h2"));
        const h3Idx = header.findIndex((h) => h.includes("sesi hari 3") || h.includes("sesi 3") || h.includes("h3"));
        const h4Idx = header.findIndex((h) => h.includes("sesi hari 4") || h.includes("sesi 4") || h.includes("h4"));
        const ruangIdx = header.findIndex((h) => h.includes("ruang"));

        if (nisIdx === -1) {
          showToast("Kolom 'NIS / Username' tidak ditemukan di file Excel.", "error");
          return;
        }

        let matchedCount = 0;
        const excelMap = new Map();
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[nisIdx]) continue;
          const nis = String(row[nisIdx]).trim();
          excelMap.set(nis, {
            gelombang: gelIdx !== -1 && row[gelIdx] ? parseInt(row[gelIdx]) : undefined,
            sesiHari1: h1Idx !== -1 && row[h1Idx] ? parseInt(row[h1Idx]) : undefined,
            sesiHari2: h2Idx !== -1 && row[h2Idx] ? parseInt(row[h2Idx]) : undefined,
            sesiHari3: h3Idx !== -1 && row[h3Idx] ? parseInt(row[h3Idx]) : undefined,
            sesiHari4: h4Idx !== -1 && row[h4Idx] ? parseInt(row[h4Idx]) : undefined,
            ruang: ruangIdx !== -1 && row[ruangIdx] ? String(row[ruangIdx]).trim() : undefined,
          });
        }

        setData((prev) =>
          prev.map((siswa) => {
            const update = excelMap.get(siswa.email_username);
            if (update) {
              matchedCount++;
              return {
                ...siswa,
                gelombang: update.gelombang !== undefined && !isNaN(update.gelombang) ? update.gelombang : siswa.gelombang,
                sesiHari1: update.sesiHari1 !== undefined && !isNaN(update.sesiHari1) ? update.sesiHari1 : siswa.sesiHari1,
                sesiHari2: update.sesiHari2 !== undefined && !isNaN(update.sesiHari2) ? update.sesiHari2 : siswa.sesiHari2,
                sesiHari3: update.sesiHari3 !== undefined && !isNaN(update.sesiHari3) ? update.sesiHari3 : siswa.sesiHari3,
                sesiHari4: update.sesiHari4 !== undefined && !isNaN(update.sesiHari4) ? update.sesiHari4 : siswa.sesiHari4,
                ruang: update.ruang ? update.ruang : siswa.ruang,
              };
            }
            return siswa;
          })
        );

        showToast(`Berhasil membaca ${matchedCount} data siswa dari Excel. Silakan klik "Simpan Semua".`, "success");
      } catch (err: any) {
        console.error(err);
        showToast("Gagal membaca file Excel. Pastikan format valid.", "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Cek baris yang mengalami modifikasi
  const modifiedMap = useMemo(() => {
    const map = new Set<string>();
    const originalMap = new Map(originalData.map((s) => [s.id, s]));

    for (const item of data) {
      const orig = originalMap.get(item.id);
      if (orig) {
        if (
          orig.gelombang !== item.gelombang ||
          orig.sesiHari1 !== item.sesiHari1 ||
          orig.sesiHari2 !== item.sesiHari2 ||
          orig.sesiHari3 !== item.sesiHari3 ||
          orig.sesiHari4 !== item.sesiHari4 ||
          orig.ruang !== item.ruang
        ) {
          map.add(item.id);
        }
      }
    }
    return map;
  }, [data, originalData]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.email_username.toLowerCase().includes(search.toLowerCase());
      const matchRombel = !filterRombel || item.rombelId === filterRombel;
      const matchGelombang = !filterGelombang || String(item.gelombang) === filterGelombang;
      return matchSearch && matchRombel && matchGelombang;
    });
  }, [data, search, filterRombel, filterGelombang]);

  // Handler cell change
  const handleCellChange = (id: string, field: keyof SiswaSesiItem, value: any) => {
    setData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Simpan satu baris
  const handleSaveRow = (item: SiswaSesiItem) => {
    startTransition(async () => {
      const res = await updateSingleSiswaSesi(item.id, {
        gelombang: item.gelombang,
        sesiHari1: item.sesiHari1,
        sesiHari2: item.sesiHari2,
        sesiHari3: item.sesiHari3,
        sesiHari4: item.sesiHari4,
        ruang: item.ruang,
      });

      if (res.success) {
        setOriginalData((prev) => prev.map((s) => (s.id === item.id ? { ...item } : s)));
        showToast(`Sesi "${item.nama}" berhasil disimpan.`, "success");
      } else {
        showToast(res.message || "Gagal menyimpan.", "error");
      }
    });
  };

  // Simpan semua baris yang dimodifikasi
  const handleSaveAll = () => {
    if (modifiedMap.size === 0) return;
    const modifiedItems = data.filter((item) => modifiedMap.has(item.id));

    startTransition(async () => {
      const res = await bulkSaveAllSiswaSesi(
        modifiedItems.map((item) => ({
          id: item.id,
          gelombang: item.gelombang,
          sesiHari1: item.sesiHari1,
          sesiHari2: item.sesiHari2,
          sesiHari3: item.sesiHari3,
          sesiHari4: item.sesiHari4,
          ruang: item.ruang,
        }))
      );

      if (res.success) {
        setOriginalData([...data]);
        showToast(`Berhasil menyimpan perubahan pada ${res.count} siswa.`, "success");
      } else {
        showToast(res.message || "Gagal menyimpan semua.", "error");
      }
    });
  };

  // Terapkan preset massal ke siswa terpilih
  const handleApplyPreset = () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : filteredData.map((s) => s.id);
    if (targetIds.length === 0) {
      showToast("Tidak ada siswa yang dipilih atau ditampilkan.", "error");
      return;
    }

    let h1 = 1,
      h2 = 1,
      h3 = 1,
      h4 = 1;
    if (bulkPreset === "ROTASI_1") {
      h1 = 1;
      h2 = 2;
      h3 = 1;
      h4 = 2;
    } else if (bulkPreset === "ROTASI_2") {
      h1 = 2;
      h2 = 1;
      h3 = 2;
      h4 = 1;
    } else if (bulkPreset === "ALL_1") {
      h1 = 1;
      h2 = 1;
      h3 = 1;
      h4 = 1;
    } else if (bulkPreset === "ALL_2") {
      h1 = 2;
      h2 = 2;
      h3 = 2;
      h4 = 2;
    } else if (bulkPreset === "ALL_3") {
      h1 = 3;
      h2 = 3;
      h3 = 3;
      h4 = 3;
    }

    setData((prev) =>
      prev.map((item) => {
        if (targetIds.includes(item.id)) {
          return {
            ...item,
            gelombang: bulkGelombang,
            sesiHari1: h1,
            sesiHari2: h2,
            sesiHari3: h3,
            sesiHari4: h4,
            ruang: bulkRuang.trim() !== "" ? bulkRuang.trim() : item.ruang,
          };
        }
        return item;
      })
    );

    showToast(`Pola diterapkan ke ${targetIds.length} siswa. Klik "Simpan Semua" untuk memvalidasi ke DB.`, "success");
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* TOAST ALERT */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOOLBAR & BULK ACTIONS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">⚙</span>
              Atur Sesi & Gelombang Massal (Standar TKA / ANBK)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Terapkan pola rotasi sesi atau gelombang ke banyak siswa sekaligus untuk efisiensi proktor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden file input for Excel upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />

            <a
              href="/api/export-sesi"
              download="Data_Pembagian_Sesi_TKA.xlsx"
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition flex items-center gap-1.5"
              title="Download file Excel pembagian sesi saat ini"
            >
              <span>📤</span> Export Excel
            </a>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Upload file Excel untuk update sesi siswa otomatis"
            >
              <span>📥</span> Import Excel
            </button>

            {modifiedMap.size > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl animate-pulse">
                {modifiedMap.size} baris belum disimpan
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={isPending || modifiedMap.size === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 ${
                modifiedMap.size > 0
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 shadow-lg cursor-pointer"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
            >
              {isPending ? (
                <span className="inline-block animate-spin mr-1">⌛</span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span>Simpan Semua ({modifiedMap.size})</span>
            </button>
          </div>
        </div>

        {/* BULK GENERATOR FORM */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Gelombang:</span>
            <select
              value={bulkGelombang}
              onChange={(e) => setBulkGelombang(Number(e.target.value))}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold outline-none text-slate-800"
            >
              <option value={1}>Gelombang 1</option>
              <option value={2}>Gelombang 2</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Pola Sesi H1-H4:</span>
            <select
              value={bulkPreset}
              onChange={(e) => setBulkPreset(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold outline-none text-slate-800"
            >
              <option value="ROTASI_1">Rotasi Standar: 1 - 2 - 1 - 2</option>
              <option value="ROTASI_2">Rotasi Silang: 2 - 1 - 2 - 1</option>
              <option value="ALL_1">Semua Sesi 1 (1 - 1 - 1 - 1)</option>
              <option value="ALL_2">Semua Sesi 2 (2 - 2 - 2 - 2)</option>
              <option value="ALL_3">Semua Sesi 3 (3 - 3 - 3 - 3)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Ruang (Opsional):</span>
            <input
              type="text"
              placeholder="Contoh: Lab 1"
              value={bulkRuang}
              onChange={(e) => setBulkRuang(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 w-32 outline-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyPreset}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <span>⚡ Terapkan ke {selectedIds.length > 0 ? `${selectedIds.length} Siswa Terpilih` : "Semua Baris"}</span>
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Cari nama atau NISN / Username siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-slate-800"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterRombel}
              onChange={(e) => setFilterRombel(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-700 font-medium"
            >
              <option value="">Semua Rombel / Kelas</option>
              {rombelList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>

            <select
              value={filterGelombang}
              onChange={(e) => setFilterGelombang(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-700 font-medium"
            >
              <option value="">Semua Gelombang</option>
              <option value="1">Gelombang 1</option>
              <option value="2">Gelombang 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE MATRIKS SESI (STANDAR ANBK / TKA) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* ROW 1: HEADER GROUP */}
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                <th rowSpan={2} className="px-4 py-3 text-center w-12 border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200">
                  Siswa & Rombel
                </th>
                <th rowSpan={2} className="px-4 py-3 text-center border-r border-slate-200 min-w-[170px] w-44 bg-slate-100">
                  Gelombang
                </th>
                <th colSpan={4} className="px-4 py-2 text-center border-r border-slate-200 bg-slate-200/70 text-slate-700">
                  Sesi Pada Hari Ke
                </th>
                <th rowSpan={2} className="px-4 py-3 text-center border-r border-slate-200 min-w-[130px] w-36">
                  Ruang
                </th>
                <th rowSpan={2} className="px-4 py-3 text-center w-24">
                  Aksi
                </th>
              </tr>
              {/* ROW 2: SUB-COLUMNS HARI 1, 2, 3, 4 */}
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
                <th className="px-3 py-2 text-center border-r border-slate-200 w-16 bg-slate-50">1</th>
                <th className="px-3 py-2 text-center border-r border-slate-200 w-16 bg-slate-50">2</th>
                <th className="px-3 py-2 text-center border-r border-slate-200 w-16 bg-slate-50">3</th>
                <th className="px-3 py-2 text-center border-r border-slate-200 w-16 bg-slate-50">4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const isModified = modifiedMap.has(item.id);
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isModified
                          ? "bg-amber-50/70 hover:bg-amber-100/50"
                          : isSelected
                          ? "bg-blue-50/50 hover:bg-blue-100/40"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* CHECKBOX */}
                      <td className="px-4 py-2.5 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* SISWA & ROMBEL */}
                      <td className="px-4 py-2.5 border-r border-slate-200">
                        <div className="font-bold text-slate-900 leading-tight">{item.nama}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{item.email_username}</span>
                          <span>•</span>
                          <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                            {item.rombelLabel}
                          </span>
                        </div>
                      </td>

                      {/* GELOMBANG */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 min-w-[170px]">
                        <select
                          value={item.gelombang}
                          onChange={(e) => handleCellChange(item.id, "gelombang", Number(e.target.value))}
                          className="w-full min-w-[150px] text-center py-1.5 pl-3 pr-7 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer text-xs shadow-xs"
                        >
                          <option value={1}>Gelombang 1</option>
                          <option value={2}>Gelombang 2</option>
                        </select>
                      </td>

                      {/* SESI HARI 1 */}
                      <td className="px-2 py-2 text-center border-r border-slate-200">
                        <select
                          value={item.sesiHari1}
                          onChange={(e) => handleCellChange(item.id, "sesiHari1", Number(e.target.value))}
                          className="w-12 text-center py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer mx-auto block"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </td>

                      {/* SESI HARI 2 */}
                      <td className="px-2 py-2 text-center border-r border-slate-200">
                        <select
                          value={item.sesiHari2}
                          onChange={(e) => handleCellChange(item.id, "sesiHari2", Number(e.target.value))}
                          className="w-12 text-center py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer mx-auto block"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </td>

                      {/* SESI HARI 3 */}
                      <td className="px-2 py-2 text-center border-r border-slate-200">
                        <select
                          value={item.sesiHari3}
                          onChange={(e) => handleCellChange(item.id, "sesiHari3", Number(e.target.value))}
                          className="w-12 text-center py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer mx-auto block"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </td>

                      {/* SESI HARI 4 */}
                      <td className="px-2 py-2 text-center border-r border-slate-200">
                        <select
                          value={item.sesiHari4}
                          onChange={(e) => handleCellChange(item.id, "sesiHari4", Number(e.target.value))}
                          className="w-12 text-center py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer mx-auto block"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </td>

                      {/* RUANG */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 min-w-[130px]">
                        <input
                          type="text"
                          value={item.ruang}
                          onChange={(e) => handleCellChange(item.id, "ruang", e.target.value)}
                          className="w-full min-w-[115px] text-center py-1.5 px-3 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none focus:border-blue-500 text-xs shadow-xs"
                        />
                      </td>

                      {/* AKSI SIMPAN PER BARIS */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(item)}
                          disabled={!isModified || isPending}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                            isModified
                              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
                              : "bg-slate-100 text-slate-400 cursor-default"
                          }`}
                        >
                          Simpan
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
