"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * TimelineCard
 * - Accepts either `items` (new) or `events` (legacy) for backwards compatibility
 * - Strongly typed
 */

export type TimelineEntry = {
  // support both shapes you used: { type, label, date } and { time, title, description }
  type?: string;
  label?: string;
  date?: string;       // ISO date or date string
  time?: string;       // optional time e.g. "09:00"
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
};

export interface TimelineCardProps {
  title?: React.ReactNode;
  items?: TimelineEntry[]; // canonical prop
  events?: TimelineEntry[]; // legacy prop many pages may still use
  className?: string;
}

export default function TimelineCard({
  title,
  items,
  events,
  className = "",
}: TimelineCardProps) {
  // normalize incoming props: prefer items, fallback to events
  const list: TimelineEntry[] = Array.isArray(items)
    ? items
    : Array.isArray(events)
    ? events
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl ${className}`}
    >
      {title && <div className="text-lg font-semibold mb-4">{title}</div>}

      <div className="relative pl-6">
        {/* vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-white/10" />

        {list.length === 0 ? (
          <div className="text-sm opacity-50 py-6 text-center">No timeline events</div>
        ) : (
          list.map((item, index) => {
            // attempt to build friendly display values
            const timeLabel = item.time ?? item.date ?? "";
            const heading = item.title ?? item.label ?? "(untitled)";
            const desc = item.description ?? (item.type ? `Type: ${item.type}` : "");

            return (
              <div key={index} className="relative mb-6">
                {/* Dot */}
                <div
                  className="absolute left-0 top-1 w-3 h-3 rounded-full border-2"
                  style={{ borderColor: item.color ?? "rgba(255,255,255,0.4)" }}
                />

                <div className="ml-6">
                  {timeLabel && <div className="text-xs opacity-50 mb-1">{timeLabel}</div>}
                  <div className="text-sm font-semibold">{heading}</div>
                  {desc && <div className="text-xs opacity-60 mt-1">{desc}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
