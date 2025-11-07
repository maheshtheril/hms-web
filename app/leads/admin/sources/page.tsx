// web/app/leads/admin/sources/page.tsx
"use client";
import React from "react";
import SourceList from "./SourceList";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Lead Sources (Admin)</h1>
      <SourceList />
    </div>
  );
}
