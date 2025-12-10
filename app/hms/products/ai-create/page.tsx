"use client";

import { useState } from "react";

export default function AIProductCreatorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function extract() {
    if (!file) return;
    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    const r = await fetch("/api/ai/product/extract", {
      method: "POST",
      body: form,
    });

    const json = await r.json();
    setResult(json);
    setLoading(false);
  }

  async function save() {
    const r = await fetch("/api/ai/product/save", {
      method: "POST",
      body: JSON.stringify(result),
      headers: { "Content-Type": "application/json" },
    });

    const j = await r.json();
    alert("Product created: " + j.product_id);
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">AI Product Creator</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={extract}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl"
      >
        Extract via AI
      </button>

      {loading && <p className="mt-4 text-gray-600">Processing...</p>}

      {result && (
        <div className="mt-8 p-6 bg-white/70 rounded-2xl shadow space-y-4">
          <h2 className="text-xl font-semibold">Extracted Product</h2>

          <pre className="text-sm bg-black/5 p-4 rounded-xl">
            {JSON.stringify(result, null, 2)}
          </pre>

          <button
            onClick={save}
            className="px-4 py-2 bg-green-600 text-white rounded-xl"
          >
            Save to Product Master
          </button>
        </div>
      )}
    </div>
  );
}
