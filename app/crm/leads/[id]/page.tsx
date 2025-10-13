"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/Textarea";
import { Button } from "@/app/components/ui/Button";
import { useToast } from "@/app/components/ui/Toaster";

/* ───────────────────────────────── Types ───────────────────────────────── */

type LeadMeta = {
  follow_up_date?: string | null;
  expected_revenue?: number | null;
  profession?: string | null;
  notes?: string | null;
  address?: Record<string, any> | null;
  [k: string]: any;
};

interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  stage?: string | null;           // display name (may be null from backend)
  company_id?: string | null;
  owner_id?: string | null;
  pipeline_id?: string | null;
  stage_id?: string | null;        // UUID
  estimated_value?: number | null;
  probability?: number | null;     // %
  tags?: string[] | null;
  meta?: LeadMeta | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface LeadNote { id: string; body: string; author_id: string; created_at: string; }
interface LeadTask {
  id: string; title: string; status: "open" | "done" | "canceled";
  due_date?: string | null; assigned_to?: string | null;
  created_at: string; completed_at?: string | null;
}

interface StageChange {
  id: string;
  lead_id: string;
  from_stage: string | null;
  to_stage: string | null;
  from_stage_id?: string | null;
  to_stage_id?: string | null;
  changed_by?: string | null;
  changed_by_name?: string | null;
  created_at: string;
}

interface Stage {
  id: string;               // normalized to string
  name: string;
  pipeline_id?: string | null;
  order_index?: number | null;
}

/* ───────────────────────────────── Helpers ───────────────────────────────── */

const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const fmtMoney = (n?: number | null, frac: 0 | 2 = 0) =>
  (n === null || n === undefined || isNaN(Number(n)) ? "—" : (frac === 0 ? inr0 : inr2).format(Number(n)));
const clampPct = (p?: number | null) => (p === null || p === undefined || isNaN(Number(p)) ? null : Math.min(100, Math.max(0, Math.round(Number(p)))));
const fmtDate = (d?: string | null) => d ? new Date(d.length <= 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }) : "—";

function expectedRevenueOf(lead?: Lead | null) {
  if (!lead) return null;
  const metaER = lead.meta?.expected_revenue;
  if (metaER !== undefined && metaER !== null) return Number(metaER);
  const v = Number(lead.estimated_value ?? NaN);
  const p = clampPct(lead.probability);
  if (!isFinite(v) || p === null) return null;
  return Math.round((v * (p / 100)) * 100) / 100;
}

function normalizeId(v: any): string {
  return v === null || v === undefined ? "" : String(v);
}

function latestHistoryStage(h: StageChange[] | undefined) {
  if (!h || h.length === 0) return { id: "", name: "" };
  const sorted = [...h].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const last = sorted[sorted.length - 1];
  return {
    id: normalizeId(last.to_stage_id ?? ""),
    name: String(last.to_stage ?? ""),
  };
}

