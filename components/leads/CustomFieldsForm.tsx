"use client";

import React from "react";
import { useLeadCustomFields } from "./useLeadCustomFields";

export default function CustomFieldsForm({ leadId }: { leadId: string }) {
  const { items, loading, err, save } = useLeadCustomFields(leadId);

  const grouped = React.useMemo(() => {
    const g: Record<string, typeof items> = {};
    for (const it of items) {
      const sec = (it.metadata?.section || "General") as string;
      if (!g[sec]) g[sec] = [];
      g[sec].push(it);
    }
    for (const sec of Object.keys(g)) g[sec].sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label));
    return g;
  }, [items]);

  if (loading) return <div className="text-white/70">Loading custom fields…</div>;
  if (err) return <div className="text-red-400">{err}</div>;

  const renderField = (it: any) => {
    const common = "mt-1 w-full rounded-md bg-black/40 border border-white/10 p-2 text-sm text-white";
    const onChange = async (v: any) => {
      if (it.field_type === "number") await save(it.definition_id, { value_number: v === "" ? null : Number(v) });
      else if (it.field_type === "boolean") await save(it.definition_id, { value_boolean: !!v });
      else if (it.field_type === "json") {
        try {
          const parsed = v ? JSON.parse(v) : null;
          await save(it.definition_id, { value_json: parsed });
        } catch {
          alert("Invalid JSON");
        }
      } else {
        await save(it.definition_id, { value_text: v });
      }
    };

    switch (it.field_type) {
      case "number":
        return <input type="number" defaultValue={it.value_number ?? ""} className={common} onBlur={(e) => onChange(e.target.value)} />;
      case "boolean":
        return (
          <label className="inline-flex items-center gap-2 text-white/80">
            <input type="checkbox" defaultChecked={!!it.value_boolean} onChange={(e) => onChange(e.target.checked)} />
            <span>{it.label}</span>
          </label>
        );
      case "json":
        return (
          <textarea
            defaultValue={it.value_json ? JSON.stringify(it.value_json, null, 2) : ""}
            className={`${common} font-mono`}
            rows={4}
            onBlur={(e) => onChange(e.target.value)}
          />
        );
      default: // text/date/select (basic)
        return <input type="text" defaultValue={it.value_text ?? ""} className={common} onBlur={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-8">
      {Object.keys(grouped).map(section => (
        <div key={section}>
          <h3 className="text-sm font-semibold text-white/80">{section}</h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {grouped[section].map(it => (
              <div key={it.definition_id} className="rounded-lg border border-white/10 p-3">
                {it.field_type !== "boolean" && (
                  <label className="text-xs text-white/60">{it.label}{it.required ? " *" : ""}</label>
                )}
                <div className="mt-1">{renderField(it)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
