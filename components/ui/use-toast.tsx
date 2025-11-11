// components/ui/use-toast.tsx
import * as React from "react";

export type ToastVariant = "default" | "destructive";

export type ToastOpts = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: React.ReactNode;
  duration?: number;
};

type Toast = ToastOpts & { id: string };

const ToastContext = React.createContext<{ toast: (opts: ToastOpts) => string } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((opts: ToastOpts) => {
    const id = Math.random().toString(36).slice(2);
    const duration = typeof opts.duration === "number" ? opts.duration : 4000;
    setToasts((prev) => [{ id, ...opts }, ...prev]);

    if (duration > 0) {
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
    }

    return id;
  }, []);

  const viewport = React.useMemo(() => {
    // build toast children using createElement to avoid jsx parsing issues
    return React.createElement(
      "div",
      { style: { position: "fixed", top: 16, right: 16, zIndex: 9999 } },
      ...toasts.map((t) =>
        React.createElement(
          "div",
          {
            key: t.id,
            style: {
              marginBottom: 8,
              borderRadius: 12,
              padding: "12px 16px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
              background: t.variant === "destructive" ? "rgba(190,18,60,0.9)" : "rgba(17,24,39,0.9)",
              color: "white",
              maxWidth: 360,
            },
          },
          // children inside the toast container
          t.title ? React.createElement("div", { style: { fontWeight: 600 } }, t.title) : null,
          t.description ? React.createElement("div", { style: { fontSize: 12, opacity: 0.9, marginTop: 6 } }, t.description) : null,
          t.action ? React.createElement("div", { style: { marginTop: 8 } }, t.action as React.ReactNode) : null
        )
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts]);

  // Return a real React element combining the provider, children and viewport.
  return React.createElement(
    ToastContext.Provider,
    { value: { toast } },
    children,
    viewport
  );
}

export function useToast(): { toast: (opts: ToastOpts) => string } {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