const toNumOrUndef = (x: string) => {
  if (x === "") return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
};
const toNumOrNull = (x: string) => {
  if (x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

/* ───────────────────────────────── Page ───────────────────────────────── */

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [history, setHistory] = useState<StageChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [edit, setEdit] = useState({
    name: "",
    email: "",
    phone: "",
    estimated_value: "",
    probability: "",
    follow_up_date: "",
    expected_revenue: "",
  });

  // Stage picker state (with graceful fallback)
  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stageSelId, setStageSelId] = useState<string>(""); // always string
  const [stageManual, setStageManual] = useState<string>("");

  async function load() {
    try {
      setLoading(true); setErr(null);
      const { data } = await apiClient.get(`/leads/${id}`, { withCredentials: true });
      const lead: Lead = data.lead;
      setLead(lead);
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setEdit({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        estimated_value: lead.estimated_value != null ? String(lead.estimated_value) : "",
        probability: lead.probability != null ? String(lead.probability) : "",
        follow_up_date: lead.meta?.follow_up_date || "",
        expected_revenue: lead.meta?.expected_revenue != null ? String(lead.meta.expected_revenue) : "",
      });

      try {
        const hist = await apiClient.get(`/leads/${id}/history`, { withCredentials: true });
        setHistory(Array.isArray(hist.data?.history) ? hist.data.history : []);
      } catch {
        setHistory([]);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load");
    } finally { setLoading(false); }
  }

  async function loadStages() {
    try {
      setStagesLoading(true);
      const { data } = await apiClient.get("/stages", { withCredentials: true });
      if (Array.isArray(data?.stages)) {
        const normalized: Stage[] = data.stages.map((s: any) => ({
          id: normalizeId(s.id),
          name: String(s.name ?? ""),
          pipeline_id: s.pipeline_id ? normalizeId(s.pipeline_id) : null,
          order_index: typeof s.order_index === "number" ? s.order_index : (s.order_index ? Number(s.order_index) : null),
        }));
        const sorted = normalized.sort((a, b) =>
          (String(a.pipeline_id || "")).localeCompare(String(b.pipeline_id || "")) ||
          Number(a.order_index ?? 0) - Number(b.order_index ?? 0) ||
          a.name.localeCompare(b.name)
        );
        setStages(sorted);
      } else {
        setStages([]);
      }
    } catch {
      setStages([]);
    } finally {
      setStagesLoading(false);
    }
  }

  // Load once
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { loadStages(); /* eslint-disable-next-line */ }, []);

  // Preselect stage when possible (lead.stage_id → latest history)
  useEffect(() => {
    if (!stages.length) return;
    const currId = normalizeId(lead?.stage_id);
    if (currId && stages.some(s => s.id === currId)) {
      setStageSelId(currId);
      return;
    }
    const latest = latestHistoryStage(history);
    if (latest.id && stages.some(s => s.id === latest.id)) {
      setStageSelId(latest.id);
    }
  }, [lead, stages, history]);

  const computedER = useMemo(() => {
    if (!edit.estimated_value || !edit.probability) return expectedRevenueOf(lead);
    const v = Number(edit.estimated_value), p = Number(edit.probability);
    if (!isFinite(v) || !isFinite(p)) return expectedRevenueOf(lead);
    return Math.round((v * (Math.min(100, Math.max(0, p)) / 100)) * 100) / 100;
  }, [edit.estimated_value, edit.probability, lead]);

  // Robust display name for stage (server → id map → history)
  const displayStageName = useMemo(() => {
    if (lead?.stage) return lead.stage;
    const byId = stages.find(s => s.id === normalizeId(lead?.stage_id));
    if (byId?.name) return byId.name;
    const latest = latestHistoryStage(history);
    return latest.name || undefined;
  }, [lead, stages, history]);

  async function patchLead(payload: any, toastMsg = "Saved") {
    try {
      setErr(null);
      await apiClient.patch(`/leads/${id}`, payload, { withCredentials: true });
      success(toastMsg);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Update failed";
      setErr(msg); error("Update failed", msg);
    }
  }

  // Actions
  const saveBasics = () => patchLead({
    name: edit.name || undefined,
    email: edit.email || undefined,
    phone: edit.phone || undefined, // persist phone too
    estimated_value: toNumOrUndef(edit.estimated_value),
    probability: toNumOrUndef(edit.probability),
  });

  const saveFollowUp = () => patchLead({ meta: { follow_up_date: edit.follow_up_date || null } }, "Follow-up updated");
  const saveExpectedRevenue = () => patchLead({ meta: { expected_revenue: toNumOrNull(edit.expected_revenue) } }, "Expected revenue updated");

  async function addNote(body: string) {
    if (!body.trim()) return;
    try {
      await apiClient.post(`/leads/${id}/notes`, { body }, { withCredentials: true });
      success("Note added");
      await load();
    } catch (e: any) { error("Add note failed", e?.response?.data?.error || e?.message || ""); }
  }

  async function addTask(title: string, due_date?: string) {
    if (!title.trim()) return;
    try {
      await apiClient.post(`/leads/${id}/tasks`, { title, due_date: due_date || null }, { withCredentials: true });
      success("Task added");
      await load();
    } catch (e: any) { error("Add task failed", e?.response?.data?.error || e?.message || ""); }
  }

  async function setTaskStatus(taskId: string, status: "open" | "done" | "canceled") {
    try {
      await apiClient.patch(`/leads/${id}/tasks/${taskId}`, { status }, { withCredentials: true });
      await load();
    } catch (e: any) { error("Update task failed", e?.response?.data?.error || e?.message || ""); }
  }

  async function closeLead(outcome: "won" | "lost") {
    const reason = window.prompt(`Reason for ${outcome}? (optional)`);
    try {
      await apiClient.post(`/leads/${id}/close`, { outcome, reason: reason || null }, { withCredentials: true });
      success(`Lead ${outcome}`);
      await load();
    } catch (e: any) { error("Close failed", e?.response?.data?.error || e?.message || ""); }
  }

  async function reopenLead() {
    try {
      await apiClient.post(`/leads/${id}/reopen`, {}, { withCredentials: true });
      success("Lead reopened");
      await load();
    } catch (e: any) { error("Reopen failed", e?.response?.data?.error || e?.message || ""); }
  }

  async function moveStage() {
    try {
      let targetId = "";
      if (stageSelId) {
        targetId = stageSelId;
      } else if (stageManual.trim()) {
        const byName = stages.find(s => s.name.toLowerCase() === stageManual.trim().toLowerCase());
        if (!byName?.id) { error("Move failed", "Unknown stage name. Please pick from the list."); return; }
        targetId = byName.id;
      } else {
        return;
      }

      // optimistic update (so UI reflects immediately)
      const picked = stages.find(s => s.id === targetId);
      setLead(prev => prev ? { ...prev, stage_id: targetId, stage: picked?.name ?? prev.stage } : prev);
      setStageSelId(targetId);
      setStageManual("");

      // include lead_id in body to satisfy servers that require it
      await apiClient.post(`/leads/${id}/move`, { lead_id: id, stage_id: targetId }, { withCredentials: true });
      success("Stage updated");
      await load(); // reconcile with server truth
    } catch (e: any) {
      error("Move failed", e?.response?.data?.error || e?.message || "");
    }
  }

  // Inline inputs for notes/tasks
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const isClosed = (lead?.status === "won" || lead?.status === "lost");

  return (
    <div className="min-h-dvh bg-black text-white">
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Lead Detail</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
            {!isClosed ? (
              <>
                <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => closeLead("won")}>Mark Won</Button>
                <Button className="bg-rose-600 hover:bg-rose-500" onClick={() => closeLead("lost")}>Mark Lost</Button>
              </>
            ) : (
              <Button className="bg-amber-600 hover:bg-amber-500" onClick={reopenLead}>Reopen</Button>
            )}
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="opacity-70">Loading…</div>
        ) : !lead ? (
          <div className="opacity-70">Lead not found.</div>
        ) : (
          <div className="space-y-8">
            {/* Overview */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-wider text-white/60 mb-2">Overview</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70">Lead Name</label>
                    <Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70">Email</label>
                    <Input type="email" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70">Phone</label>
                    <Input value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70">Value (₹)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={edit.estimated_value}
                      onChange={e => setEdit({ ...edit, estimated_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70">Probability (%)</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={edit.probability}
                      onChange={e => setEdit({ ...edit, probability: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm opacity-80">
                    Expected Revenue: <span className="font-medium">{fmtMoney(computedER, 2)}</span>
                  </div>
                  <Button onClick={saveBasics}>Save Basics</Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] uppercase tracking-wider text-white/60 mb-2">Status</div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="opacity-70">Current:</span>{" "}
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">{lead.status ?? "new"}</span>
                  </div>
                  <div>
                    <span className="opacity-70">Stage:</span>{" "}
                    <span className="ml-1">{displayStageName ?? "—"}</span>
                  </div>
                </div>

                {/* Stage picker (auto or manual) */}
                <div className="mt-3 text-sm">
                  <label className="block text-sm text-white/70 mb-1">Move to Stage</label>
                  {stages.length > 0 ? (
                    <div className="flex gap-2 items-center">
                      <select
                        className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                        value={stageSelId}
                        onChange={e => { setStageSelId(e.target.value); setStageManual(""); }}
                        disabled={stagesLoading}
                      >
                        <option value="">Select stage…</option>
                        {stages.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <Button
                        className="shrink-0"
                        onClick={moveStage}
                        disabled={stagesLoading || (!stageSelId && !stageManual.trim())}
                      >
                        Move
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Type stage name (e.g., Qualified)"
                        value={stageManual}
                        onChange={e => setStageManual(e.target.value)}
                      />
                      <Button className="shrink-0" onClick={moveStage} disabled={!stageManual.trim()}>
                        Move
                      </Button>
                    </div>
                  )}
                  {stagesLoading && <div className="mt-2 text-xs opacity-60">Loading stages…</div>}
                </div>

                <div className="mt-3 text-sm">
                  <label className="block text-sm text-white/70">Follow-up Date</label>
                  <Input
                    type="date"
                    value={edit.follow_up_date}
                    onChange={e => setEdit({ ...edit, follow_up_date: e.target.value })}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={saveFollowUp}>Save Follow-up</Button>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  <label className="block text-sm text-white/70">Expected Revenue (override)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={edit.expected_revenue}
                    placeholder={computedER != null ? String(computedER) : ""}
                    onChange={e => setEdit({ ...edit, expected_revenue: e.target.value })}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={saveExpectedRevenue}>Save Expected</Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Notes</div>
              </div>
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const v = noteText.trim();
                      if (!v) return;
                      setNoteText("");
                      addNote(v);
                    }}
                  >
                    Add
                  </Button>
                </div>
                {notes.length === 0 ? (
                  <div className="text-sm opacity-60">No notes yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {notes.map(n => (
                      <li key={n.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                        <div className="mt-1 text-[11px] opacity-60">
                          {new Date(n.created_at).toLocaleString("en-IN")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Tasks */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Tasks</div>
              </div>

              <div className="mt-3 flex flex-col md:flex-row gap-2 items-stretch">
                <Input
                  className="flex-1 min-w-0 md:flex-[1_1_60%]"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                />
                <Input
                  type="date"
                  className="w-full md:w-36 md:flex-none shrink-0"
                  value={taskDue}
                  onChange={e => setTaskDue(e.target.value)}
                />
                <Button
                  className="md:flex-none shrink-0"
                  onClick={() => {
                    const t = taskTitle.trim();
                    if (!t) return;
                    const d = taskDue;
                    setTaskTitle("");
                    setTaskDue("");
                    addTask(t, d);
                  }}
                >
                  Add Task
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-sm opacity-60">No tasks yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {tasks.map(t => (
                      <li
                        key={t.id}
                        className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {t.title}
                            {t.status !== "open" && (
                              <span
                                className={`ml-2 text-[11px] rounded-full px-2 py-0.5 border ${
                                  t.status === "done"
                                    ? "border-emerald-400/30 text-emerald-200"
                                    : "border-white/20 text-white/70"
                                }`}
                              >
                                {t.status}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] opacity-60">
                            {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {t.status !== "done" && (
                            <Button onClick={() => setTaskStatus(t.id, "done")}>Mark Done</Button>
                          )}
                          {t.status === "open" && (
                            <Button variant="outline" onClick={() => setTaskStatus(t.id, "canceled")}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Stage History */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Stage history</div>
              </div>

              <div className="mt-3">
                {history.length === 0 ? (
                  <div className="text-sm opacity-60">No stage changes yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {history.map(h => (
                      <li key={h.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="text-sm">
                          <span className="opacity-70">Moved:</span>{" "}
                          <span className="font-medium">{h.from_stage ?? "—"}</span>{" "}
                          <span className="opacity-70">→</span>{" "}
                          <span className="font-medium">{h.to_stage ?? "—"}</span>
                        </div>
                        <div className="mt-1 text-[11px] opacity-60">
                          {new Date(h.created_at).toLocaleString("en-IN")}
                          {h.changed_by_name ? ` · by ${h.changed_by_name}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
