"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { apiClient } from "@/lib/api-client";

// The server can return a bunch of different shapes.
// We normalize them into this:
type Sched = {
  id: string;
  lead_id: string;
  scheduled_at: string; // ISO or YYYY-MM-DD
  title: string;
  note?: string | null;
  assignee_id?: string | null;
  done_at?: string | null;
};

type Eventish = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: { lead_id: string; done: boolean; note?: string | null };
  classNames?: string[];
};

const API_BASE = "scheduler/leads"; // let the interceptor add /api


// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function toLocalDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function isDateOnlyString(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// synthetic IDs look like "<leadId>:lead_follow_up:<iso>"
const isSyntheticId = (id?: string) => typeof id === "string" && id.includes(":");
const leadIdFromSynthetic = (id: string) => id.split(":")[0];

// patch follow_up_date on the lead (YYYY-MM-DD)
async function patchFollowUpOnLead(leadId: string, whenISO?: string) {
  const pad = (n: number) => String(n).padStart(2, "0");
  let ymd: string | null = null;
  if (whenISO) {
    const d = new Date(whenISO);
    ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return apiClient.patch(`/leads/${leadId}`, { meta: { follow_up_date: ymd } });
}

// Normalize any server row into a Sched
function normalizeRow(row: any): Sched | null {
  if (!row) return null;

  // Figure out the lead id and lead name (used to build titles)
  const lead_id: string =
    row.lead_id || row.lead || row.contact_id || row.person_id || row.id || "";
  const leadName: string =
    row.lead_name || row.name || row.contact_name || row.person_name || "";

  // Figure out the date/time field (prefer actual timestamp if present)
  let when: any =
    row.scheduled_at ||
    row.start ||
    row.date ||
    row.event_date ||
    row.due_date ||
    row.deadline;

  if (!when) return null;

  // Coerce "when" into something FullCalendar will understand.
  // If it's a Date -> ISO. If it's "YYYY-MM-DD" keep as-is for all-day.
  if (when instanceof Date) {
    when = when.toISOString();
  } else if (typeof when === "string") {
    when = when.trim();
    if (!isDateOnlyString(when)) {
      const d = new Date(when);
      if (!Number.isNaN(d.valueOf())) {
        when = d.toISOString();
      }
    }
  }

  // Title: prefer explicit row.title, otherwise build one
  let title: string =
    row.title ||
    (row.kind === "lead_task"
      ? `${leadName || "Lead"} — Task due`
      : `${leadName || "Lead"} — Follow up`);

  // Build a stable id
  const id: string =
    row.id ||
    row.sched_id ||
    row.task_id ||
    `${lead_id || "lead"}:${row.kind || "lead_follow_up"}:${when}`;

  const done_at: string | null =
    row.done_at || (row.status === "done" || row.status === "completed" ? "1970-01-01T00:00:00.000Z" : null);

  return {
    id,
    lead_id,
    scheduled_at: when,
    title,
    note: row.note ?? row.notes ?? null,
    assignee_id: row.assignee_id ?? row.assigned_to ?? null,
    done_at,
  };
}

export default function LeadCalendar() {
  const [items, setItems] = useState<Sched[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<Sched> & { id?: string } | null>(null);

  const fetchRange = useCallback(async (from: string, to: string) => {
    try {
      const r = await apiClient.get(`${API_BASE}`, {
        params: { date_from: from, date_to: to, page: 1, pageSize: 1000 },
      });

      const payload = r.data || {};
      const raw =
        payload.events ||
        payload.items ||
        payload.data ||
        payload.rows ||
        payload.results ||
        (Array.isArray(payload) ? payload : []);

      const normalized: Sched[] = (Array.isArray(raw) ? raw : [])
        .map(normalizeRow)
        .filter(Boolean) as Sched[];

      console.table(
        normalized.map((n) => ({
          id: n.id,
          lead_id: n.lead_id,
          title: n.title,
          scheduled_at: n.scheduled_at,
          done: !!n.done_at,
        }))
      );

      setItems(normalized);
    } catch (e) {
if (process.env.NODE_ENV !== "production") {
    console.warn(`GET ${API_BASE} failed`, e);
  }
  setItems([]);

    }
  }, []);

  useEffect(() => {
    if (range) fetchRange(range.from, range.to);
  }, [range, fetchRange]);

  const events: Eventish[] = useMemo(
    () =>
      items.map((it) => {
        const allDay = typeof it.scheduled_at === "string" && isDateOnlyString(it.scheduled_at);
        return {
          id: it.id,
          title: it.title || `Lead ${it.lead_id}`,
          start: it.scheduled_at, // ISO or YYYY-MM-DD
          end: allDay ? it.scheduled_at : undefined,
          allDay,
          extendedProps: { lead_id: it.lead_id, done: !!it.done_at, note: it.note },
          classNames: ["lead-evt"].concat(it.done_at ? ["opacity-50"] : []),
        };
      }),
    [items]
  );

  function onDatesSet(info: any) {
    setRange({ from: toLocalDateOnly(info.start), to: toLocalDateOnly(info.end) });
  }

  function onDateClick(arg: any) {
    setErr("");
    setEditing({
      id: undefined,
      lead_id: "",
      title: "",
      note: "",
      scheduled_at: toLocalInputValue(new Date(arg.date)),
    });
    setOpen(true);
  }

  async function onEventDrop(arg: any) {
    try {
      const id = String(arg.event.id);
      const newISO = arg.event.start?.toISOString();
      if (!newISO) return;

      if (isSyntheticId(id)) {
        await patchFollowUpOnLead(leadIdFromSynthetic(id), newISO);
      } else {
        await apiClient.patch(`${API_BASE}/${id}`, { scheduled_at: newISO });
      }
    } catch {
      arg.revert();
    } finally {
      if (range) fetchRange(range.from, range.to);
    }
  }

  function onEventClick(info: any) {
    const ev = info.event;
    const x = ev.extendedProps as any;
    setErr("");
    setEditing({
      id: ev.id,
      lead_id: x.lead_id,
      title: ev.title,
      note: x.note || "",
      scheduled_at: toLocalInputValue(ev.start as Date),
    });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    setErr("");
    setSaving(true);
    try {
      const scheduledISO =
        editing.scheduled_at ? new Date(editing.scheduled_at).toISOString() : undefined;

      // Creating a new item
      if (!editing.id) {
        if (!editing.lead_id || !editing.title || !scheduledISO) {
          throw new Error("lead_id, title, scheduled_at are required");
        }
        // Try scheduler first; if it doesn't exist (404/501), fall back to storing on the lead
        try {
          await apiClient.post(`${API_BASE}`, {
            lead_id: editing.lead_id,
            title: editing.title,
            note: editing.note,
            scheduled_at: scheduledISO,
          });
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 404 || status === 501) {
            await patchFollowUpOnLead(editing.lead_id, scheduledISO);
          } else {
            throw e;
          }
        }
      }
      // Updating an existing item
      else {
        if (isSyntheticId(editing.id)) {
          await patchFollowUpOnLead(leadIdFromSynthetic(editing.id), scheduledISO);
        } else {
          await apiClient.patch(`${API_BASE}/${editing.id}`, {
            lead_id: editing.lead_id,
            title: editing.title,
            note: editing.note,
            scheduled_at: scheduledISO,
          });
        }
      }

      setOpen(false);
      setEditing(null);
      if (range) await fetchRange(range.from, range.to);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function markDone() {
    if (!editing?.id) return;
    setSaving(true);
    setErr("");
    try {
      if (isSyntheticId(editing.id)) {
        // clear follow_up_date on the lead
        await patchFollowUpOnLead(leadIdFromSynthetic(editing.id), undefined);
      } else {
        await apiClient.patch(`${API_BASE}/${editing.id}`, { done: true });
      }
      setOpen(false);
      setEditing(null);
      if (range) await fetchRange(range.from, range.to);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing?.id) return;
    setSaving(true);
    setErr("");
    try {
      if (isSyntheticId(editing.id)) {
        // delete synthetic = clear on lead
        await apiClient.patch(`/leads/${leadIdFromSynthetic(editing.id)}`, {
          meta: { follow_up_date: null },
        });
      } else {
        await apiClient.delete(`${API_BASE}/${editing.id}`);
      }
      setOpen(false);
      setEditing(null);
      if (range) await fetchRange(range.from, range.to);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="lead-calendar rounded-2xl border border-white/10 bg-[#0b0b0b] p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"               // ⬅️ Start on month view
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="auto"
          nowIndicator
          editable
          selectable
          events={events}
          datesSet={onDatesSet}
          dateClick={onDateClick}
          eventClick={onEventClick}
          eventDrop={onEventDrop}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          navLinks                         // click day/week names to navigate
          stickyHeaderDates
          expandRows
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
        />
      </div>

      {/* Dark theme + nicer styling (no external CSS needed) */}
      <style jsx global>{`
        .lead-calendar {
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255, 255, 255, 0.03);
          --fc-neutral-text-color: #cbd5e1;
          --fc-border-color: rgba(255, 255, 255, 0.1);

          --fc-button-text-color: #e5e7eb;
          --fc-button-bg-color: #111827;
          --fc-button-border-color: #374151;
          --fc-button-hover-bg-color: #1f2937;
          --fc-button-hover-border-color: #4b5563;
          --fc-button-active-bg-color: #2563eb;
          --fc-button-active-border-color: #2563eb;

          --fc-today-bg-color: rgba(59, 130, 246, 0.12);

          --fc-event-bg-color: #2563eb;
          --fc-event-border-color: #2563eb;
          --fc-event-text-color: #ffffff;

          --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.06);
        }

        /* Header (day names) visible on dark bg */
        .lead-calendar .fc .fc-col-header,
        .lead-calendar .fc .fc-col-header-cell-cushion {
          background: transparent !important;
          color: #e5e7eb !important; /* day names */
          font-weight: 600;
        }

        /* Month day numbers */
        .lead-calendar .fc .fc-daygrid-day-number {
          color: #cbd5e1;
          font-weight: 500;
        }

        /* Title styling */
        .lead-calendar .fc .fc-toolbar-title {
          color: #f3f4f6;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        /* Buttons rounded & subtle shadow */
        .lead-calendar .fc .fc-button {
          border-radius: 10px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
        }

        /* Grid cell hover */
        .lead-calendar .fc .fc-daygrid-day-frame:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        /* Event look */
        .lead-calendar .lead-evt .fc-event-main {
          padding: 2px 6px;
          font-weight: 600;
        }

        /* Done/complete feel */
        .lead-calendar .opacity-50 .fc-event-main {
          text-decoration: line-through;
          opacity: 0.7;
        }
      `}</style>

      {open && editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-16 max-w-xl rounded-2xl border border-white/10 bg-[#0b0b0b] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold mb-2">{editing.id ? "Edit follow-up" : "New follow-up"}</div>
            {err && <div className="text-red-400 text-sm mb-2">{err}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <div className="text-xs text-white/60">Lead ID</div>
                <input
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"
                  value={editing.lead_id || ""}
                  onChange={(e) => setEditing({ ...editing, lead_id: e.target.value })}
                />
              </label>

              <label className="space-y-1">
                <div className="text-xs text-white/60">When</div>
                <input
                  type="datetime-local"
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"
                  value={editing.scheduled_at || ""}
                  onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value })}
                />
              </label>

              <label className="md:col-span-2 space-y-1">
                <div className="text-xs text-white/60">Title</div>
                <input
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </label>

              <label className="md:col-span-2 space-y-1">
                <div className="text-xs text-white/60">Note (optional)</div>
                <textarea
                  rows={3}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"
                  value={editing.note || ""}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2 justify-between">
              {editing.id ? (
                <button
                  onClick={remove}
                  disabled={saving}
                  className="text-red-300 border border-red-500/30 hover:bg-red-500/10 rounded-lg px-3 py-2 text-sm"
                >
                  Delete
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                {editing.id && (
                  <button
                    onClick={markDone}
                    disabled={saving}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    Mark done
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                >
                  {editing.id ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
