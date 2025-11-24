// /web/app/layout.tsx
import "./globals.css";
import React from "react";
import { ToastProvider } from "@/components/ToastProvider"; // adjust path if needed

export const metadata = {
  title: "ERP — Dashboard",
  description: "SaaS ERP — Neural Glass UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <ToastProvider>
          {/* children will usually be routing groups e.g. (tenant) */}
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
