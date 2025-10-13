"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";

// Fake data (replace with your API data)
const leadTrend = [
  { day: "Aug 20", leads: 12, qualified: 4 },
  { day: "Aug 25", leads: 18, qualified: 6 },
  { day: "Aug 30", leads: 22, qualified: 8 },
  { day: "Sep 04", leads: 28, qualified: 10 },
  { day: "Sep 09", leads: 24, qualified: 11 },
  { day: "Sep 14", leads: 32, qualified: 14 },
  { day: "Sep 18", leads: 36, qualified: 16 },
];

const sourceData = [
  { source: "Website", count: 48 },
  { source: "Ads", count: 32 },
  { source: "Referral", count: 18 },
  { source: "Events", count: 12 },
  { source: "Partners", count: 10 },
];

export default function ChartsClient() {
  const maxY = useMemo(() => Math.max(...leadTrend.map(d => d.leads)) + 5, []);
  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Area chart — Leads & Qualified over time */}
      <div className="lg:col-span-2 rounded-xl border border-white/10 bg-zinc-950/40 p-3">
        <h4 className="px-1 pt-1 text-xs font-semibold text-white/70">Leads & Qualified (last 30d)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={leadTrend} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="lead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="qual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
              <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,.6)", fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0, maxY]} tick={{ fill: "rgba(255,255,255,.6)", fontSize: 12 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background: "rgba(24,24,27,.92)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "white" }}/>
              <Area type="monotone" dataKey="leads" stroke="currentColor" fill="url(#lead)" strokeWidth={2} />
              <Area type="monotone" dataKey="qualified" stroke="currentColor" fill="url(#qual)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart — Leads by Source */}
      <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3">
        <h4 className="px-1 pt-1 text-xs font-semibold text-white/70">Leads by Source</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceData} margin={{ left: 6, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
              <XAxis dataKey="source" tick={{ fill: "rgba(255,255,255,.6)", fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: "rgba(255,255,255,.6)", fontSize: 12 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background: "rgba(24,24,27,.92)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "white" }}/>
              <Legend wrapperStyle={{ color: "rgba(255,255,255,.7)" }} />
              <Bar dataKey="count" fill="currentColor" radius={[10,10,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
