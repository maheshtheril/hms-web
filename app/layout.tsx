import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Providers from "./providers";


export const metadata: Metadata = {
  title: "GeniusGrid ERP",
  description: "A TypeScript SaaS ERP starter (Next.js + Express + Postgres)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


