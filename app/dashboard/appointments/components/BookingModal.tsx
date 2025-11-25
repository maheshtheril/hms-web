"use client";

import React, { useEffect, useState } from "react";
import GlassInput from "@/app/dashboard/components/GlassInput";
import GlassButton from "@/app/dashboard/components/GlassButton";

export default function BookingModal({
  defaultStart,
  defaultEnd,
  onSaved,
  onClose,
}: {
  defaultStart: Date;
  defaultEnd: Date;
  onSaved?: ()=>void;
  onClose: ()=>void;
}) {
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [start, setStart] = useState(defaultStart.toISOString().slice(0,16));
  const [end, setEnd] = useState(defaultEnd.toISOString().slice(0,16));
  const [type, setType] = useState("consultation");
  const [loading, setLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  useEffect(() => {
    setStart(defaultStart.toISOString().slice(0,16));
    setEnd(defaultEnd.toISOString().slice(0,16));
  }, [defaultStart, defaultEnd]);

  const validateAndSave = async () => {
    setLoading(true);
    setValidationMsg(null);
    try {
      // dry-run server-side validation
      const body = { patient_id: patientId, doctor_id: doctorId, room_id: roomId, start: new Date(start).toISOString(), end: new Date(end).toISOString(), type };
      const v = await fetch("/api/appointments/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
      const jr = await v.json();
      if (!v.ok) {
        setValidationMsg(jr?.message || "Conflict detected");
        setLoading(false);
        return;
      }

      // create
      const r = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "save failed");
      onSaved?.();
    } catch (err:any) {
      setValidationMsg(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
        <h3 className="text-xl font-semibold mb-4">Create appointment</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <GlassInput label="Patient ID" value={patientId} onChange={(e:any)=>setPatientId(e.target.value)} />
          <GlassInput label="Doctor ID" value={doctorId} onChange={(e:any)=>setDoctorId(e.target.value)} />
          <GlassInput label="Room ID" value={roomId} onChange={(e:any)=>setRoomId(e.target.value)} />
          <div>
            <label className="text-xs opacity-70">Start</label>
            <input type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 w-full" />
          </div>
          <div>
            <label className="text-xs opacity-70">End</label>
            <input type="datetime-local" value={end} onChange={(e)=>setEnd(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 w-full" />
          </div>
          <div>
            <label className="text-xs opacity-70">Type</label>
            <select value={type} onChange={(e)=>setType(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 w-full">
              <option value="consultation">Consultation</option>
              <option value="procedure">Procedure</option>
              <option value="followup">Follow-up</option>
            </select>
          </div>
        </div>

        {validationMsg && <div className="mt-3 text-sm text-red-300">{validationMsg}</div>}

        <div className="mt-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
          <GlassButton onClick={validateAndSave}>{loading ? "Saving..." : "Save"}</GlassButton>
        </div>
      </div>
    </div>
  );
}
