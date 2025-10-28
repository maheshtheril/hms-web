// web/app/hms/patients/[id]/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { fetchPatient, generateAiSummary } from "../hooks";
import { useParams } from "next/navigation";

export default function PatientView() {
  const params = useParams();
  const id = (params as any).id;
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const p = await fetchPatient(id);
        setPatient(p);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function onGenerateSummary() {
    setAiLoading(true);
    try {
      const s = await generateAiSummary(id);
      setAiSummary(s);
    } catch (err) {
      alert("AI summary failed");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!patient) return <div className="p-6">Patient not found</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">{patient.first_name} {patient.last_name}</h1>
      <div className="mb-4">
        <strong>Patient #:</strong> {patient.patient_number || "—"}
      </div>
      <div className="mb-2"><strong>DOB:</strong> {patient.dob || "—"}</div>
      <div className="mb-2"><strong>Gender:</strong> {patient.gender || "—"}</div>

      <div className="mt-6">
        <button onClick={onGenerateSummary} className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={aiLoading}>{aiLoading ? "Generating…" : "Generate AI Summary"}</button>
      </div>

      {aiSummary && (
        <div className="mt-4 p-4 bg-slate-50 rounded">
          <h3 className="font-medium">AI Summary</h3>
          <p>{aiSummary}</p>
        </div>
      )}
    </div>
  );
}
