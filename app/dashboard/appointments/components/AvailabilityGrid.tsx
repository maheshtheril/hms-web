"use client";
import React, { useState } from "react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TIMES = Array.from({length: 24}, (_,i)=>`${i.toString().padStart(2,"0")}:00`);

export default function AvailabilityGrid({ defaultAvailability = {}, onSave }: any) {
  // defaultAvailability: { "mon": [{start:"09:00",end:"12:00"}, ...], ... }
  const [avail, setAvail] = useState<any>(defaultAvailability);

  const toggleSlot = (day:string, time:string) => {
    const key = day.toLowerCase();
    const set = new Set((avail[key] || []).map((x:string)=>x));
    const v = time;
    if (set.has(v)) set.delete(v); else set.add(v);
    setAvail({...avail, [key]: Array.from(set)});
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2 items-center">
        <div />
        {DAYS.map(d=> <div key={d} className="text-xs opacity-70 text-center">{d}</div>)}
      </div>

      <div className="max-h-96 overflow-auto border border-white/6 rounded-lg p-2">
        {TIMES.map(t=> (
          <div key={t} className="grid grid-cols-8 gap-2 items-center">
            <div className="text-xs opacity-60">{t}</div>
            {DAYS.map(d=>{
              const key = d.toLowerCase();
              const active = (avail[key] || []).includes(t);
              return (
                <button key={d+t} onClick={()=>toggleSlot(d,t)} className={`w-full py-1 rounded ${active ? "bg-green-400/20 border border-green-500/30" : "bg-white/3 border border-white/6"}`}>
                  &nbsp;
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 rounded-xl border border-white/10" onClick={()=>onSave(avail)}>Save</button>
      </div>
    </div>
  );
}
