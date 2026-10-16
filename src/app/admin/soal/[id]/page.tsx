import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as XLSX from "xlsx";
import TxtSoalUploader from "@/components/TxtSoalUploader";

// --- Server Actions ---
async function addSoalPG(formData: FormData) {
  "use server";
  const ujianId = formData.get("ujianId") as string;
  const kontenSoal = formData.get("kontenSoal") as string;
  const bobot = parseFloat(formData.get("bobot") as string) || 1.0;
  
  const optA = formData.get("optA") as string;
  const optB = formData.get("optB") as string;
  const optC = formData.get("optC") as string;
  const optD = formData.get("optD") as string;
  const optE = formData.get("optE") as string;
  const kunci = formData.get("kunci") as string;

  if (kontenSoal && ujianId && optA && optB) {
    const opsiJawaban = [
      { id: "A", text: optA, isCorrect: kunci === "A" },
      { id: "B", text: optB, isCorrect: kunci === "B" },
      { id: "C", text: optC, isCorrect: kunci === "C" },
      { id: "D", text: optD, isCorrect: kunci === "D" },
      { id: "E", text: optE, isCorrect: kunci === "E" },
    ].filter(o => o.text !== null && o.text !== ""); 

    await prisma.soal.create({
      data: {
        ujianId,
        tipeSoal: "PG",
        kontenSoal,
        bobot,
        opsiJawaban: JSON.stringify(opsiJawaban),
      },
    });
    revalidatePath(`/admin/soal/${ujianId}`);
  }
}

async function uploadExcelSoal(formData: FormData) {
  "use server";
  const file = formData.get("file") as File;
  const ujianId = formData.get("ujianId") as string;
  if (!file || file.size === 0 || !ujianId) return;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  for (const row of data as any[]) {
    const tipeSoal = String(row["Tipe Soal (PG/ESSAY)"] || "PG").toUpperCase();
    const kontenSoal = String(row["Pertanyaan"] || "");
    const optA = String(row["Opsi A"] || "");
    const optB = String(row["Opsi B"] || "");
    const optC = String(row["Opsi C"] || "");
    const optD = String(row["Opsi D"] || "");
    const optE = String(row["Opsi E"] || "");
    const kunci = String(row["Kunci Jawaban"] || "").toUpperCase();
    const bobot = parseFloat(String(row["Bobot Nilai"] || "1"));

    if (!kontenSoal) continue;

    let opsiJawaban: {id: string, text: string, isCorrect: boolean}[] = [];
    if (tipeSoal === "PG") {
      opsiJawaban = [
        { id: "A", text: optA, isCorrect: kunci === "A" },
        { id: "B", text: optB, isCorrect: kunci === "B" },
        { id: "C", text: optC, isCorrect: kunci === "C" },
        { id: "D", text: optD, isCorrect: kunci === "D" },
        { id: "E", text: optE, isCorrect: kunci === "E" },
      ].filter(o => o.text !== "" && o.text !== "undefined");
    }

    await prisma.soal.create({
      data: {
        ujianId,
        tipeSoal: tipeSoal === "ESSAY" ? "ESSAY" : "PG",
        kontenSoal,
        bobot,
        opsiJawaban: opsiJawaban.length > 0 ? JSON.stringify(opsiJawaban) : null,
      }
    });
  }
  revalidatePath(`/admin/soal/${ujianId}`);
}

async function deleteSoal(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const ujianId = formData.get("ujianId") as string;
  if (id) {
    await prisma.soal.delete({ where: { id } });
    revalidatePath(`/admin/soal/${ujianId}`);
  }
}

async function updatePengaturanUjian(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const judul = formData.get("judul") as string;
  const kkm = parseFloat(formData.get("kkm") as string) || 75.0;
  const durasiMenit = parseInt(formData.get("durasiMenit") as string) || 90;
  const acakSoal = formData.get("acakSoal") === "on";
  const acakOpsi = formData.get("acakOpsi") === "on";

  if (id && judul) {
    await prisma.ujian.update({
      where: { id },
      data: {
        judul,
        kkm,
        durasiMenit,
        acakSoal,
        acakOpsi
      }
    });
    revalidatePath(`/admin/soal/${id}`);
    revalidatePath("/admin/soal");
    revalidatePath(`/admin/hasil/${id}`);
  }
}

