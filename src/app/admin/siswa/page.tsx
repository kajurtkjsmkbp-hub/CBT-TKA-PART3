import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import * as XLSX from "xlsx";

import fs from "fs";
import path from "path";

// Helper: angka ke romawi
function toRomawi(n: number): string {
  const map: Record<number, string> = { 10: "X", 11: "XI", 12: "XII", 13: "XIII", 7: "VII", 8: "VIII", 9: "IX" };
  return map[n] || String(n);
}

// Helper: format label rombel
function formatRombel(r: any): string {
  if (!r) return "-";
  return r.jurusan
    ? `${toRomawi(r.tingkatKelas?.level ?? 10)} ${r.jurusan.nama_jurusan} ${r.nomorKelas}`
    : `${r.tingkatKelas?.tipe ?? "Kelas"} ${toRomawi(r.tingkatKelas?.level ?? 10)} ${r.nomorKelas}`;
}

// --- Server Actions ---
async function addSiswa(formData: FormData) {
  "use server";
  const nama = formData.get("nama") as string;
  const email_username = formData.get("email_username") as string;
  const password = formData.get("password") as string;
  const sekolahId = formData.get("sekolahId") as string;
  const rombelId = formData.get("rombelId") as string;
  const sesi = parseInt((formData.get("sesi") as string) || "1");
  const ruang = (formData.get("ruang") as string) || "Ruang 1";
  const gelombang = parseInt((formData.get("gelombang") as string) || "1");

  // Jika rombel dipilih, ambil tingkatKelasId & jurusanId dari rombel
  let tingkatKelasId: string | null = null;
  let jurusanId: string | null = null;
  if (rombelId) {
    const rombel = await prisma.rombel.findUnique({ where: { id: rombelId } });
    if (rombel) {
      tingkatKelasId = rombel.tingkatKelasId;
      jurusanId = rombel.jurusanId;
    }
  }
  
  let fotoPath = null;
  const fotoFile = formData.get("foto") as File;
  if (fotoFile && fotoFile.size > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "siswa");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const ext = fotoFile.name.split('.').pop();
    const fileName = `siswa_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await fotoFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    fotoPath = `/uploads/siswa/${fileName}`;
  }

  if (nama && email_username && password) {
    await prisma.user.create({
      data: {
        nama,
        email_username,
        password, 
        role: "SISWA",
        sekolahId: sekolahId || null,
        tingkatKelasId,
        jurusanId,
        rombelId: rombelId || null,
        sesi,
        ruang,
        gelombang,
        sesiHari1: sesi,
        sesiHari2: sesi,
        sesiHari3: sesi,
        sesiHari4: sesi,
        foto: fotoPath,
      },
    });
    revalidatePath("/admin/siswa");
  }
}


async function uploadExcelSiswa(formData: FormData) {
  "use server";
  const file = formData.get("file") as File;
  if (!file || file.size === 0) return;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);
  
  const sekolahs = await prisma.sekolah.findMany();
  const kelas = await prisma.tingkatKelas.findMany();
  const jurusans = await prisma.jurusan.findMany();
  let rombels = await prisma.rombel.findMany({
    include: { tingkatKelas: true, jurusan: true }
  });

  const normalizeStr = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const row of data as any[]) {
    // Tangani kemungkinan variasi nama header (Format Baru & Lama)
    const nama = row["Nama Lengkap"] || row["Nama"] || row["nama"];
    const rawNIS = row["NIS / Username"] || row["NIS/Username"] || row["NIS"] || row["Username"] || row["nis"];
    if (!nama || !rawNIS) continue;

    const email_username = String(rawNIS).trim();
    const rawPassword = row["Password"] || row["password"];
    const password = rawPassword !== undefined && rawPassword !== null && String(rawPassword).trim() !== "" 
      ? String(rawPassword).trim() 
      : email_username;

    // Sekolah matching
    const namaSekolah = row["Asal Sekolah"] || row["Nama Sekolah"] || row["Sekolah"] || "";
    let matchedSekolah = sekolahs.find(s => normalizeStr(s.nama) === normalizeStr(String(namaSekolah)));
    if (!matchedSekolah && sekolahs.length === 1) {
      matchedSekolah = sekolahs[0];
    }

    // Sesi, Gelombang & Ruang
    const rawGel = row["Gelombang"] || row["gelombang"] || "1";
    const parsedGel = parseInt(String(rawGel || "1"));
    const gelombang = isNaN(parsedGel) ? 1 : parsedGel;

    const rawSesi = row["Sesi Ujian (1/2/3)"] || row["Sesi Ujian"] || row["Sesi"] || row["sesi"];
    const parsedSesi = parseInt(String(rawSesi || "1"));
    const sesi = isNaN(parsedSesi) ? 1 : parsedSesi;

    const rawS1 = row["Sesi Hari 1"] || row["Sesi H1"] || row["sesiHari1"] || sesi;
    const rawS2 = row["Sesi Hari 2"] || row["Sesi H2"] || row["sesiHari2"] || sesi;
    const rawS3 = row["Sesi Hari 3"] || row["Sesi H3"] || row["sesiHari3"] || sesi;
    const rawS4 = row["Sesi Hari 4"] || row["Sesi H4"] || row["sesiHari4"] || sesi;

    const sesiHari1 = parseInt(String(rawS1 || "1")) || 1;
    const sesiHari2 = parseInt(String(rawS2 || "1")) || 1;
    const sesiHari3 = parseInt(String(rawS3 || "1")) || 1;
    const sesiHari4 = parseInt(String(rawS4 || "1")) || 1;

    const rawRuang = row["Ruang Ujian"] || row["Ruang"] || row["ruang"] || "Ruang 1";
    const ruang = String(rawRuang).trim() || "Ruang 1";

    // Rombel & Kelas matching
    const rombelInput = String(row["Rombel / Kelas"] || row["Rombel"] || row["Kelas"] || "").trim();
    let matchedRombel: any = null;
    let tingkatKelasId: string | null = null;
    let jurusanId: string | null = null;

    if (rombelInput) {
      const normInput = normalizeStr(rombelInput);

      // 1. Cek match langsung terhadap format standard Rombel terdaftar
      matchedRombel = rombels.find(r => {
        const fullLabel = formatRombel(r);
        if (normalizeStr(fullLabel) === normInput) return true;

        if (r.jurusan) {
          const initials = r.jurusan.nama_jurusan
            .split(/\s+/)
            .map((w: string) => w[0])
            .join("");
          const shortLabel1 = `${toRomawi(r.tingkatKelas?.level ?? 10)} ${initials} ${r.nomorKelas}`;
          const shortLabel2 = `${r.tingkatKelas?.level ?? 10} ${initials} ${r.nomorKelas}`;
          const numLabel = `${r.tingkatKelas?.level ?? 10} ${r.jurusan.nama_jurusan} ${r.nomorKelas}`;
          if (normalizeStr(shortLabel1) === normInput || normalizeStr(shortLabel2) === normInput || normalizeStr(numLabel) === normInput) {
            return true;
          }
        }
        return false;
      });

      // 2. Jika belum cocok, auto-detect tingkat kelas dan jurusan
      if (!matchedRombel) {
        let detectedLevel: number | null = null;
        if (/\b(xii|12)\b/i.test(rombelInput)) detectedLevel = 12;
        else if (/\b(xi|11)\b/i.test(rombelInput)) detectedLevel = 11;
        else if (/\b(xiii|13)\b/i.test(rombelInput)) detectedLevel = 13;
        else if (/\b(x|10)\b/i.test(rombelInput)) detectedLevel = 10;
        else if (/\b(ix|9)\b/i.test(rombelInput)) detectedLevel = 9;
        else if (/\b(viii|8)\b/i.test(rombelInput)) detectedLevel = 8;
        else if (/\b(vii|7)\b/i.test(rombelInput)) detectedLevel = 7;

        const matchedJ = jurusans.find(j => {
          const normJ = normalizeStr(j.nama_jurusan);
          if (normInput.includes(normJ)) return true;
          const initials = j.nama_jurusan.split(/\s+/).map((w: string) => w[0]).join("").toLowerCase();
          return initials.length >= 2 && new RegExp(`\\b${initials}\\b`, 'i').test(rombelInput);
        });

        const matchNum = rombelInput.match(/(\d+|[A-Z])$/i);
        const detectedNomor = matchNum ? matchNum[1].toUpperCase() : "1";

        const matchedK = detectedLevel ? kelas.find(k => k.level === detectedLevel) : null;

        if (matchedK) {
          tingkatKelasId = matchedK.id;
          jurusanId = matchedJ?.id || null;

          matchedRombel = rombels.find(r => 
            r.tingkatKelasId === tingkatKelasId && 
            r.jurusanId === jurusanId && 
            r.nomorKelas.toLowerCase() === detectedNomor.toLowerCase()
          );

          if (!matchedRombel) {
            try {
              matchedRombel = await prisma.rombel.create({
                data: {
                  tingkatKelasId: matchedK.id,
                  jurusanId: matchedJ?.id || null,
                  nomorKelas: detectedNomor,
                },
                include: { tingkatKelas: true, jurusan: true }
              });
              rombels.push(matchedRombel);
            } catch (e) {
              console.error("Gagal auto-create rombel:", e);
            }
          }
        }
      }

      if (matchedRombel) {
        tingkatKelasId = matchedRombel.tingkatKelasId;
        jurusanId = matchedRombel.jurusanId;
      }
    }

    // Fallback format lama (Level Kelas, Tipe Kelas, Nama Jurusan)
    if (!tingkatKelasId && row["Level Kelas"]) {
      const level_kelas = String(row["Level Kelas"]);
      const tipe_kelas = row["Tipe Kelas (SD/SMP/SMA)"];
      const nama_jurusan = row["Nama Jurusan (Kosongkan jika tidak ada)"];

      const matchedKelas = kelas.find(k => k.level === parseInt(level_kelas) && (!tipe_kelas || k.tipe === tipe_kelas));
      const matchedJurusan = nama_jurusan ? jurusans.find(j => normalizeStr(j.nama_jurusan) === normalizeStr(String(nama_jurusan))) : null;

      tingkatKelasId = matchedKelas?.id || null;
      jurusanId = matchedJurusan?.id || null;
    }

    try {
      await prisma.user.upsert({
        where: { email_username },
        update: {
          nama: String(nama).trim(),
          password,
          role: "SISWA",
          sekolahId: matchedSekolah?.id || null,
          tingkatKelasId,
          jurusanId,
          rombelId: matchedRombel?.id || null,
          sesi,
          ruang,
          gelombang,
          sesiHari1,
          sesiHari2,
          sesiHari3,
          sesiHari4,
        },
        create: {
          nama: String(nama).trim(),
          email_username,
          password,
          role: "SISWA",
          sekolahId: matchedSekolah?.id || null,
          tingkatKelasId,
          jurusanId,
          rombelId: matchedRombel?.id || null,
          sesi,
          ruang,
          gelombang,
          sesiHari1,
          sesiHari2,
          sesiHari3,
          sesiHari4,
        },
      });
    } catch (error) {
      console.error("Gagal menyimpan siswa:", email_username, error);
    }
  }

  revalidatePath("/admin/siswa");
}

async function deleteSiswa(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  if (id) {
    // Hapus hasil ujian (child) terlebih dahulu untuk menghindari Foreign Key Constraint error
    await prisma.hasilUjian.deleteMany({ where: { siswaId: id } });
    await prisma.user.delete({ where: { id } });
    revalidatePath("/admin/siswa");
  }
}

import { redirect } from "next/navigation";

async function editSiswa(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const nama = formData.get("nama") as string;
  const email_username = formData.get("email_username") as string;
  const password = formData.get("password") as string;
  const sekolahId = formData.get("sekolahId") as string;
  const rombelId = formData.get("rombelId") as string;
  const sesi = parseInt((formData.get("sesi") as string) || "1");
  const ruang = (formData.get("ruang") as string) || "Ruang 1";
  const gelombang = parseInt((formData.get("gelombang") as string) || "1");

  if (!id) return;

  // Jika rombel dipilih, ambil tingkatKelasId & jurusanId dari rombel
  let tingkatKelasId: string | null = null;
  let jurusanId: string | null = null;
  if (rombelId) {
    const rombel = await prisma.rombel.findUnique({ where: { id: rombelId } });
    if (rombel) {
      tingkatKelasId = rombel.tingkatKelasId;
      jurusanId = rombel.jurusanId;
    }
  }

  const updateData: any = {
    nama,
    email_username,
    sekolahId: sekolahId || null,
    tingkatKelasId,
    jurusanId,
    rombelId: rombelId || null,
    sesi,
    ruang,
    gelombang,
  };

  if (password) {
    updateData.password = password;
  }

  let fotoPath = null;
  const fotoFile = formData.get("foto") as File;
  if (fotoFile && fotoFile.size > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "siswa");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const ext = fotoFile.name.split('.').pop();
    const fileName = `siswa_edit_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await fotoFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    fotoPath = `/uploads/siswa/${fileName}`;
    updateData.foto = fotoPath;
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin/siswa");
  redirect("/admin/siswa");
}

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};



