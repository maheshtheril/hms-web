"use client";
import React from "react";

export default function ResourceList({ resources = [] }: { resources: any[] }) {
  return (
    <div className="space-y-3">
      {resources.map(r => (
        <div key={r.id} className="p-3 rounded-xl backdrop-blur-xl bg-white/3 border border-white/6 flex justify-between items-center">
          <div>
            <div className="font-semibold">{r.name}</div>
            <div className="text-sm opacity-60">{r.type} • {r.location}</div>
          </div>
          <div className="text-sm opacity-70">{r.status}</div>
        </div>
      ))}
    </div>
  );
}
