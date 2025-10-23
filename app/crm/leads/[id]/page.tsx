"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/* -------------------------------------------------------------------------- */
/* Neural Glass Design Language (Lead detail page — presentation cleanup)
   - added PageUp / PageDown keyboard support and floating up/down buttons
   - only UI helpers added; business logic/API unchanged (except safer error handling + toasts)
*/
/* -------------------------------------------------------------------------- */

/* types & helpers unchanged (kept exactly as before) */

type LeadMeta = {
  follow_up_date?: string | null;
  expected_revenue?: number | null;
  [k: string]: any;
};

interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  stage?: string | null;
  company_id?: string | null;
  owner_id?: string | null;
  pipeline_id?: string | null;
  stage_id?: string | null;
  estimated_value?: number | null;
  probability?: number | null;
  tags?: string[] | null;
  meta?: LeadMeta | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface LeadNote {
  id: string;
  body: string;
  author_id?: string | null;
  created_at: string;
}

interface LeadTask {
  id: string;
  title: string;
  status: "open" | "done" | "canceled";
  due_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
  completed_at?: string | null;
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
  id: string;
  name: string;
  pipeline_id?: string | null;
  order_index?: number | null;
}

const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const fmtMoney = (n?: number | null, frac: 0 | 2 = 0) =>
  n === null || n === undefined || isNaN(Number(n))
    ? "—"
    : (frac === 0 ? inr0 : inr2).format(Number(n));
const clampPct = (p?: number | null) =>
  p === null || p === undefined || isNaN(Number(p))
    ? null
    : Math.min(100, Math.max(0, Math.round(Number(p))));
