import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Ambil userId dari cookies sebelum dihapus
  const userId = (await cookies()).get("cbt_user_id")?.value;
  
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isLogin: false }
      });
    } catch (error) {}
  }

  // Hapus cookie sesi saat pengguna klik tombol keluar
  (await cookies()).delete("cbt_session");
  (await cookies()).delete("cbt_user_id");
  
  // Arahkan kembali ke halaman login
  return NextResponse.redirect(new URL("/login", request.url));
}
