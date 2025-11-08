// web/app/leads/admin/professions/page.tsx
"use client";
import React from "react";
import ProfessionList from "./ProfessionList";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Professions (Admin)</h1>
      <ProfessionList />
    </div>
  );
}
