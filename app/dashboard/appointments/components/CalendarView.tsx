"use client";

import React, { useEffect, useMemo, useState } from "react";
import BookingModal from "./BookingModal";
import AppointmentCard from "./AppointmentCard";
import { startOfMonth, endOfMonth, addDays, format, startOfWeek } from "date-fns";

type EventShape = {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  doctor_id?: string;
  room_id?: string;
  patient_id?: string;
  status?: string;
};

export default function CalendarView({
  initialView = "month",
  companyId,
}: {
  initialView?: "month" | "week" | "day";
  companyId?: string;
}) {
  const [view, setView] = useState(initialView);
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<EventShape[]>([]);
  const [selected, setSelected] = useState<{ start: Date; end: Date } | null>(null);
  const [openModal, setOpenModal] = useState(false);

  // fetch events for visible range
  useEffect(() => {
    const fetchRange = async () => {
      const start = view === "month" ? startOfMonth(cursor) : startOfWeek(cursor);
      const end = view === "month" ? endOfMonth(cursor) : addDays(startOfWeek(cursor), 7);
      const qs = `?start=${start.toISOString()}&end=${end.toISOString()}${companyId ? `&company_id=${companyId}` : ""}`;
      const r = await fetch(`/api/appointments${qs}`, { credentials: "include" });
      const j = await r.json();
      setEvents(j?.appointments ?? []);
    };
    fetchRange().catch(console.error);
  }, [cursor, view, companyId]);

  const days = useMemo(() => {
    // month view: 6 weeks grid (42 days)
    const first = startOfMonth(cursor);
    const start = startOfWeek(first, { weekStartsOn: 1 }); // Mon
    const arr = Array.from({ length: 42 }).map((_, i) => addDays(start, i));
    return arr;
  }, [cursor]);

  const onSlotClick = (date: Date) => {
    const start = new Date(date);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30); // default slot 30m
    setSelected({ start, end });
    setOpenModal(true);
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCursor((d) => new Date(d.setMonth(d.getMonth() - 1)))} className="btn-glass">◀</button>
          <button onClick={() => setCursor(new Date())} className="btn-glass">Today</button>
          <button onClick={() => setCursor((d) => new Date(d.setMonth(d.getMonth() + 1)))} className="btn-glass">▶</button>
          <div className="ml-4 text-lg font-semibold">{format(cursor, "MMMM yyyy")}</div>
        </div>

        <div className="flex items-center gap-2">
          <select value={view} onChange={(e) => setView(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
      </div>

      {/* month grid */}
      <div className="grid grid-cols-7 gap-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="text-xs opacity-70 text-center py-1">{d}</div>
        ))}

        {days.map((day) => {
          const dayISO = day.toISOString();
          const dayEvents = events.filter(ev => new Date(ev.start).toDateString() === day.toDateString());
          return (
            <div key={dayISO} className="min-h-24 p-2 rounded-lg backdrop-blur-xl bg-white/3 border border-white/6">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">{format(day, "d")}</div>
                <button onClick={() => onSlotClick(day)} className="text-xs opacity-70">+ Book</button>
              </div>

              <div className="mt-2 flex flex-col gap-1">
                {dayEvents.slice(0,3).map(ev => (
                  <AppointmentCard key={ev.id} ev={ev} onClick={() => { setSelected({ start: new Date(ev.start), end: new Date(ev.end) }); setOpenModal(true); }} />
                ))}

                {dayEvents.length > 3 && <div className="text-xs opacity-60">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* booking modal */}
      {openModal && selected && (
        <BookingModal
          defaultStart={selected.start}
          defaultEnd={selected.end}
          onClose={() => setOpenModal(false)}
          onSaved={() => { setOpenModal(false); /* refresh events */ }}
        />
      )}
    </div>
  );
}
