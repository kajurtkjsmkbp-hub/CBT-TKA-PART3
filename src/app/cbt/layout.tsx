import { ReactNode } from "react";

export default function CBTLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#eef2f6]">
      {children}
    </div>
  );
}
