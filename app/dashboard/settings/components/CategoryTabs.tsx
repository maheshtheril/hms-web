// web/app/dashboard/settings/components/CategoryTabs.tsx
"use client";
import React from "react";

export default function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-3 flex-wrap">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${
            c === active
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
              : "bg-white/6 text-slate-800 backdrop-blur-sm border border-white/6"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
