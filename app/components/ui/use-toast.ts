import * as React from "react";

type ToastItem = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
};
const listeners: Array<(items: ToastItem[]) => void> = [];
let items: ToastItem[] = [];

function push(t: Omit<ToastItem, "id">) {
  const id = crypto.randomUUID();
  items = [{ id, ...t }, ...items].slice(0, 3);
  listeners.forEach((l) => l(items));
  setTimeout(() => dismiss(id), 4000);
  return { id };
}

export function dismiss(id?: string) {
  items = id ? items.filter((x) => x.id !== id) : [];
  listeners.forEach((l) => l(items));
}

export function useToast() {
  const [state, setState] = React.useState<ToastItem[]>([]);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const i = listeners.indexOf(setState);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  return {
    toasts: state,
    toast: (opts: Omit<ToastItem, "id">) => push(opts),
    success: (title: string, description?: string) => push({ title, description }),
    error: (title: string, description?: string) =>
      push({ variant: "destructive", title, description }),
  };
}
