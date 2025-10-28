"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PatientsForm from "../../PatientsForm";
import PatientInsightsCard from "@/components/PatientInsightsCard";
import { Button } from "@/components/ui/button";

export default function PatientEditPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<any | null>(null);
  const [insight, setInsight] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/hms/patients/${id}`)
      .then((r) => r.json())
      .then(setPatient)
      .finally(() => setLoading(false));
    // try fetch cached insights
    fetch(`/api/hms/patients/${id}/insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setInsight)
      .catch(() => null);
  }, [id]);

  const computeInsights = async () => {
    setInsightLoading(true);
    const r = await fetch(`/api/hms/patients/${id}/insights/compute`, { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      setInsight(j);
    }
    setInsightLoading(false);
  };

  if (!patient && loading) return <p className="text-white/60 p-10">Loading...</p>;
  if (!patient) return <p className="text-white/60 p-10">Patient not found</p>;

  return (
    <div className="grid lg:grid-cols-3 gap-8 p-8">
      <div className="lg:col-span-2">
        <PatientsForm patient={patient} />
      </div>

      <aside className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white/95">Intelligence</h2>
          <Button onClick={computeInsights} disabled={insightLoading}>
            {insightLoading ? "Computing..." : "Recompute"}
          </Button>
        </div>

        <PatientInsightsCard insight={insight ?? { risk_score: 0, anomalies: [] }} />
      </aside>
    </div>
  );
}
