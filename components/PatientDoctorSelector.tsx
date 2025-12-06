"use client";
import React, { useEffect, useState } from "react";

type Patient = { id: string; name: string; phone?: string; mrn?: string; dob?: string };
type Doctor = { id: string; name: string; reg_no?: string; dept?: string };

export default function PatientDoctorSelector({
  patientId,
  doctorId,
  onPatientChange,
  onDoctorChange,
}: {
  patientId?: string | null;
  doctorId?: string | null;
  onPatientChange: (id: string | null) => void;
  onDoctorChange: (id: string | null) => void;
}) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctorResults, setDoctorResults] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingD, setLoadingD] = useState(false);

  useEffect(() => {
    if (!patientId) { setSelectedPatient(null); return; }
    setLoadingP(true);
    fetch(`/api/hms/patients/${encodeURIComponent(patientId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSelectedPatient((j?.data ?? j) || null))
      .catch(() => setSelectedPatient(null))
      .finally(() => setLoadingP(false));
  }, [patientId]);

  useEffect(() => {
    if (!doctorId) { setSelectedDoctor(null); return; }
    setLoadingD(true);
    fetch(`/api/hms/doctors/${encodeURIComponent(doctorId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSelectedDoctor((j?.data ?? j) || null))
      .catch(() => setSelectedDoctor(null))
      .finally(() => setLoadingD(false));
  }, [doctorId]);

  useEffect(() => {
    if (!patientQuery.trim()) { setPatientResults([]); return; }
    setLoadingP(true);
    const t = setTimeout(() => {
      fetch(`/api/hms/patients?q=${encodeURIComponent(patientQuery)}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setPatientResults(j?.data || []))
        .catch(() => setPatientResults([]))
        .finally(() => setLoadingP(false));
    }, 180);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    if (!doctorQuery.trim()) { setDoctorResults([]); return; }
    setLoadingD(true);
    const t = setTimeout(() => {
      fetch(`/api/hms/doctors?q=${encodeURIComponent(doctorQuery)}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setDoctorResults(j?.data || []))
        .catch(() => setDoctorResults([]))
        .finally(() => setLoadingD(false));
    }, 180);
    return () => clearTimeout(t);
  }, [doctorQuery]);

  async function createQuickPatient(phoneOrName: string) {
    try {
      const res = await fetch(`/api/hms/patients`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: phoneOrName || `Guest-${Date.now()}`, phone: phoneOrName || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      const p = j?.data || j;
      setSelectedPatient(p || null);
      onPatientChange(p?.id ?? null);
    } catch (e) {
      console.error("create patient failed", e);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <label className="block text-xs text-slate-300">Billing to</label>
        <input
          value={selectedPatient ? `${selectedPatient.name}${selectedPatient.phone ? " • " + selectedPatient.phone : ""}` : patientQuery}
          onChange={(e) => {
            setPatientQuery(e.target.value);
            if (selectedPatient) { setSelectedPatient(null); onPatientChange(null); }
          }}
          placeholder="Search patient (name / phone / MRN)"
          className="p-2 rounded-md bg-slate-800/40 text-slate-100 w-72"
        />
        {patientResults.length > 0 && (
          <div className="absolute left-0 mt-1 w-full bg-slate-900/95 border border-slate-700 z-40 rounded-md max-h-48 overflow-auto">
            {patientResults.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPatient(p);
                  onPatientChange(p.id);
                  setPatientQuery("");
                  setPatientResults([]);
                }}
                className="p-2 hover:bg-slate-700 cursor-pointer"
              >
                <div className="font-medium text-slate-100">{p.name}</div>
                <div className="text-xs text-slate-400">{p.phone} {p.mrn ? `• ${p.mrn}` : ""}</div>
              </div>
            ))}
            <div className="p-2 border-t border-slate-700 text-xs">
              <button onClick={() => createQuickPatient(patientQuery || "")} className="text-indigo-400">Create quick patient</button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <label className="block text-xs text-slate-300">Doctor</label>
        <input
          value={selectedDoctor ? selectedDoctor.name : doctorQuery}
          onChange={(e) => {
            setDoctorQuery(e.target.value);
            if (selectedDoctor) { setSelectedDoctor(null); onDoctorChange(null); }
          }}
          placeholder="Search doctor (optional)"
          className="p-2 rounded-md bg-slate-800/40 text-slate-100 w-64"
        />
        {doctorResults.length > 0 && (
          <div className="absolute left-0 mt-1 w-full bg-slate-900/95 border border-slate-700 z-40 rounded-md max-h-40 overflow-auto">
            {doctorResults.map((d) => (
              <div
                key={d.id}
                onClick={() => {
                  setSelectedDoctor(d);
                  onDoctorChange(d.id);
                  setDoctorQuery("");
                  setDoctorResults([]);
                }}
                className="p-2 hover:bg-slate-700 cursor-pointer"
              >
                <div className="font-medium text-slate-100">{d.name}</div>
                <div className="text-xs text-slate-400">{d.reg_no} {d.dept ? `• ${d.dept}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
