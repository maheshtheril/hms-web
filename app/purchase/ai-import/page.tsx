"use client";

import { useState } from "react";

export default function AIPurchaseImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function extract() {
    if (!file) return;
    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    const r = await fetch("/api/ai/po/extract", { method: "POST", body: form });
    const json = await r.json();

    setLines(json.lines);
    setLoading(false);
  }

  async function importPO() {
    const r = await fetch("/api/ai/po/import", {
      method: "POST",
      body: JSON.stringify({ lines }),
      headers: { "Content-Type": "application/json" },
    });

    const json = await r.json();
    alert("Imported GRN: " + json.grn_id);
  }

  return (
    <div className="max-w-4xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">AI Purchase Bill Import</h1>

      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <button
        onClick={extract}
        className="px-4 py-2 bg-blue-600 text-white mt-4 rounded-xl"
      >
        Extract Invoice Items
      </button>

      {loading && <p className="mt-4">Extracting with AI…</p>}

      {lines.length > 0 && (
        <div className="mt-10 bg-white/70 p-6 rounded-xl shadow space-y-3">
          <h2 className="text-xl font-semibold">Extracted Line Items</h2>

          {lines.map((l, idx) => (
            <div
              key={idx}
              className="p-4 border rounded-xl bg-white/50 backdrop-blur-xl"
            >
              <pre className="text-sm">{JSON.stringify(l, null, 2)}</pre>
            </div>
          ))}

          <button
            onClick={importPO}
            className="px-4 py-2 bg-green-600 text-white rounded-xl mt-4"
          >
            Import to Purchase Order & Create GRN
          </button>
        </div>
      )}
    </div>
  );
}
