"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

export default function ClientEntry() {
  const sp = useSearchParams(); // SAFE now because parent wrapped in <Suspense>
  const mode = sp.get("mode") ?? "quick";
  const src = sp.get("src") ?? "";

  return (
    <div>
      {/* your existing UI */}
    </div>
  );
}
