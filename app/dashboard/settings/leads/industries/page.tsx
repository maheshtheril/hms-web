// web/app/leads/admin/industries/page.tsx
"use client";
import React from "react";
import IndustryList from "./IndustryList";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Industries (Admin)</h1>
      <IndustryList />
    </div>
  );
}
