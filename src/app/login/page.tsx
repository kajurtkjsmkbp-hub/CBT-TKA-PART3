import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClientStorageClearer from "./ClientStorageClearer";

async function handleLogin(formData: FormData) {
  "use server";
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  
  // Hardcoded Fallback Admin
  if (username === "admin" && password === "admin") {
    (await cookies()).set("cbt_session", "ADMIN", { path: "/", httpOnly: true });
    redirect("/admin");
  }
  
  // Cek User di DB
  const user = await prisma.user.findFirst({
    where: { 
      email_username: username, 
      password: password
    }
  });
  
  if (user) {
    if (user.role === "SISWA") {
      if (user.isLogin) {
        redirect("/login?error=2"); // error 2: Sudah login di perangkat lain
      }
      // Update isLogin to true
      await prisma.user.update({
        where: { id: user.id },
        data: { isLogin: true, lastLogin: new Date() }
      });
      (await cookies()).set("cbt_session", "SISWA", { path: "/", httpOnly: true });
      (await cookies()).set("cbt_user_id", user.id, { path: "/", httpOnly: true }); // store user id too
      redirect("/cbt");
    } else {
      (await cookies()).set("cbt_session", user.role, { path: "/", httpOnly: true });
      redirect("/admin");
    }
  }
  
  // Jika gagal, return dengan redirect error parameter (sederhana)
  redirect("/login?error=1");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = (await cookies()).get("cbt_session")?.value;
  if (session === "SISWA") {
    redirect("/cbt");
  } else if (session === "ADMIN" || session === "GURU") {
    redirect("/admin");
  }

  const params = await searchParams;
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      <ClientStorageClearer />
      
      {/* Ornamen Background Animasi (Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      {/* Container Login Card */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 z-10">
        <div className="p-10">
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
              TKA CBT
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Sistem Ujian Berbasis Komputer
            </p>
          </div>

          {params?.error === "1" && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm text-center font-semibold">
              Username atau Password salah!
            </div>
          )}
          {params?.error === "2" && (
            <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-sm text-center font-semibold">
              Anda masih berstatus AKTIF LOGIN di perangkat lain. Minta Proktor untuk mereset login Anda!
            </div>
          )}

          <form action={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NIS / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">👤</span>
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                  placeholder="Masukkan NIS atau admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔒</span>
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5"
              >
                MASUK KE PORTAL
              </button>
            </div>
          </form>

        </div>
        
        <div className="bg-gray-50/50 px-10 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-medium">
            LMS-7TKA-CBT v1.0.0 &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
