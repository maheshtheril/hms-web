"use client";
import React from "react";
import PipelineList from "./PipelineList";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Pipelines (Admin)</h1>
      <PipelineList />
    </div>
  );
}
