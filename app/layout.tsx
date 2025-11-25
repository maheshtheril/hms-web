// app/layout.tsx
// =======================
// GLOBAL CSS IMPORTS
// (Must be first — fixes Next.js CSS warnings)
// =======================



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
