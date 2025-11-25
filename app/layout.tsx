// app/layout.tsx

// No FullCalendar CSS imports here. They must NOT be imported from JS.
// They will load from globals.css (top-level @import CDN) to avoid webpack export errors.

import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import ClientProviders from "@/components/ClientProviders";
import { Toaster } from "@/components/ui/toaster";

/* ===========================
   METADATA (SAFE VERSION)
   =========================== */
export const metadata: Metadata = {
  title: "HMS SaaS ERP",
  description:
    "AI-integrated SaaS ERP platform built for modern enterprises — CRM, HMS, and intelligent automation powered by Neural Glass UI.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "HMS SaaS ERP",
    description: "Revolutionary AI-driven ERP built on Neural Glass Design Language.",
    type: "website",
    locale: "en_US",
    url: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/* ===========================
   ROOT LAYOUT
   =========================== */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-emerald-400/30 font-sans antialiased overflow-x-hidden">
        <Providers>
          <ClientProviders>
            {children}
            <Toaster />
          </ClientProviders>
        </Providers>
      </body>
    </html>
  );
}
