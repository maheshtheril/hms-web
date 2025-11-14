// web/app/dashboard/settings/components/SettingCard.tsx
"use client";
import React from "react";

export default function SettingCard({ title, subtitle, children }: any) {
  return (
    <div className="p-6 rounded-2xl bg-white/6 backdrop-blur-xl border border-white/6 shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
