// web/app/dashboard/settings/setting-editor.tsx
"use client";

import { useState } from "react";

export default function SettingEditor({
  original,
  onSaved,
}: {
  original: any;
  onSaved: () => void;
}) {
  const [text, setText] = useState(JSON.stringify(original.value, null, 2));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    try {
      const parsed = JSON.parse(text);
      setError("");
      setSaving(true);

      await fetch("/api/settings", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": (window as any).__TENANT_ID__ || "",
          "x-user-id": (window as any).__USER_ID__ || "",
        },
        body: JSON.stringify({
          key: original.key,
          value: parsed,
          tenant_id: original.tenant_id,
          company_id: original.company_id,
        }),
      });

      setSaving(false);
      onSaved();
    } catch (e: any) {
      setError("Invalid JSON. " + e.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        className="w-full h-40 p-3 bg-black/30 text-white rounded-lg border border-white/20"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
