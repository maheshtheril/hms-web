"use client";
import React from "react";
import StageList from "./StageList";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Stages (Admin)</h1>
      <StageList />
    </div>
  );
}