export default async function DataSiswaPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const sekolahList = await prisma.sekolah.findMany({ orderBy: { nama: "asc" } });
  const kelasList = await prisma.tingkatKelas.findMany({ orderBy: [{ tipe: "asc" }, { level: "asc" }] });
  const jurusanList = await prisma.jurusan.findMany({ orderBy: { nama_jurusan: "asc" } });
  const rombelList = await prisma.rombel.findMany({
    include: { tingkatKelas: true, jurusan: true },
    orderBy: [
      { tingkatKelas: { level: "asc" } },
      { nomorKelas: "asc" },
    ],
  });

  const siswaList = await prisma.user.findMany({
    where: { role: "SISWA" },
    include: { sekolah: true, tingkatKelas: true, jurusan: true, rombel: { include: { tingkatKelas: true, jurusan: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Data Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data peserta ujian, rombel, dan pembagian sesi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link 
            href="/admin/sesi"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-lg transition shadow-sm flex items-center gap-2 text-sm"
          >
            <span>⚙️ Pengaturan Sesi & Gelombang (TKA)</span>
          </Link>
          <Link 
            href="/cetak-kartu"
            target="_blank"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-lg transition shadow-sm flex items-center gap-2 text-sm"
          >
            <span>🖨️ Cetak Kartu</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Form Tambah & Upload Excel */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Upload Excel Card */}
          <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200 h-fit">
            <h2 className="text-xl font-bold text-green-800 mb-2">Upload via Excel</h2>
            <p className="text-sm text-green-700 mb-4">Tambahkan data secara massal menggunakan format yang disediakan.</p>
            
            <a href="/api/template-siswa" className="inline-block w-full text-center bg-white border-2 border-green-600 text-green-700 hover:bg-green-100 font-semibold py-2 px-4 rounded-lg transition mb-4">
              ⬇️ Download Format Baku
            </a>

            <form action={uploadExcelSiswa} className="space-y-3">
              <input type="file" name="file" accept=".xlsx, .xls, .csv" required className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer" />
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-md">
                ⬆️ Proses Upload Excel
              </button>
            </form>
          </div>

          {/* Form Tambah Manual */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Manual</h2>
            <form action={addSiswa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input type="text" name="nama" required placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / NIS</label>
                <input type="text" name="email_username" required placeholder="123456789"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" name="password" required placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto (Opsional)</label>
                <input type="file" name="foto" accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah</label>
                <select name="sekolahId" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Pilih Sekolah...</option>
                  {sekolahList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rombel (Kelas)</label>
                <select name="rombelId" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Pilih Rombel...</option>
                  {rombelList.map(r => (
                    <option key={r.id} value={r.id}>
                      {formatRombel(r)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gelombang</label>
                  <select name="gelombang" required className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                    <option value="1">Gel. 1</option>
                    <option value="2">Gel. 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sesi Ujian</label>
                  <select name="sesi" required className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                    <option value="1">Sesi 1</option>
                    <option value="2">Sesi 2</option>
                    <option value="3">Sesi 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruang</label>
                  <input type="text" name="ruang" required defaultValue="Ruang 1"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition mt-4">
                Simpan Data Siswa
              </button>
            </form>
          </div>
        </div>

        {/* Tabel Data Siswa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Siswa</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Sekolah & Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-center">Sesi & Ruang</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {siswaList.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">Belum ada data siswa.</td></tr>
                ) : (
                  siswaList.map((siswa) => (
                    <tr key={siswa.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <p className="text-gray-800 font-bold">{siswa.nama}</p>
                        <p className="text-gray-500 text-xs text-mono">NIS: {siswa.email_username}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-800 text-sm">{siswa.sekolah?.nama || "-"}</p>
                        <p className="text-gray-500 text-xs">
                          {siswa.rombel 
                            ? <span className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-2 py-0.5 rounded">
                                {formatRombel(siswa.rombel)}
                              </span>
                            : siswa.tingkatKelas 
                              ? `${siswa.tingkatKelas.tipe} ${toRomawi(siswa.tingkatKelas.level)}${siswa.jurusan ? ` - ${siswa.jurusan.nama_jurusan}` : ""}`
                              : "-"
                          }
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="inline-block bg-slate-100 text-slate-700 text-[11px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                              Gel. {siswa.gelombang ?? 1}
                            </span>
                            <span className="inline-block bg-blue-100 text-blue-800 text-[11px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                              Sesi {siswa.sesi}
                            </span>
                          </div>
                          <span className="text-gray-500 text-xs">{siswa.ruang}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link href={`/admin/siswa?edit=${siswa.id}`} className="text-yellow-600 hover:text-yellow-800 bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-md text-sm font-medium transition">
                            Edit
                          </Link>
                          <form action={deleteSiswa}>
                            <input type="hidden" name="id" value={siswa.id} />
                            <button type="submit" className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition">
                              Hapus
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Edit Modal Overlay */}
      {searchParams?.edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">Edit Data Siswa</h2>
              <Link href="/admin/siswa" className="text-gray-400 hover:text-red-500 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </Link>
            </div>
            
            <div className="p-6">
              {(() => {
                const siswaToEdit = siswaList.find(s => s.id === searchParams.edit);
                if (!siswaToEdit) return <p className="text-red-500 text-center">Siswa tidak ditemukan.</p>;
                
                return (
                  <form action={editSiswa} className="space-y-4">
                    <input type="hidden" name="id" value={siswaToEdit.id} />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                      <input type="text" name="nama" required defaultValue={siswaToEdit.nama}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username / NIS</label>
                      <input type="text" name="email_username" required defaultValue={siswaToEdit.email_username}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru (Opsional)</label>
                      <input type="password" name="password" placeholder="Kosongkan jika tidak ingin diubah"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ganti Foto (Opsional)</label>
                      <input type="file" name="foto" accept="image/*"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 cursor-pointer border border-gray-300 rounded-lg" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah</label>
                      <select name="sekolahId" required defaultValue={siswaToEdit.sekolahId || ""} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none bg-white">
                        <option value="">Pilih Sekolah...</option>
                        {sekolahList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rombel (Kelas)</label>
                        <select name="rombelId" required defaultValue={siswaToEdit.rombelId || ""} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none bg-white">
                          <option value="">Pilih Rombel...</option>
                          {rombelList.map(r => (
                            <option key={r.id} value={r.id}>
                              {formatRombel(r)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gelombang</label>
                        <select name="gelombang" required defaultValue={siswaToEdit.gelombang ?? 1} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm">
                          <option value="1">Gel. 1</option>
                          <option value="2">Gel. 2</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sesi Ujian</label>
                        <select name="sesi" required defaultValue={siswaToEdit.sesi} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm">
                          <option value="1">Sesi 1</option>
                          <option value="2">Sesi 2</option>
                          <option value="3">Sesi 3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ruang</label>
                        <input type="text" name="ruang" required defaultValue={siswaToEdit.ruang}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 outline-none text-sm" />
                      </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                      <Link href="/admin/siswa" className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition text-center">
                        Batal
                      </Link>
                      <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition">
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
