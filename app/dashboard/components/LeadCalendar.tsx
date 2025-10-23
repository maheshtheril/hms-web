"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { apiClient } from "@/lib/api-client";

/* IMPORTANT: FullCalendar CSS (required) */


/* Types */
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

const API_BASE = "scheduler/leads"; // interceptor adds /api

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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function isDateOnlyString(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// synthetic IDs look like "<leadId>:lead_follow_up:<iso>"
const isSyntheticId = (id?: string) => typeof id === "string" && id.includes(":");
const leadIdFromSynthetic = (id: string) => id.split(":")[0];

async function patchFollowUpOnLead(leadId: string, whenISO?: string | null) {
  // whenISO may be ISO string or YYYY-MM-DD or null
  let ymd: string | null = null;
  if (whenISO) {
    // if it's date-only, keep; if it's ISO try convert to YYYY-MM-DD
    if (isDateOnlyString(whenISO)) {
      ymd = whenISO;
    } else {
      const d = new Date(whenISO);
      if (!Number.isNaN(d.valueOf())) {
        ymd = toLocalDateOnly(d);
      } else {
        ymd = null;
      }
    }
  }
  return apiClient.patch(`/leads/${leadId}`, { meta: { follow_up_date: ymd } });
}

// Normalize server row into Sched
function normalizeRow(row: any): Sched | null {
  if (!row) return null;

  // lead id should come from explicit lead fields only — do NOT fallback to row.id
  const lead_id: string = row.lead_id || row.lead || row.contact_id || row.person_id || "";

  const leadName: string =
    row.lead_name || row.name || row.contact_name || row.person_name || "";

  let when: any =
    row.scheduled_at ||
    row.start ||
    row.date ||
    row.event_date ||
    row.due_date ||
    row.deadline;

  if (!when) return null;

  // Coerce:
  if (when instanceof Date) {
    when = when.toISOString();
  } else if (typeof when === "string") {
    when = when.trim();
    // keep date-only as-is
    if (!isDateOnlyString(when)) {
      const d = new Date(when);
      if (!Number.isNaN(d.valueOf())) {
        when = d.toISOString();
      }
    }
  }

  let title: string =
    row.title ||
    (row.kind === "lead_task"
      ? `${leadName || "Lead"} — Task due`
      : `${leadName || "Lead"} — Follow up`);

  const id: string =
    row.id || row.sched_id || row.task_id || `${lead_id || "lead"}:${row.kind || "lead_follow_up"}:${when}`;

  // standardized done detection
  const done_at: string | null =
    row.done_at ?? (row.status === "done" || row.status === "completed" ? new Date().toISOString() : null);

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
  const [editing, setEditing] = useState<
    Partial<Sched> & { id?: string; _isAllDay?: boolean } | null
  >(null);

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

      const normalized: Sched[] = (Array.isArray(raw) ? raw : []).map(normalizeRow).filter(Boolean) as Sched[];

      // log for dev
      if (process.env.NODE_ENV !== "production") {
        console.table(
          normalized.map((n) => ({
            id: n.id,
            lead_id: n.lead_id,
            title: n.title,
            scheduled_at: n.scheduled_at,
            done: !!n.done_at,
          }))
        );
      }

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
          start: it.scheduled_at,
          end: allDay ? it.scheduled_at : undefined,
          allDay,
          extendedProps: { lead_id: it.lead_id, done: !!it.done_at, note: it.note },
          classNames: ["lead-evt"].concat(it.done_at ? ["opacity-50"] : []),
        };
      }),
    [items]
  );

  function onDatesSet(info: any) {
    // info.start/info.end are Date objects (end is exclusive for month)
    setRange({ from: toLocalDateOnly(info.start), to: toLocalDateOnly(info.end) });
  }

  function onDateClick(arg: any) {
    setErr("");
    // clicking a date should default to a date-only (all-day) input if clicked from day cell
    const clickedIsAllDay = !!arg.allDay || arg.jsEvent?.target?.classList?.contains("fc-daygrid-day-frame");
    const defaultVal = clickedIsAllDay ? toLocalDateOnly(new Date(arg.date)) : toLocalInputValue(new Date(arg.date));
    setEditing({
      id: undefined,
      lead_id: "",
      title: "",
      note: "",
      scheduled_at: defaultVal,
      _isAllDay: clickedIsAllDay,
    });
    setOpen(true);
  }

  async function onEventDrop(arg: any) {
    try {
      const id = String(arg.event.id);
      if (!arg.event.start) return;

      // determine if the event is allDay after drop
      const isAllDay = arg.event.allDay === true;
      let payloadDate: string;
      if (isAllDay) {
        // send YYYY-MM-DD back for all-day items
        payloadDate = toLocalDateOnly(arg.event.start as Date);
      } else {
        payloadDate = (arg.event.start as Date).toISOString();
      }

      if (isSyntheticId(id)) {
        await patchFollowUpOnLead(leadIdFromSynthetic(id), payloadDate);
      } else {
        await apiClient.patch(`${API_BASE}/${id}`, { scheduled_at: payloadDate });
      }
    } catch (err) {
      // revert on failure
      if (typeof arg.revert === "function") arg.revert();
    } finally {
      if (range) fetchRange(range.from, range.to);
    }
  }

  function onEventClick(info: any) {
    const ev = info.event;
    const x = ev.extendedProps as any;
    setErr("");

    // If event.start is ISO but was originally date-only we detect by checking event.allDay or the stored scheduled_at
    const isAllDay = ev.allDay === true || (typeof ev.start === "string" && isDateOnlyString(ev.start as any));
    const scheduled = isAllDay
      ? // if original was date-only and `start` is a Date, convert to YYYY-MM-DD; if `start` is Date, produce YYYY-MM-DD
        isDateOnlyString(ev.start as any)
        ? (ev.start as any)
        : toLocalDateOnly(ev.start as Date)
      : toLocalInputValue(ev.start as Date);

    setEditing({
      id: ev.id,
      lead_id: x.lead_id,
      title: ev.title,
      note: x.note || "",
      scheduled_at: scheduled,
      _isAllDay: !!isAllDay,
    });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    setErr("");
    setSaving(true);
    try {
      // Determine payload scheduled_at preserving date-only if _isAllDay true
      let scheduledPayload: string | undefined;
      if (editing.scheduled_at) {
        if (editing._isAllDay || isDateOnlyString(String(editing.scheduled_at))) {
          // keep YYYY-MM-DD
          scheduledPayload = String(editing.scheduled_at);
        } else {
          // attempt to parse local datetime-local into ISO
          const d = new Date(String(editing.scheduled_at));
          if (Number.isNaN(d.valueOf())) throw new Error("Invalid date/time");
          scheduledPayload = d.toISOString();
        }
      }

      // Creating a new item
      if (!editing.id) {
        if (!editing.lead_id || !editing.title || !scheduledPayload) {
          throw new Error("lead_id, title, scheduled_at are required");
        }
        try {
          await apiClient.post(`${API_BASE}`, {
            lead_id: editing.lead_id,
            title: editing.title,
            note: editing.note,
            scheduled_at: scheduledPayload,
          });
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 404 || status === 501) {
            // fallback to storing follow_up_date on lead (date-only expected)
            await patchFollowUpOnLead(editing.lead_id, scheduledPayload);
          } else {
            throw e;
          }
        }
      } else {
        // Updating existing item
        if (isSyntheticId(editing.id)) {
          await patchFollowUpOnLead(leadIdFromSynthetic(editing.id), scheduledPayload);
        } else {
          await apiClient.patch(`${API_BASE}/${editing.id}`, {
            lead_id: editing.lead_id,
            title: editing.title,
            note: editing.note,
            scheduled_at: scheduledPayload,
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
        // clear follow_up_date on lead
        await patchFollowUpOnLead(leadIdFromSynthetic(editing.id), null);
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
          initialView="dayGridMonth"
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
          navLinks
          stickyHeaderDates
          expandRows
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
        />
      </div>

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
        /* ... your CSS (unchanged) ... */
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

                {/* Toggle input type based on whether this is an all-day / date-only event */}
                {editing._isAllDay ? (
                  <input
                    type="date"
                    className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"
                    value={editing.scheduled_at ? String(editing.scheduled_at) : ""}
                    onChange={(e) =>
                      setEditing({ ...editing, scheduled_at: e.target.value, _isAllDay: true })
                    }
                  />
                ) : (
                  <input
                    type="datetime-local"
                    className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2"
                    value={editing.scheduled_at || ""}
                    onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value, _isAllDay: false })}
                  />
                )}
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
