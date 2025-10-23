// components/BackToDashboardButton.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function BackToDashboardButton() {
  const router = useRouter();

  const goDashboard = () => {
    // ✅ Change this to your actual dashboard route if different
    router.push("/dashboard");
  };

  return (
    <button
      onClick={goDashboard}
      className="rounded-full border border-white/10 px-3 py-2 text-sm hover:bg-white/6 flex items-center gap-2"
      title="Go to dashboard"
    >
      <span className="text-sm">←</span>
      <span className="text-sm">Dashboard</span>
    </button>
  );
}
