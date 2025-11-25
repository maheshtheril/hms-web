"use client";

import React, { useState } from "react";
import WeekView from "./WeekView";
import DayView from "./DayView";

export default function AdvancedCalendar({
  events,
  resources,
  onCreate,
  onMove,
  onResize,
}: any) {
  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setCursor(new Date())} className="glass px-4 py-2">
            Today
          </button>
          <button
            onClick={() => setCursor((d) => new Date(d.setDate(d.getDate() - 7)))}
            className="glass px-4 py-2"
          >
            ◀
          </button>
          <button
            onClick={() => setCursor((d) => new Date(d.setDate(d.getDate() + 7)))}
            className="glass px-4 py-2"
          >
            ▶
          </button>
        </div>

        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="glass px-4 py-2"
        >
          <option value="week">Week</option>
          <option value="day">Day</option>
        </select>
      </div>

      {/* Views */}
      {view === "week" && (
        <WeekView
          date={cursor}
          events={events}
          resources={resources}
          onCreate={onCreate}
          onMove={onMove}
          onResize={onResize}
        />
      )}

      {view === "day" && (
        <DayView
          date={cursor}
          events={events}
          resources={resources}
          onCreate={onCreate}
          onMove={onMove}
          onResize={onResize}
        />
      )}
    </div>
  );
}
