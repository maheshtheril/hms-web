"use client";

import { useEffect, useState } from "react";

export type LeadCFItem = {
  definition_id: string;
  key: string;
  label: string;
  field_type: string;
  options: any | null;
  required: boolean;
  visible: boolean;
  sort_order: number;
  metadata: any;
  value_id?: string | null;
  value_text?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_json?: any | null;
  value_updated_at?: string | null;
};

export function useLeadCustomFields(leadId: string) {
  const [items, setItems] = useState<LeadCFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!leadId) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/leads/${leadId}/custom-fields`, { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to load");
      setItems(j.items || []);
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const save = async (definitionId: string, payload: Partial<Pick<LeadCFItem, "value_text"|"value_number"|"value_boolean"|"value_json">>) => {
    const r = await fetch(`/api/leads/${leadId}/custom-fields/${definitionId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Save failed");
    await load();
    return j;
  };

  useEffect(() => { load(); }, [leadId]);

  return { items, loading, err, reload: load, save };
}
