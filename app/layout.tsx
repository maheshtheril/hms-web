// /web/app/layout.tsx
import "./globals.css";
import React from "react";

export const metadata = {
  title: "ERP — Dashboard",
  description: "SaaS ERP — Neural Glass UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {/* children will usually be routing groups e.g. (tenant) */}
        {children}
      </body>
    </html>
  );
}
