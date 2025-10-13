// web/app/dashboard/leads/calendar/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg, EventDropArg } from "@fullcalendar/interaction";
import { apiClient } from "@/lib/api-client";

type Sched = {
  id: string;
  lead_id: string;
  scheduled_at: string; // ISO
  title: string;
  note?: string | null;
  assignee_id?: string | null;
  done_at?: string | null;
};

type Eventish = {
  id: string;
  title: string;
  start: string;
  extendedProps: { lead_id: string; done: boolean; note?: string | null };
  display?: "auto" | "background" | "inverse-background" | "none";
  classNames?: string[];
};

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function LeadCalendarPage() {
  const [items, setItems] = useState<Sched[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // modal state (create/update)
  const [editing, setEditing] = useState<Partial<Sched> & { id?: string } | null>(null);

  const fetchRange = useCallback(async (from: string, to: string) => {
    const r = await apiClient.get("/scheduler/leads", {
      params: { date_from: from, date_to: to, page: 1, pageSize: 1000 },
    });
    setItems(r.data?.items || []);
  }, []);

  // load when range changes
  useEffect(() => {
    if (range) fetchRange(range.from, range.to).catch(() => {});
  }, [range, fetchRange]);

  const events: Eventish[] = useMemo(() => {
    return items.map((it) => ({
      id: it.id,
      title: it.title || `Lead ${it.lead_id}`,
      start: it.scheduled_at,
      extendedProps: { lead_id: it.lead_id, done: Boolean(it.done_at), note: it.note },
      classNames: it.done_at ? ["opacity-50"] : [],
    }));
  }, [items]);

  // FullCalendar -> when visible dates change, set range
  function onDatesSet(info: any) {
    const from = toDateOnly(info.start);
    const to = toDateOnly(info.end); // FC gives end = first day after visible range
    setRange({ from, to });
  }

  // click a day to create
  function onDateClick(arg: DateClickArg) {
    setErr("");
    setEditing({
      id: undefined,
      lead_id: "",
      title: "",
      note: "",
      scheduled_at: new Date(arg.date).toISOString().slice(0, 16), // input[datetime-local] format w/o seconds
    });
    setOpen(true);
  }

  // drag/drop to change time
  async function onEventDrop(arg: EventDropArg) {
    try {
      const newISO = arg.event.start?.toISOString();
      if (!newISO) return;
      await apiClient.patch(`/scheduler/leads/${arg.event.id}`, { scheduled_at: newISO });
    } catch (e) {
      // revert on error
      arg.revert();
    } finally {
      // refresh
      if (range) fetchRange(range.from, range.to).catch(() => {});
    }
  }

  // click event to edit
  function onEventClick(info: any) {
    const ev = info.event;
    const x = ev.extendedProps as any;
    setErr("");
    setEditing({
      id: ev.id,
      lead_id: x.lead_id,
      title: ev.title,
      note: x.note || "",
      scheduled_at: (ev.start as Date)?.toISOString().slice(0, 16),
    });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    setErr("");
    setSaving(true);
    try {
      const payload = {
        lead_id: editing.lead_id,
        title: editing.title,
        note: editing.note,
        scheduled_at: editing.scheduled_at ? new Date(editing.scheduled_at).toISOString() : undefined,
      };

      if (!editing.id) {
        // create
        if (!payload.lead_id || !payload.title || !payload.scheduled_at) {
          throw new Error("lead_id, title, scheduled_at are required");
        }
        await apiClient.post("/scheduler/leads", payload);
      } else {
        // update
        await apiClient.patch(`/scheduler/leads/${editing.id}`, payload);
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
      await apiClient.patch(`/scheduler/leads/${editing.id}`, { done: true });
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
      await apiClient.delete(`/scheduler/leads/${editing.id}`);
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm opacity-70">Lead follow-ups calendar</div>
        <div className="ml-auto text-xs text-white/50">Drag events to reschedule • Click to edit</div>
      </div>

      <div className="rounded-xl border border-white/10 p-2">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
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
        />
      </div>

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
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
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
    </div>
  );
}
