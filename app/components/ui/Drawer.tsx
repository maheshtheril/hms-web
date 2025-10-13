"use client";
import React, { useEffect } from "react";

export function Drawer({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; width?: number; }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-black/50 transition ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full bg-zinc-900 text-zinc-100 shadow-2xl transition-transform`} style={{ width, transform: `translateX(${open ? 0 : width}px)` }}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">✕</button>
        </div>
        <div className="p-4 overflow-auto h-[calc(100%-56px)]">{children}</div>
      </div>
    </div>
  );
}

