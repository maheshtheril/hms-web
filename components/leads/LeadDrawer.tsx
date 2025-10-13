"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function LeadDrawer() {
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState<string>();
  const [lead, setLead] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [stages, setStages] = useState<any[]>([]);
  const [toStage, setToStage] = useState<string>("");

  // Listen for row clicks
  useEffect(() => {
    function onOpen(e: any) {
      setLeadId(e.detail.id);
      setOpen(true);
    }
    window.addEventListener("lead:open", onOpen as any);
    return () => window.removeEventListener("lead:open", onOpen as any);
  }, []);

  // Fetch lead + timeline + stages
  useEffect(() => {
    (async () => {
      if (!open || !leadId) return;
      const l = await api<any>(`/api/leads/${leadId}`, {
        cache: "no-store" as any,
      });
      setLead(l);

      const t = await api<{ items: any[] }>(
        `/api/leads/${leadId}/timeline`,
        { cache: "no-store" as any }
      );
      setTimeline(t.items);

      if (l.pipeline_id) {
        const s = await api<any[]>(
          `/api/pipelines/${l.pipeline_id}/stages`,
          { cache: "no-store" as any }
        );
        setStages(s);
        setToStage(String(l.stage_id || ""));
      }
    })();
  }, [open, leadId]);

  async function addNote() {
    if (!leadId || !note.trim()) return;
    await api(`/api/leads/${leadId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body: note }),
    });
    setNote("");
    const t = await api<{ items: any[] }>(
      `/api/leads/${leadId}/timeline`,
      { cache: "no-store" as any }
    );
    setTimeline(t.items);
  }

  async function moveStage() {
    if (!leadId || !toStage) return;
    await api(`/api/leads/${leadId}/stage-move`, {
      method: "POST",
      body: JSON.stringify({ to_stage_id: toStage }),
    });
    const l = await api<any>(`/api/leads/${leadId}`, {
      cache: "no-store" as any,
    });
    setLead(l);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50">
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] card rounded-none overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold">Lead Details</div>
          <button
            className="px-2 py-1 bg-white/10 rounded-lg"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>

        {!lead ? (
          <div>Loading…</div>
        ) : (
          <div className="grid gap-4">
            <div>
              <div className="text-2xl font-bold">{lead.name}</div>
              <div className="opacity-80 text-sm">
                {lead.primary_email || "—"} · {lead.primary_phone || "—"}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <div className="card">
                <div className="text-sm opacity-70 mb-1">Stage</div>
                <div className="flex gap-2">
                  <select
                    className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 flex-1"
                    value={toStage}
                    onChange={(e) => setToStage(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
                    onClick={moveStage}
                    disabled={!toStage}
                  >
                    Move
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="text-sm opacity-70 mb-1">Value</div>
                <div className="text-xl font-semibold">
                  ₹{lead.estimated_value ?? 0}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="text-lg font-semibold mb-2">Add Note</div>
              <textarea
                className="w-full h-24 px-3 py-2 rounded-xl bg-black/30 border border-white/10"
                placeholder="Write a note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <button
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20"
                  onClick={addNote}
                  disabled={!note.trim()}
                >
                  Add Note
                </button>
              </div>
            </div>

            <div className="card">
              <div className="text-lg font-semibold mb-2">Timeline</div>
              <div className="grid gap-2 max-h-[40vh] overflow-auto pr-1">
                {timeline.map((t: any) => (
                  <div
                    key={t.id}
                    className="border border-white/10 rounded-xl p-3"
                  >
                    <div className="text-xs opacity-70">
                      {t.type} • {new Date(t.created_at).toLocaleString()}
                    </div>
                    <div className="mt-1">{t.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
