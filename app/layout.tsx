// app/layout.tsx (server component) — minimal, no LayoutShell here
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = { /* ... */ };
export const viewport: Viewport = { /* ... */ };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <body className="min-h-screen bg-black text-white selection:bg-emerald-400/30 font-sans antialiased overflow-x-hidden">
        <Providers>
          {/* children rendered directly; dashboard wrapper moved to route-level layout */}
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
