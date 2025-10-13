// path: app/dashboard/rbac/layout.tsx
import React from "react";

export default function RBACLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-black/50">
        <div className="text-sm font-semibold tracking-wide">RBAC & Security</div>
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}