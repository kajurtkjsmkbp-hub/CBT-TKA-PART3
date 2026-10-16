import Link from "next/link";
import { cookies } from "next/headers";

import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await cookies()).get('cbt_session')?.value || 'ADMIN';
  const isAdmin = session === 'ADMIN';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar isAdmin={isAdmin} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50/50">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center text-gray-400">
            {/* Optional search or breadcrumbs could go here */}
            <span className="text-sm font-medium">Sistem Ujian Berbasis Komputer</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
               <span className="text-gray-800 font-bold block leading-tight">Halo, Administrator</span>
               <span className="text-xs text-gray-500 font-medium">Online</span>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-100 to-blue-50 border border-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm ring-2 ring-white">
              A
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
