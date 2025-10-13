// Minimal no-op toast hook so builds don't fail.
// Swap in shadcn's real toast system later if you need UI toasts.
type ToastOpts = { title?: string; description?: string; variant?: "default" | "destructive" };
export function useToast() {
  return {
    toast: (_opts: ToastOpts) => {},
    dismiss: () => {},
  };
}
