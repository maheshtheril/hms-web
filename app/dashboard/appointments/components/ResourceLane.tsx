"use client";

import React, { useState, useRef } from "react";
import { timeToY, yToTime, snapToGrid } from "./utils/calendar";

type EventShape = {
  id: string;
  title?: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  resource_id?: string;
  color?: string;
};

type ResourceShape = {
  id: string;
  name: string;
};

type DragShape = {
  id: string;
  offset: number;
  original: {
    start: string;
    end: string;
  };
} | null;

export default function ResourceLane({
  resource,
  events = [],
  onMove,
  onResize,
}: {
  resource: ResourceShape;
  events: EventShape[];
  onMove?: (id: string, range: { start: string; end: string }) => void;
  onResize?: (id: string, range: { start: string; end: string }) => void;
}) {
  // typed ref for container div
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragShape>(null);

  // mouse down on an event: start dragging
  const onMouseDownEvent = (e: React.MouseEvent, eObj: EventShape) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // compute offset between mouse Y and event top
    const eventTop = timeToY(eObj.start);
    const offset = e.clientY - rect.top - eventTop;

    setDrag({
      id: eObj.id,
      offset,
      original: {
        start: eObj.start,
        end: eObj.end,
      },
    });

    // prevent text selection / native drag
    (e.target as HTMLElement).setPointerCapture?.((e as any).pointerId ?? 0);
    e.preventDefault();
  };

  // dragging: update event start/end while mouse moves
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const localY = e.clientY - rect.top - drag.offset;
    const newY = snapToGrid(localY);
    const durationGrid = timeToY(drag.original.end) - timeToY(drag.original.start);
    const newStart = yToTime(newY);
    const newEnd = yToTime(newY + durationGrid);

    onMove?.(drag.id, { start: newStart, end: newEnd });
  };

  const onMouseUp = (e?: React.MouseEvent) => {
    // release pointer capture defensively
    try {
      if (e?.target && (e.target as HTMLElement).releasePointerCapture) {
        (e.target as HTMLElement).releasePointerCapture((e as any).pointerId ?? 0);
      }
    } catch {
      /* ignore */
    }
    setDrag(null);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => setDrag(null)}
      className="relative flex-1 border-l border-white/5 min-h-[900px] select-none"
    >
      <div className="resource-label p-2 text-sm font-medium">{resource.name}</div>

      {events.map((ev) => {
        const top = timeToY(ev.start);
        const height = Math.max(1, timeToY(ev.end) - timeToY(ev.start));
        const background = ev.color ?? "rgba(99,102,241,0.4)";
        const borderColor = ev.color ?? "rgba(99,102,241,0.3)";

        return (
          <div
            key={ev.id}
            onMouseDown={(e) => onMouseDownEvent(e, ev)}
            className="app-slot cursor-move absolute left-2 right-2 rounded-md overflow-hidden"
            style={{
              top: `${top}px`,
              height: `${height}px`,
              background,
              border: `1px solid ${borderColor}`,
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(ke) => {
              // keyboard-friendly small nudges (optional)
              if (ke.key === "ArrowUp" || ke.key === "ArrowDown") {
                ke.preventDefault();
                const delta = ke.key === "ArrowUp" ? -12 : 12;
                const newY = snapToGrid(timeToY(ev.start) + delta);
                const newStart = yToTime(newY);
                const newEnd = yToTime(newY + (timeToY(ev.end) - timeToY(ev.start)));
                onMove?.(ev.id, { start: newStart, end: newEnd });
              }
            }}
          >
            <div className="text-xs p-1 truncate">{ev.title}</div>
          </div>
        );
      })}
    </div>
  );
}
