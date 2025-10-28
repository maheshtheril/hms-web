// web/components/PatientInsightsCard.tsx
"use client";
import React from "react";
import { motion } from "framer-motion";

type Insight = {
  risk_score: number;
  gender_suggestion?: string | null;
  anomalies: any[];
  timeline_summary?: string | null;
  computed_at?: string | null;
};

export default function PatientInsightsCard({ insight }: { insight: Insight }) {
  const risk = insight?.risk_score ?? 0;
  const color = risk > 75 ? "bg-red-500" : risk > 40 ? "bg-yellow-400" : "bg-emerald-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-white/6 border border-white/8 backdrop-blur-2xl shadow-xl"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white/95">Patient Insights</h3>
          <p className="text-sm text-white/60 mt-1">
            Computed: {insight?.computed_at ? new Date(insight.computed_at).toLocaleString() : "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-white/60">Risk</div>
            <div className="text-2xl font-semibold">{risk}</div>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color} text-black font-bold`}>
            {Math.round(risk / 10)}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-sm text-white/70">Gender suggestion</div>
          <div className="text-sm text-white/90">{insight?.gender_suggestion ?? "Unknown"}</div>
        </div>

        <div>
          <div className="text-sm text-white/70">Timeline</div>
          <div className="text-sm text-white/80">{insight?.timeline_summary ?? "No timeline available."}</div>
        </div>

        <div>
          <div className="text-sm text-white/70">Anomalies</div>
          {insight?.anomalies?.length ? (
            <ul className="mt-2 space-y-1">
              {insight.anomalies.map((a: any, i: number) => (
                <li key={i} className="text-xs text-amber-200">
                  • {a.title}: <span className="text-white/70">{a.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/80">No anomalies detected</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
