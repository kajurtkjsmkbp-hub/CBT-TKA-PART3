"use client";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="bg-white text-indigo-700 px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-100 flex items-center transition"
    >
      <span className="text-xl mr-2">🖨️</span> Cetak / Simpan PDF
    </button>
  );
}
