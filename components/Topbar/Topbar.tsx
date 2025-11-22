"use client";

import React from "react";
import CompanySelector from "../CompanySelector";

export default function Topbar() {
  return (
    <header
      className="
        fixed left-64 right-0 top-0 h-16 z-30
        bg-[rgba(255,255,255,0.05)]
        backdrop-blur-xl border-b border-white/10
        flex items-center justify-between px-6
      "
    >
      <CompanySelector />

      <div className="text-white/80">
        {/* Future: profile dropdown */}
      </div>
    </header>
  );
}
