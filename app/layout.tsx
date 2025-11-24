// app/layout.tsx
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Providers } from "./providers"; // server-safe providers (React Query server setup etc.)
import ClientProviders from "@/components/ClientProviders"; // NEW: client wrapper
import { Toaster } from "@/components/ui/toaster";

/* metadata omitted for brevity — keep your existing metadata and viewport */

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
    url: "https://hmsweb.onrender.com",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-emerald-400/30 font-sans antialiased overflow-x-hidden">
        {/* Server-safe Providers */}
        <Providers>
          {/* ClientProviders ensures ToastProvider (and other client-only providers) wrap children at runtime */}
          <ClientProviders>
            {children}
            <Toaster />
          </ClientProviders>
        </Providers>
      </body>
    </html>
  );
}
