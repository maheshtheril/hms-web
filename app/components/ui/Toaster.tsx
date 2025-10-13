"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Variant = "success" | "error" | "info";
type ToastItem = { id: string; title: string; description?: string; variant: Variant };

type ToastContext = {
  push: (t: Omit<ToastItem, "id"> | string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const Ctx = createContext<ToastContext | null>(null);
const uid = () => Math.random().toString(36).slice(2);

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeouts = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setItems((s) => s.filter((i) => i.id !== id));
    if (timeouts.current[id]) {
      window.clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const push = useCallback(
    (t: Omit<ToastItem, "id"> | string) => {
      const id = uid();
      const obj: ToastItem =
        typeof t === "string"
          ? { id, title: t, variant: "info" }
          : { id, ...t };
      setItems((s) => [...s, obj]);

      // auto-dismiss after 3s
      timeouts.current[id] = window.setTimeout(() => dismiss(id), 3000) as unknown as number;
    },
    [dismiss]
  );

  const success = useCallback((title: string, description?: string) => push({ title, description, variant: "success" }), [push]);
  const error = useCallback((title: string, description?: string) => push({ title, description, variant: "error" }), [push]);
  const info = useCallback((title: string, description?: string) => push({ title, description, variant: "info" }), [push]);

  // cleanup on unmount
  useEffect(() => () => {
    Object.values(timeouts.current).forEach((t) => window.clearTimeout(t));
    timeouts.current = {};
  }, []);

  return (
    <Ctx.Provider value={{ push, success, error, info }}>
      {children}
      {/* Top-center stack */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center">
        <div className="flex w-full max-w-md flex-col gap-2 px-3">
          {items.map((it) => {
            const base =
              "pointer-events-auto rounded-xl border px-3 py-2 shadow-lg backdrop-blur transition";
            const byVariant: Record<Variant, string> = {
              success: "bg-emerald-600/90 border-emerald-300/20 text-white",
              error: "bg-rose-600/90 border-rose-300/20 text-white",
              info: "bg-zinc-800/90 border-white/10 text-zinc-100",
            };
            return (
              <div
                key={it.id}
                role="status"
                className={`${base} ${byVariant[it.variant]} animate-[toastIn_.2s_ease-out]`}
                onClick={() => dismiss(it.id)}
                title="Click to dismiss"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-2 w-2 flex-none rounded-full bg-white/90" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-5">{it.title}</div>
                    {it.description && (
                      <div className="text-xs/5 opacity-90">{it.description}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* tiny keyframe (works without editing tailwind.config) */}
      <style jsx global>{`
        @keyframes toastIn {
          from { transform: translateY(-6px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToasterProvider>");
  return ctx;
}
