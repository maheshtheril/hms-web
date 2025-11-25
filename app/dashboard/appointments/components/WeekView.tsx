"use client";

import React, { useMemo, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import DayView from "./DayView";
import { Resource } from "./types";

export default function WeekView({
  date,
  events,
  resources,
  onCreate,
  onMove,
  onResize,
}: {
  date: Date;
  events: any[];
  resources: Resource[];
  onCreate: any;
  onMove: any;
  onResize: any;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date]);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {days.map((d) => (
          <div key={d.toISOString()} className="flex-1 glass p-2 text-center">
            <div className="text-sm font-semibold">{format(d, "EEE dd")}</div>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((d) => (
          <DayView
            key={d.toISOString()}
            date={d}
            events={events.filter(
              (ev) => new Date(ev.start).toDateString() === d.toDateString()
            )}
            resources={resources}
            onCreate={onCreate}
            onMove={onMove}
            onResize={onResize}
          />
        ))}
      </div>
    </div>
  );
}
