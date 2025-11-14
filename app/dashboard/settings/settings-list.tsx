// web/app/dashboard/settings/settings-list.tsx
"use client";

import { useEffect, useState } from "react";
import SettingEditor from "./setting-editor";

export default function SettingsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        credentials: "include",
        headers: {
          "x-tenant-id": (window as any).__TENANT_ID__ || "",
          "x-user-id": (window as any).__USER_ID__ || "",
        },
      });
      const data = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((item: any) => (
        <div
          key={item.id}
          className="p-6 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-2">{item.key}</h2>
          <p className="text-sm text-gray-300 mb-3">
            Scope: {item.scope} • v{item.version}
          </p>

          <SettingEditor
            original={item}
            onSaved={() => {
              load();
            }}
          />
        </div>
      ))}
    </div>
  );
}