export default async function KelolaSoalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const ujian = await prisma.ujian.findUnique({
    where: { id: resolvedParams.id },
    include: {
      mataPelajaran: true,
      soals: { orderBy: { id: "asc" } }
    }
  });

  if (!ujian) return notFound();

  return (
    <div>
      <div className="mb-6 flex items-center space-x-4">
        <Link href="/admin/soal" className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition">
          ← Kembali
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Kelola Soal: {ujian.judul}</h1>
          <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
            <span>Mata Pelajaran: <strong className="text-gray-700">{ujian.mataPelajaran.nama}</strong></span>
            <span>•</span>
            <span>Standar KKM: <strong className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{ujian.kkm ?? 75}</strong></span>
            <span>•</span>
            <span>Durasi: <strong className="text-gray-700">{ujian.durasiMenit} Menit</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Pengaturan Ujian, Upload & Manual */}
        <div className="space-y-6 xl:col-span-1">
          
          {/* Card Pengaturan & KKM Ujian */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <div className="flex items-center space-x-2 mb-4">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg text-lg">⚙️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Pengaturan & KKM</h2>
                <p className="text-xs text-gray-500">Sesuaikan standar kelulusan dan aturan ujian</p>
              </div>
            </div>

            <form action={updatePengaturanUjian} className="space-y-3.5">
              <input type="hidden" name="id" value={ujian.id} />
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Judul Ujian</label>
                <input 
                  type="text" 
                  name="judul" 
                  defaultValue={ujian.judul} 
                  required 
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Standar KKM</label>
                  <input 
                    type="number" 
                    name="kkm" 
                    defaultValue={ujian.kkm ?? 75} 
                    min={0} 
                    max={100} 
                    step="0.5" 
                    required 
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-amber-300 bg-amber-50/50 font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Durasi (Menit)</label>
                  <input 
                    type="number" 
                    name="durasiMenit" 
                    defaultValue={ujian.durasiMenit} 
                    required 
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-1">
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-gray-700">
                  <input type="checkbox" name="acakSoal" defaultChecked={ujian.acakSoal} className="w-3.5 h-3.5 text-blue-600 rounded" />
                  <span>Acak Soal</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-gray-700">
                  <input type="checkbox" name="acakOpsi" defaultChecked={ujian.acakOpsi} className="w-3.5 h-3.5 text-blue-600 rounded" />
                  <span>Acak Opsi</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition shadow-sm"
              >
                Simpan Perubahan KKM
              </button>
            </form>
          </div>

          {/* Upload Excel Card */}
          <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200 h-fit">
            <h2 className="text-xl font-bold text-green-800 mb-2">Upload via Excel</h2>
            <p className="text-sm text-green-700 mb-4">Upload massal ratusan soal dengan format Excel (.xlsx)</p>
            
            <a href="/api/template-soal" className="inline-block w-full text-center bg-white border-2 border-green-600 text-green-700 hover:bg-green-100 font-semibold py-2 px-4 rounded-lg transition mb-4">
              ⬇️ Download Template Soal
            </a>

            <form action={uploadExcelSoal} className="space-y-3">
              <input type="hidden" name="ujianId" value={ujian.id} />
              <input type="file" name="file" accept=".xlsx, .xls, .csv" required className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer" />
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-md">
                ⬆️ Proses Upload Soal
              </button>
            </form>
          </div>

          {/* Upload TXT Component */}
          <TxtSoalUploader ujianId={ujian.id} />

          {/* Form Tambah Manual */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Manual (PG)</h2>
            <form action={addSoalPG} className="space-y-4">
              <input type="hidden" name="ujianId" value={ujian.id} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan</label>
                <textarea
                  name="kontenSoal" required rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  placeholder="Tuliskan pertanyaan di sini..."
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Pilihan Jawaban</label>
                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                  <div key={opt} className="flex items-center space-x-2">
                    <span className="font-bold text-gray-500 w-6">{opt}.</span>
                    <input type="text" name={`opt${opt}`} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 outline-none text-gray-900" placeholder={`Opsi ${opt}`} required={opt === 'A' || opt === 'B'} />
                  </div>
                ))}
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kunci Jawaban</label>
                  <select name="kunci" required className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white outline-none text-gray-900">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bobot Nilai</label>
                  <input type="number" step="0.1" name="bobot" defaultValue="1" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none text-gray-900" />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition mt-4">
                Simpan Soal
              </button>
            </form>
          </div>
        </div>

        {/* Daftar Soal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 xl:col-span-2 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Daftar Soal ({ujian.soals.length})</h2>
          
          <div className="space-y-6">
            {ujian.soals.length === 0 ? (
              <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">Belum ada soal pada ujian ini.</p>
            ) : (
              ujian.soals.map((soal, idx) => {
                const opsi = soal.opsiJawaban ? JSON.parse(soal.opsiJawaban) : [];
                return (
                  <div key={soal.id} className="border border-gray-200 rounded-lg p-4 relative">
                    <form action={deleteSoal} className="absolute top-4 right-4">
                      <input type="hidden" name="id" value={soal.id} />
                      <input type="hidden" name="ujianId" value={ujian.id} />
                      <button type="submit" className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                    </form>
                    
                    <div className="flex items-start space-x-3 mb-3">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded">No. {idx + 1}</span>
                      <p className="text-gray-800 pr-12">{soal.kontenSoal}</p>
                    </div>
                    
                    {soal.tipeSoal === "PG" ? (
                      <div className="pl-12 space-y-1 mt-2">
                        {opsi.map((o: any) => (
                          <div key={o.id} className={`flex items-center space-x-2 text-sm ${o.isCorrect ? 'text-green-700 font-bold bg-green-50 p-1 rounded w-fit' : 'text-gray-600 p-1'}`}>
                            <span>{o.id}.</span>
                            <span>{o.text}</span>
                            {o.isCorrect && <span className="ml-2 text-green-500">✓ Kunci</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pl-12 mt-2">
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">Tipe: ESSAY</span>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      Bobot Nilai: {soal.bobot} | Tipe: {soal.tipeSoal}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
