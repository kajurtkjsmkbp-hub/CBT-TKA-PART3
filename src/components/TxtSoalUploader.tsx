"use client";

import { useState } from "react";
import { saveParsedTxtSoals } from "@/app/admin/soal/[id]/actions";

type ParsedSoal = {
  kontenSoal: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  opsiE: string;
  kunci: string;
};

export default function TxtSoalUploader({ ujianId }: { ujianId: string }) {
  const [parsedSoals, setParsedSoals] = useState<ParsedSoal[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    
    // Split by multiple newlines (empty lines separate questions)
    const blocks = text.split(/\n\s*\n/);
    const results: ParsedSoal[] = [];

    for (const block of blocks) {
      if (!block.trim()) continue;

      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let kontenSoal = "";
      let opsiA = "", opsiB = "", opsiC = "", opsiD = "", opsiE = "";
      let kunci = "";

      for (const line of lines) {
        if (line.match(/^A\.\s+/i)) {
          opsiA = line.replace(/^A\.\s+/i, "").trim();
        } else if (line.match(/^B\.\s+/i)) {
          opsiB = line.replace(/^B\.\s+/i, "").trim();
        } else if (line.match(/^C\.\s+/i)) {
          opsiC = line.replace(/^C\.\s+/i, "").trim();
        } else if (line.match(/^D\.\s+/i)) {
          opsiD = line.replace(/^D\.\s+/i, "").trim();
        } else if (line.match(/^E\.\s+/i)) {
          opsiE = line.replace(/^E\.\s+/i, "").trim();
        } else if (line.match(/^Jawaban\s*:\s*[A-E]/i)) {
          kunci = line.match(/^Jawaban\s*:\s*([A-E])/i)?.[1]?.toUpperCase() || "";
        } else {
          // If it's none of the above, it's part of the question text
          kontenSoal += (kontenSoal ? "\n" : "") + line;
        }
      }

      if (kontenSoal) {
        results.push({ kontenSoal, opsiA, opsiB, opsiC, opsiD, opsiE, kunci });
      }
    }

    setParsedSoals(results);
    setIsReviewing(true);
  };

  const submitToDatabase = async () => {
    setIsSubmitting(true);
    try {
      await saveParsedTxtSoals(ujianId, parsedSoals);
      alert("Berhasil menyimpan " + parsedSoals.length + " soal!");
      setParsedSoals([]);
      setIsReviewing(false);
    } catch (e) {
      alert("Terjadi kesalahan saat menyimpan soal.");
      console.error(e);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-green-50 p-6 rounded-xl border border-green-200 mt-6 shadow-sm">
      <h3 className="text-lg font-bold text-green-800 mb-2">Upload via TXT (Review Mode)</h3>
      <p className="text-sm text-green-700 mb-4">
        Upload file .txt dengan format:<br/>
        <code>Pertanyaan<br/>A. Opsi<br/>B. Opsi<br/>...<br/>Jawaban : A</code>
      </p>

      {!isReviewing ? (
        <div>
          <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition inline-block">
            Pilih File .txt
            <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h4 className="font-bold text-gray-700">Preview ({parsedSoals.length} Soal ditemukan)</h4>
            <div>
              <button 
                onClick={() => { setParsedSoals([]); setIsReviewing(false); }}
                className="text-gray-500 hover:text-gray-700 mr-4 text-sm font-bold"
              >
                Batal
              </button>
              <button 
                onClick={submitToDatabase}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan ke Database"}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4">
            {parsedSoals.map((soal, idx) => (
              <div key={idx} className="p-3 bg-gray-50 border rounded text-sm">
                <p className="font-bold mb-2 whitespace-pre-wrap">{idx + 1}. {soal.kontenSoal}</p>
                {soal.opsiA && <p>A. {soal.opsiA}</p>}
                {soal.opsiB && <p>B. {soal.opsiB}</p>}
                {soal.opsiC && <p>C. {soal.opsiC}</p>}
                {soal.opsiD && <p>D. {soal.opsiD}</p>}
                {soal.opsiE && <p>E. {soal.opsiE}</p>}
                <p className="mt-2 text-blue-600 font-bold">Kunci: {soal.kunci}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
