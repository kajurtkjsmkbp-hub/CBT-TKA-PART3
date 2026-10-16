"use client";

import { useState } from "react";
import { editMapelAction, deleteMapelAction } from "@/app/admin/mapel/actions";

type Mapel = {
  id: string;
  nama: string;
  tingkatKelasId: string;
  jurusanId: string | null;
  tingkatKelas: { tipe: string; level: number };
  jurusan: { nama_jurusan: string } | null;
};

const toRoman = (num: number) => {
  const map: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
    11: 'XI', 12: 'XII'
  };
  return map[num] || num.toString();
};

export default function ClientMapelRow({
  mapel,
  kelasList,
  jurusanList,
}: {
  mapel: Mapel;
  kelasList: any[];
  jurusanList: any[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [nama, setNama] = useState(mapel.nama);
  const [tingkatKelasId, setTingkatKelasId] = useState(mapel.tingkatKelasId);
  const [jurusanId, setJurusanId] = useState(mapel.jurusanId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    await editMapelAction(mapel.id, nama, tingkatKelasId, jurusanId === "" ? null : jurusanId);
    setIsSubmitting(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="border-b border-gray-50 bg-blue-50/30">
        <td className="p-4">
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </td>
        <td className="p-4">
          <select
            value={tingkatKelasId}
            onChange={(e) => setTingkatKelasId(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          >
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.tipe} - {toRoman(k.level)}
              </option>
            ))}
          </select>
        </td>
        <td className="p-4">
          <select
            value={jurusanId}
            onChange={(e) => setJurusanId(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded"
          >
            <option value="">-- Semua Jurusan --</option>
            {jurusanList.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama_jurusan}
              </option>
            ))}
          </select>
        </td>
        <td className="p-4 text-right space-x-2 whitespace-nowrap">
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md text-sm font-medium transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm font-medium transition disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition">
      <td className="p-4 text-gray-800 font-bold">{mapel.nama}</td>
      <td className="p-4 text-gray-600">
        {mapel.tingkatKelas.tipe} - {toRoman(mapel.tingkatKelas.level)}
      </td>
      <td className="p-4">
        {mapel.jurusan ? (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">
            {mapel.jurusan.nama_jurusan}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">Semua Jurusan</span>
        )}
      </td>
      <td className="p-4 text-right space-x-2 flex justify-end">
        <button
          onClick={() => setIsEditing(true)}
          className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm font-medium transition"
        >
          Edit
        </button>
        <button
          onClick={async () => {
            if (confirm("Yakin ingin menghapus mapel ini?")) {
              await deleteMapelAction(mapel.id);
            }
          }}
          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition"
        >
          Hapus
        </button>
      </td>
    </tr>
  );
}