const fmtDate = (d?: string | null) =>
  d
    ? new Date(d.length <= 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

function expectedRevenueOf(lead?: Lead | null) {
  if (!lead) return null;
  const metaER = lead.meta?.expected_revenue;
  if (metaER !== undefined && metaER !== null) return Number(metaER);
  const v = Number(lead.estimated_value ?? NaN);
  const p = clampPct(lead.probability);
  if (!isFinite(v) || p === null) return null;
  return Math.round(v * (p / 100) * 100) / 100;
}

function normalizeId(v: any): string {
  return v === null || v === undefined ? "" : String(v);
}

function latestHistoryStage(h: StageChange[] | undefined) {
  if (!h || h.length === 0) return { id: "", name: "" };
  const sorted = [...h].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
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

/* ------------------------------ Component --------------------------------- */

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const success = (title: string, description?: string) =>
    toast({ title, description });
  const error = (title: string, description?: string) =>
    toast({ title, description, variant: "destructive" });

  /* state (unchanged) */
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

  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stageSelId, setStageSelId] = useState<string>("");
  const [stageManual, setStageManual] = useState<string>("");

  /* refs for scrolling / keyboard */
  const mainRef = useRef<HTMLElement | null>(null);

  /* load functions (unchanged except safer catch handling) */
  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const { data } = await apiClient.get(`/leads/${id}`, {
        withCredentials: true,
      });
      const l: Lead = data.lead;
      setLead(l);
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setEdit({
        name: l.name || "",
        email: l.email || "",
        phone: l.phone || "",
        estimated_value:
          l.estimated_value != null ? String(l.estimated_value) : "",
        probability: l.probability != null ? String(l.probability) : "",
        follow_up_date: l.meta?.follow_up_date || "",
        expected_revenue:
          l.meta?.expected_revenue != null
            ? String(l.meta.expected_revenue)
            : "",
      });

      try {
        const hist = await apiClient.get(`/leads/${id}/history`, {
          withCredentials: true,
        });
        setHistory(Array.isArray(hist.data?.history) ? hist.data.history : []);
      } catch {
        setHistory([]);
      }
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Failed to load";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadStages() {
    try {
      setStagesLoading(true);
      const { data } = await apiClient.get("/stages", {
        withCredentials: true,
      });
      if (Array.isArray(data?.stages)) {
        const normalized: Stage[] = data.stages.map((s: any) => ({
          id: normalizeId(s.id),
          name: String(s.name ?? ""),
          pipeline_id: s.pipeline_id ? normalizeId(s.pipeline_id) : null,
          order_index:
            typeof s.order_index === "number"
              ? s.order_index
              : s.order_index
              ? Number(s.order_index)
              : null,
        }));
        const sorted = normalized.sort(
          (a, b) =>
            String(a.pipeline_id || "").localeCompare(
              String(b.pipeline_id || "")
            ) ||
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadStages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stages.length) return;
    const currId = normalizeId(lead?.stage_id);
    if (currId && stages.some((s) => s.id === currId)) {
      setStageSelId(currId);
      return;
    }
    const latest = latestHistoryStage(history);
    if (latest.id && stages.some((s) => s.id === latest.id)) {
      setStageSelId(latest.id);
    }
  }, [lead, stages, history]);

  const computedER = useMemo(() => {
    if (!edit.estimated_value || !edit.probability) return expectedRevenueOf(lead);
    const v = Number(edit.estimated_value),
      p = Number(edit.probability);
    if (!isFinite(v) || !isFinite(p)) return expectedRevenueOf(lead);
    return Math.round(v * (Math.min(100, Math.max(0, p)) / 100) * 100) / 100;
  }, [edit.estimated_value, edit.probability, lead]);

  const displayStageName = useMemo(() => {
    if (lead?.stage) return lead.stage;
    const byId = stages.find((s) => s.id === normalizeId(lead?.stage_id));
    if (byId?.name) return byId.name;
    const latest = latestHistoryStage(history);
    return latest.name || undefined;
  }, [lead, stages, history]);

  /* actions (safer catch handling + toast messages + optional notification dispatch) */
  async function patchLead(payload: any, toastMsg = "Saved") {
    try {
      setErr(null);
      await apiClient.patch(`/leads/${id}`, payload, { withCredentials: true });
      success(toastMsg);
      // notify app listeners (TopNav etc.) that something changed - listeners can decide what to do
      try {
        window.dispatchEvent(new CustomEvent("app:notification", { detail: { type: "lead_updated", set: undefined } }));
      } catch {}
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Update failed";
      setErr(msg);
      error("Update failed", msg);
    }
  }

  const saveBasics = () =>
    patchLead({
      name: edit.name || undefined,
      email: edit.email || undefined,
      phone: edit.phone || undefined,
      estimated_value: toNumOrUndef(edit.estimated_value),
      probability: toNumOrUndef(edit.probability),
    });

  const saveFollowUp = () =>
    patchLead(
      { meta: { follow_up_date: edit.follow_up_date || null } },
      "Follow-up updated"
    );
  const saveExpectedRevenue = () =>
    patchLead(
      { meta: { expected_revenue: toNumOrNull(edit.expected_revenue) } },
      "Expected revenue updated"
    );

  async function addNote(body: string) {
    if (!body.trim()) return;
    try {
      await apiClient.post(
        `/leads/${id}/notes`,
        { body },
        { withCredentials: true }
      );
      success("Note added");
      // increment global notification count so nav shows new activity
      try {
        window.dispatchEvent(new CustomEvent("app:notification", { detail: { type: "note_added", increment: 1 } }));
      } catch {}
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Add note failed";
      error("Add note failed", msg);
    }
  }

  async function addTask(title: string, due_date?: string) {
    if (!title.trim()) return;
    try {
      await apiClient.post(
        `/leads/${id}/tasks`,
        { title, due_date: due_date || null },
        { withCredentials: true }
      );
      success("Task added");
      try {
        window.dispatchEvent(new CustomEvent("app:notification", { detail: { type: "task_added", increment: 1 } }));
      } catch {}
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Add task failed";
      error("Add task failed", msg);
    }
  }

  async function setTaskStatus(
    taskId: string,
    status: "open" | "done" | "canceled"
  ) {
    try {
      await apiClient.patch(
        `/leads/${id}/tasks/${taskId}`,
        { status },
        { withCredentials: true }
      );
      success("Task updated");
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Update task failed";
      error("Update task failed", msg);
    }
  }

  async function closeLead(outcome: "won" | "lost") {
    const reason = window.prompt(`Reason for ${outcome}? (optional)`);
    try {
      await apiClient.post(
        `/leads/${id}/close`,
        { outcome, reason: reason || null },
        { withCredentials: true }
      );
      success(`Lead ${outcome}`);
      try {
        window.dispatchEvent(new CustomEvent("app:notification", { detail: { type: "lead_closed", increment: 1 } }));
      } catch {}
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Close failed";
      error("Close failed", msg);
    }
  }

  async function reopenLead() {
    try {
      await apiClient.post(`/leads/${id}/reopen`, {}, { withCredentials: true });
      success("Lead reopened");
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Reopen failed";
      error("Reopen failed", msg);
    }
  }

  async function moveStage() {
    try {
      let targetId = "";
      if (stageSelId) {
        targetId = stageSelId;
      } else if (stageManual.trim()) {
        const byName = stages.find(
          (s) => s.name.toLowerCase() === stageManual.trim().toLowerCase()
        );
        if (!byName?.id) {
          error("Move failed", "Unknown stage name. Please pick from the list.");
          return;
        }
        targetId = byName.id;
      } else {
        return;
      }

      // optimistic update
      const picked = stages.find((s) => s.id === targetId);
      setLead((prev) =>
        prev
          ? { ...prev, stage_id: targetId, stage: picked?.name ?? prev.stage }
          : prev
      );
      setStageSelId(targetId);
      setStageManual("");

      await apiClient.post(
        `/leads/${id}/move`,
        { lead_id: id, stage_id: targetId },
        { withCredentials: true }
      );
      success("Stage updated");
      await load();
    } catch (caught) {
      const e = caught as any;
      const msg = e?.response?.data?.error || e?.message || "Move failed";
      error("Move failed", msg);
    }
  }

  /* inline inputs */
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const isClosed = lead?.status === "won" || lead?.status === "lost";

  const baseButtonFocus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60";

  /* ---------- PageUp / PageDown handlers & helpers ---------- */

  // scrollBy one viewport (approx) inside the main content area
  const scrollByViewport = (direction: "down" | "up") => {
    const el = mainRef.current;
    if (!el) {
      // fallback to window
      const amount = window.innerHeight * 0.85;
      window.scrollBy({ top: direction === "down" ? amount : -amount, behavior: "smooth" });
      return;
    }
    const amount = el.clientHeight * 0.85;
    el.scrollBy({ top: direction === "down" ? amount : -amount, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // only respond when no modal input is focused (so user typing in a textarea/input isn't interrupted)
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable);
      if (isTyping) return;

      const isPageDown = e.key === "PageDown" || e.code === "PageDown";
      const isPageUp = e.key === "PageUp" || e.code === "PageUp";

      if (isPageDown) {
        // only prevent default if we actually handle it (so normal browser behavior isn't unexpectedly blocked)
        e.preventDefault();
        scrollByViewport("down");
      } else if (isPageUp) {
        e.preventDefault();
        scrollByViewport("up");
      }
    };

    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------ RENDER (cleaned layout) ------------------ */

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#030316] via-[#061226] to-[#041428] text-slate-50 antialiased">
      <main
        ref={(n) => {
          // keep ref to the scrolling container; it's the main element
          mainRef.current = n;
        }}
        // NOTE: constrain main's max height so it becomes a real scrolling region
        // (if main grows without constraint the window will scroll and el.scrollBy will be a no-op)
        className="mx-auto w-full max-w-screen-2xl px-6 py-8 overflow-y-auto max-h-[calc(100vh-96px)]"
        tabIndex={-1} // allow programmatic focus if needed
      >
        {/* header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#9be7ff] via-[#b38bff] to-[#ffb3c1]">
              Lead Detail
            </h1>
            <div className="mt-1 text-sm text-white/60">Neural Glass · Frosted CRM</div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.back()}
              aria-label="Go back"
              className={
                "rounded-full border border-cyan-400/30 bg-cyan-600/12 text-white hover:bg-cyan-600/20 px-4 py-2 text-sm font-medium shadow-[0_6px_18px_rgba(34,211,238,0.12)] backdrop-blur-md transition-colors " +
                baseButtonFocus
              }
            >
              ← Back
            </Button>

            {!isClosed ? (
              <>
                <Button
                  onClick={() => closeLead("won")}
                  className={
                    "rounded-full bg-gradient-to-r from-emerald-400/30 to-emerald-200/10 px-4 py-2 text-sm shadow-[0_8px_24px_rgba(16,185,129,0.08)] " +
                    baseButtonFocus
                  }
                >
                  Mark Won
                </Button>
                <Button
                  onClick={() => closeLead("lost")}
                  className={
                    "rounded-full bg-gradient-to-r from-rose-400/30 to-rose-200/10 px-4 py-2 text-sm shadow-[0_8px_24px_rgba(244,63,94,0.08)] " +
                    baseButtonFocus
                  }
                >
                  Mark Lost
                </Button>
              </>
            ) : (
              <Button
                onClick={reopenLead}
                className={
                  "rounded-full bg-amber-400/10 px-4 py-2 text-sm text-white " +
                  baseButtonFocus
                }
              >
                Reopen
              </Button>
            )}
          </div>
        </div>

        {/* error */}
        {err && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/6 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        {/* loading / not found */}
        {loading ? (
          <div className="opacity-70">Loading…</div>
        ) : !lead ? (
          <div className="opacity-70">Lead not found.</div>
        ) : (
          <div className="space-y-8">
            {/* Overview + Status (3-column responsive layout) */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Overview (left, spans 2 on md) */}
              <div className="md:col-span-2 rounded-3xl border border-white/8 bg-white/4 backdrop-blur-md p-6 shadow-lg">
                <div className="mb-3 text-[11px] uppercase tracking-wider text-white/60">
                  Overview
                </div>

                {/* form grid - consistent label/input blocks */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Lead Name</label>
                    <Input
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      className="mt-1 bg-black/30 border-white/8"
                      aria-label="Lead name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                    <Input
                      type="email"
                      value={edit.email}
                      onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                      className="mt-1 bg-black/30 border-white/8"
                      aria-label="Lead email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Phone</label>
                    <Input
                      value={edit.phone}
                      onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                      className="mt-1 bg-black/30 border-white/8"
                      aria-label="Lead phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Estimated Value (₹)</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={edit.estimated_value}
                      onChange={(e) => setEdit({ ...edit, estimated_value: e.target.value })}
                      className="mt-1 bg-black/30 border-white/8"
                      aria-label="Estimated value"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Probability (%)</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={edit.probability}
                      onChange={(e) => setEdit({ ...edit, probability: e.target.value })}
                      className="mt-1 bg-black/30 border-white/8"
                      aria-label="Probability percentage"
                    />
                  </div>

                  {/* show computed expected revenue as a read-only block that lines up with inputs */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Expected revenue (computed)</label>
                    <div className="mt-1 text-slate-100 font-medium">{fmtMoney(computedER, 2)}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm opacity-90">
                    {/* short helper — keeps layout compact */}
                    Changes will update the lead record when you save.
                  </div>
                  <Button onClick={saveBasics} className={"px-4 py-2 " + baseButtonFocus}>
                    Save Basics
                  </Button>
                </div>
              </div>

              {/* Status / Stage column (right) */}
              <div className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-md p-6 shadow-lg">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-white/60">Status</div>

                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-white/70">Current</div>
                    <div className="mt-1 inline-flex items-center rounded-full border border-white/6 px-3 py-1 text-xs bg-black/30">
                      {lead.status ?? "new"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-white/70">Stage</div>
                    <div className="mt-1 text-sm">{displayStageName ?? "—"}</div>
                  </div>
                </div>

                {/* Stage picker */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-white/70 mb-2">Move to Stage</label>

                  {stages.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
                        value={stageSelId}
                        onChange={(e) => {
                          setStageSelId(e.target.value);
                          setStageManual("");
                        }}
                        disabled={stagesLoading}
                        aria-label="Select stage"
                      >
                        <option value="">Select stage…</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      <Button
                        onClick={moveStage}
                        disabled={stagesLoading || (!stageSelId && !stageManual.trim())}
                        className="shrink-0 px-4 py-2"
                      >
                        Move
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type stage name (e.g., Qualified)"
                        value={stageManual}
                        onChange={(e) => setStageManual(e.target.value)}
                        className="bg-black/30 border-white/8"
                        aria-label="Manual stage name"
                      />
                      <Button onClick={moveStage} disabled={!stageManual.trim()} className="shrink-0 px-4 py-2">Move</Button>
                    </div>
                  )}

                  {stagesLoading && <div className="mt-2 text-xs opacity-60">Loading stages…</div>}
                </div>

                {/* Follow-up */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-white/70 mb-1">Follow-up date</label>
                  <Input
                    type="date"
                    value={edit.follow_up_date}
                    onChange={(e) => setEdit({ ...edit, follow_up_date: e.target.value })}
                    className="mt-1 bg-black/30 border-white/8"
                    aria-label="Follow-up date"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button onClick={saveFollowUp} className="px-4 py-2">Save Follow-up</Button>
                  </div>
                </div>

                {/* Expected revenue override */}
                
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-md p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Notes</div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <Textarea
                    rows={2}
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="bg-black/30 border-white/8"
                    aria-label="New note"
                  />
                  <Button
                    onClick={() => {
                      const v = noteText.trim();
                      if (!v) return;
                      setNoteText("");
                      addNote(v);
                    }}
                    className="px-4 py-2"
                  >
                    Add
                  </Button>
                </div>

                {notes.length === 0 ? (
                  <div className="text-sm opacity-60">No notes yet.</div>
                ) : (
                  <ul className="space-y-3">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-2xl border border-white/8 bg-black/30 p-3">
                        <div className="whitespace-pre-wrap text-sm">{n.body}</div>
                        <div className="mt-1 text-[11px] opacity-60">{new Date(n.created_at).toLocaleString("en-IN")}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Tasks */}
            <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-md p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Tasks</div>
              </div>

              <div className="mt-4 flex flex-col items-stretch gap-3 md:flex-row">
                <Input
                  className="min-w-0 flex-1 md:flex-[1_1_60%] bg-black/30 border-white/8"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  aria-label="Task title"
                />
                <Input
                  type="date"
                  className="w-full shrink-0 md:w-36 md:flex-none bg-black/30 border-white/8"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  aria-label="Task due date"
                />
                <Button
                  onClick={() => {
                    const t = taskTitle.trim();
                    if (!t) return;
                    const d = taskDue;
                    setTaskTitle("");
                    setTaskDue("");
                    addTask(t, d);
                  }}
                  className="shrink-0 md:flex-none px-4 py-2"
                >
                  Add Task
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-sm opacity-60">No tasks yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {tasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/30 p-3">
                        <div>
                          <div className="text-sm font-medium">
                            {t.title}
                            {t.status !== "open" && (
                              <span className={`ml-2 rounded-full border px-2 py-0.5 text-[11px] ${t.status === "done" ? "border-emerald-400/40 text-emerald-200" : "border-white/20 text-white/70"}`}>
                                {t.status}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] opacity-60">{t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"}</div>
                        </div>
                        <div className="flex gap-2">
                          {t.status !== "done" && <Button onClick={() => setTaskStatus(t.id, "done")} className="px-3 py-1">Mark Done</Button>}
                          {t.status === "open" && <Button variant="outline" onClick={() => setTaskStatus(t.id, "canceled")} className="px-3 py-1">Cancel</Button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Stage History */}
            <section className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-md p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-white/60">Stage history</div>
              </div>

              <div className="mt-4">
                {history.length === 0 ? (
                  <div className="text-sm opacity-60">No stage changes yet.</div>
                ) : (
                  <ul className="space-y-3">
                    {history.map((h) => (
                      <li key={h.id} className="rounded-2xl border border-white/8 bg-black/30 p-3">
                        <div className="text-sm">
                          <span className="opacity-70">Moved:</span>{" "}
                          <span className="font-medium">{h.from_stage ?? "—"}</span>{" "}
                          <span className="opacity-70">→</span>{" "}
                          <span className="font-medium">{h.to_stage ?? "—"}</span>
                        </div>
                        <div className="mt-1 text-[11px] opacity-60">{new Date(h.created_at).toLocaleString("en-IN")}{h.changed_by_name ? ` · by ${h.changed_by_name}` : ""}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating page-up / page-down controls (bottom-right) */}
      <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-3">
        <button
          aria-label="Page up"
          onClick={() => scrollByViewport("up")}
          className="rounded-full w-10 h-10 flex items-center justify-center bg-black/40 border border-white/8 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          title="Page Up (PageUp)"
        >
          ↑
        </button>

        <button
          aria-label="Page down"
          onClick={() => scrollByViewport("down")}
          className="rounded-full w-10 h-10 flex items-center justify-center bg-black/40 border border-white/8 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          title="Page Down (PageDown)"
        >
          ↓
        </button>
      </div>
    </div>
  );
}
