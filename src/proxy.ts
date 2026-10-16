import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
export function proxy(request: NextRequest) {
  const session = request.cookies.get('cbt_session')?.value;
  const pathname = request.nextUrl.pathname;

  // Lindungi rute /admin (Admin dan Guru)
  if (pathname.startsWith('/admin')) {
    if (session !== 'ADMIN' && session !== 'GURU') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Lindungi rute /cbt (Hanya Siswa yang boleh masuk)
  if (pathname.startsWith('/cbt')) {
    if (session !== 'SISWA' && session !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
 
// Middleware akan dijalankan pada URL di bawah ini:
export const config = {
  matcher: ['/admin/:path*', '/cbt/:path*'],
}
