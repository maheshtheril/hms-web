import type { ReactNode } from "react";
import Sidebar from "../../../components/Sidebar";
import { Topbar } from "../../../components/Topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
         <Topbar /> 
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}