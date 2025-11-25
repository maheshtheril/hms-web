"use client";

import React from "react";
import { motion } from "framer-motion";

export interface TimelineItem {
  time: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface TimelineCardProps {
  items: TimelineItem[];
  title?: string;
}

export default function TimelineCard({ items, title }: TimelineCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-xl"
    >
      {title && (
        <div className="text-lg font-semibold mb-4 text-white/90">
          {title}
        </div>
      )}

      <div className="relative pl-6">
        {/* vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-white/10" />

        {items.map((item, index) => (
          <div key={index} className="relative mb-6">
            {/* Dot */}
            <div
              className="absolute left-0 top-1 w-3 h-3 rounded-full border-2"
              style={{
                borderColor: item.color ?? "rgba(255,255,255,0.4)",
              }}
            />

            <div className="ml-6">
              <div className="text-xs opacity-50 mb-1">{item.time}</div>
              <div className="text-sm font-semibold">{item.title}</div>
              {item.description && (
                <div className="text-xs opacity-60 mt-1">{item.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
