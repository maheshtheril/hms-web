"use client";

import React from "react";
import { ToastProvider } from "@/components/ui/use-toast";

// If you have other client-only providers (auth, theme, etc.), add them here.
// Keep this small and purely client-side.

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
