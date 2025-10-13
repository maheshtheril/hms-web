"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Ctx = { openQuickLead: (src?: string) => void };
const QuickLeadCtx = createContext<Ctx | null>(null);

export function useQuickLead() {
  const ctx = useContext(QuickLeadCtx);
  if (!ctx) throw new Error("useQuickLead must be used within QuickLeadProvider");
  return ctx;
}

export function QuickLeadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | undefined>();

  const ctx = useMemo<Ctx>(() => ({
    openQuickLead: (s?: string) => { setSrc(s); setOpen(true); },
  }), []);

  return (
    <QuickLeadCtx.Provider value={ctx}>
      {children}

      {/* Drawer / Modal */}
      {open && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-dvh w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <div className="text-sm font-semibold">Quick Lead</div>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 grid place-items-center"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div className="text-xs opacity-70">Source: {src || "direct"}</div>

              {/* Replace this with your real quick lead form */}
              <form className="space-y-3">
                <input className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2"
                       placeholder="Lead name" />
                <input className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2"
                       placeholder="Email / Phone" />
                <textarea className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2"
                          placeholder="Notes" rows={4} />
                <div className="flex gap-2">
                  <button type="submit"
                          className="rounded-lg bg-white text-black px-3 py-2 font-semibold text-xs hover:bg-zinc-100">
                    Create Lead
                  </button>
                  <button type="button" onClick={() => setOpen(false)}
                          className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-semibold hover:bg-zinc-800">
                    Cancel
                  </button>
                </div>
              </form>
              {/* /Replace */}
            </div>
          </div>
        </div>
      )}
    </QuickLeadCtx.Provider>
  );
}
