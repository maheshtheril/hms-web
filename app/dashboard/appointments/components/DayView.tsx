"use client";

import React, { useRef, useState } from "react";
import { timeToY, yToTime, snapToGrid } from "./utils/calendar";
import ResourceLane from "./ResourceLane";

type PreviewShape = { start: string; end: string } | null;

export default function DayView({
  date,
  events,
  resources,
  onCreate,
  onMove,
  onResize,
}: any) {
  // typed ref for a div element
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<PreviewShape>(null);

  // mouse handlers typed as React handlers
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // guard - ref might be null (TS safe)
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // clamp within container
    const localY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const y = snapToGrid(localY);
    const start = yToTime(y);
    const end = yToTime(y + 24);

    setPreview({ start, end });
  };

  const onMouseUp = (e?: React.MouseEvent<HTMLDivElement>) => {
    if (!preview) return;

    onCreate?.({
      date,
      start: preview.start,
      end: preview.end,
    });

    setPreview(null);
  };

  const onMouseLeave = () => {
    // cancel preview when pointer leaves container
    setPreview(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className="relative h-[900px] glass p-2 overflow-hidden"
    >
      {/* Time grid */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="time-cell relative h-[37.5px]"> {/* example cell height */}
            <span className="absolute left-0 text-xs opacity-40">
              {i.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Resources */}
      <div className="absolute inset-0 flex">
        {resources?.map((r: any) => (
          <ResourceLane
            key={r.id}
            resource={r}
            events={events?.filter((ev: any) => ev.resource_id === r.id) ?? []}
            onMove={onMove}
            onResize={onResize}
          />
        ))}
      </div>

      {/* Create preview (positioning in pixels). timeToY returns a numeric grid Y. */}
      {preview && (
        <div
          className="app-slot-preview absolute bg-white/10 border border-white/8 rounded-md pointer-events-none"
          style={{
            top: `${timeToY(preview.start)}px`,
            height: `${timeToY(preview.end) - timeToY(preview.start)}px`,
            left: 0,
            right: 0,
          }}
        />
      )}
    </div>
  );
}
