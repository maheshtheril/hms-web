"use client";
import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        className:
          "backdrop-blur-md bg-black/40 border border-white/10 shadow-[0_0_25px_rgba(255,255,255,0.05)] text-white rounded-2xl",
      }}
    />
  );
}
