"use client";

import { useState } from "react";

export default function SaltExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [extract, setExtract] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function doExtract() {
    setLoading(true);
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("text", text);

    const r = await fetch("/api/ai/salt/extract", {
      method: "POST",
      body: form,
    });
    const j = await r.json();
    setExtract(j);
    setLoading(false);
  }

  async function checkInteractions() {
    if (!extract || !extract.salts) return;
    setLoading(true);
    const r = await fetch("/api/ai/drug/interactions", {
      method: "POST",
      body: JSON.stringify({ salts: extract.salts }),
      headers: { "Content-Type": "application/json" },
    });
    const j = await r.json();
    setInteractions(j.interactions || []);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Salt Extractor & Interaction Checker</h1>

      <div className="space-y-4">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <textarea
          placeholder="Or paste invoice / product text here"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <div className="flex gap-3">
          <button onClick={doExtract} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Extract Salts</button>
          <button onClick={checkInteractions} className="px-4 py-2 bg-green-600 text-white rounded-xl">Check Interactions</button>
        </div>

        {loading && <div className="text-gray-600">Working…</div>}

        {extract && (
          <div className="p-4 bg-white/70 rounded-xl">
            <h3 className="font-semibold">Extracted</h3>
            <pre className="text-sm">{JSON.stringify(extract, null, 2)}</pre>
          </div>
        )}

        {interactions.length > 0 && (
          <div className="p-4 bg-yellow-50 rounded-xl space-y-3">
            <h3 className="font-semibold">Interactions & Warnings</h3>
            {interactions.map((it: any, i: number) => (
              <div key={i} className="p-3 bg-white/80 rounded-lg border">
                <div className="font-semibold">{it.type.toUpperCase()}: {it.summary}</div>
                <div className="text-sm opacity-80 mt-1">{it.details}</div>
                <div className="text-xs mt-2 text-gray-500">confidence: {Math.round(it.confidence * 100)}%</div>
              </div>
            ))}
          </div>
        )}

        {interactions.length === 0 && extract && (
          <div className="p-3 text-green-700 bg-green-50 rounded-xl">No interactions detected (rule-check passed)</div>
        )}
      </div>
    </div>
  );
}
