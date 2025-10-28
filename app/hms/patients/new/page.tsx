    // web/app/hms/patients/new/page.tsx
"use client";
import React, { useState } from "react";
import { createPatient } from "../hooks";
import { useRouter } from "next/navigation";

export default function NewPatientPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        dob: dob || null,
        gender: gender || null,
      };
      const patient = await createPatient(payload);
      // Redirect to view page
      router.push(`/hms/patients/${patient.id}`);
    } catch (err) {
      console.error("create failed", err);
      alert("Failed to create patient");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Patient</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">First name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block mb-1">Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block mb-1">DOB</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full border p-2 rounded" />
        </div>
        <div>
          <label className="block mb-1">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full border p-2 rounded">
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? "Saving…" : "Create"}</button>
          <button type="button" className="px-4 py-2 border rounded" onClick={() => history.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
