"use client";
import React from "react";
import { format } from "date-fns";

export default function AppointmentCard({ ev, onClick }: { ev: any, onClick?: ()=>void }) {
  const start = format(new Date(ev.start), "HH:mm");
  const end = format(new Date(ev.end), "HH:mm");
  return (
    <div onClick={onClick} className="cursor-pointer p-2 rounded-lg bg-white/5 border border-white/6">
      <div className="flex justify-between items-center">
        <div className="text-sm font-semibold truncate">{ev.title}</div>
        <div className="text-xs opacity-60">{start} - {end}</div>
      </div>
      <div className="text-xs opacity-60">{ev?.doctor_name ?? "—"} • {ev?.room_name ?? "No room"}</div>
    </div>
  );
}
