"use client";

import React from "react";
import { ToasterProvider } from "@/app/components/ui/Toaster"; // <- your file

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToasterProvider>
      {children}
      {/* If your Toaster module also exports a visual host, you can mount it here:
      <Toaster /> */}
    </ToasterProvider>
  );
}
