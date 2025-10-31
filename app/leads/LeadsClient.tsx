// app/leads/LeadsClient.tsx
"use client";
import React, { useState } from "react";
import LeadList from "./components/LeadList";
import LeadDetail from "./components/LeadDetail";

export default function LeadsClient() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        <aside className="col-span-4">
          <div className="bg-white/6 backdrop-blur-sm border border-white/6 rounded-2xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Leads</h3>
            <LeadList
              onSelect={(id: string) => setSelected(id)}
              onCreate={(id: string) => setSelected(id)}
            />
          </div>
        </aside>

        <main className="col-span-8">
          {selected ? (
            <LeadDetail leadId={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="bg-white/6 backdrop-blur-sm border border-white/6 rounded-2xl p-8 h-full flex items-center justify-center">
              <div className="text-white/70">Select a lead to view details</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
