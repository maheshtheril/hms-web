"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// FullCalendar plugins (loaded client-side)
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // drag / select
import listPlugin from "@fullcalendar/list";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";

// UI primitives (shadcn / tailwind friendly)
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// FullCalendar React component must be dynamically imported to avoid SSR issues
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

export type NeuralEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end?: string; // ISO
  allDay?: boolean;
  extendedProps?: Record<string, any>;
};

export default function NeuralCalendar({
  initialEvents,
  defaultView = "timeGridWeek",
}: {
  initialEvents?: NeuralEvent[];
  defaultView?: string;
}) {
  const [events, setEvents] = useState<NeuralEvent[]>(
    initialEvents ?? [
      {
        id: "1",
        title: "Initial: Standup",
        start: new Date().toISOString().slice(0, 10) + "T09:30:00",
        end: new Date().toISOString().slice(0, 10) + "T10:00:00",
      },
    ]
  );

  const calendarRef = useRef<any>(null);
  const [view, setView] = useState<string>(defaultView);

  // Dialog state for viewing / editing event
  const [open, setOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<NeuralEvent | null>(null);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    const title = prompt("Event title:", "New event");
    if (title) {
      const newEvent: NeuralEvent = {
        id: String(Date.now()),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr ?? undefined,
        allDay: selectInfo.allDay,
      };
      setEvents((prev) => [...prev, newEvent]);
    }
    // clear selection
    const calendarApi = calendarRef.current?.getApi?.();
    if (calendarApi) calendarApi.unselect();
  }, []);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const ev = clickInfo.event;
    setActiveEvent({
      id: ev.id,
      title: ev.title,
      start: ev.start?.toISOString() ?? "",
      end: ev.end?.toISOString() ?? undefined,
      allDay: ev.allDay ?? false,
      extendedProps: { ...ev.extendedProps },
    });
    setOpen(true);
  }, []);

  const deleteActiveEvent = () => {
    if (!activeEvent) return;
    setEvents((prev) => prev.filter((e) => e.id !== activeEvent.id));
    setOpen(false);
  };

  const calendarHeader = (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setView("dayGridMonth")}>Month</Button>
        <Button size="sm" onClick={() => setView("timeGridWeek")}>Week</Button>
        <Button size="sm" onClick={() => setView("timeGridDay")}>Day</Button>
        <Button size="sm" onClick={() => setView("listWeek")}>List</Button>
      </div>
      <div className="text-sm text-neutral-300">Neural Glass Calendar — interactive</div>
    </div>
  );

  const fcProps = useMemo(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: view,
    headerToolbar: false,
    selectable: true,
    editable: true,
    events: events as any,
    select: handleDateSelect,
    eventClick: handleEventClick,
    height: "auto",
    nowIndicator: true,
  }), [events, handleDateSelect, handleEventClick, view]);

  return (
    <Card className="p-0 overflow-hidden">
      {calendarHeader}

      <div className="px-3 pb-4">
        {/* FullCalendar (client-only) */}
        <div className="rounded-lg bg-neutral-900/40 p-2">
          <FullCalendar ref={calendarRef} {...fcProps} />
        </div>
      </div>

      {/* Event dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeEvent?.title ?? "Event"}</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            <p className="text-sm">Start: {activeEvent?.start ?? "-"}</p>
            <p className="text-sm">End: {activeEvent?.end ?? "-"}</p>
            {activeEvent?.extendedProps && (
              <pre className="mt-2 text-xs rounded bg-neutral-800 p-2">{JSON.stringify(activeEvent.extendedProps, null, 2)}</pre>
            )}
          </div>

          <DialogFooter>
            <Button variant="destructive" onClick={deleteActiveEvent}>Delete</Button>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/*
USAGE

Place this file as: components/NeuralCalendar.tsx
Make sure you already imported FullCalendar CSS in app/layout.tsx as shown previously.

Example:

import NeuralCalendar from "@/components/NeuralCalendar";

export default function Page() {
  return (
    <div className="p-6">
      <NeuralCalendar />
    </div>
  );
}

Notes:
- This is a client component ("use client"), uses dynamic import for FullCalendar to avoid SSR.
- The component ships a small event create flow (select on calendar -> prompt title).
- Replace prompt() flows with a modal form if you need better UX or server sync.
- For persistence, wire `events` state to your API (fetch/save) and consider optimistically updating.
- If you want drag-and-drop event updates, handle `eventDrop` and `eventResize` callbacks and sync changes.
*/
