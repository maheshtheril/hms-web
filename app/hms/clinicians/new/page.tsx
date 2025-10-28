"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";

export default function NewClinicianPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    specialization: "",
    license_no: "",
    experience_years: "",
    department_id: "",
    is_active: "true",
  });

  function setField<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // simple client validation
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setErr("First name and last name are required");
      return;
    }

    setLoading(true);

    try {
      // build payload converting types
      const payload: any = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        specialization: form.specialization.trim() || null,
        license_no: form.license_no.trim() || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        department_id: form.department_id || null,
        is_active: form.is_active === "true",
      };

      // IMPORTANT: backend will need tenant_id & company_id from session. Do NOT send tenant/company from client unless your flow requires it.
      const res = await apiClient.post("/hms/clinicians", payload);

      // assume success (201)
      router.push("/hms/clinicians");
    } catch (e: any) {
      console.error("create clinician failed", e);
      // Better: parse response body for constraint error; fallback to message
      setErr(e?.response?.data?.message || e?.message || "Failed to create clinician");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 rounded-2xl">
      <h2 className="text-2xl font-semibold mb-4">Add clinician</h2>

      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
        <input required value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} placeholder="First name" className="p-2 rounded border" />
        <input required value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} placeholder="Last name" className="p-2 rounded border" />

        <input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email" type="email" className="p-2 rounded border" />
        <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Phone" className="p-2 rounded border" />

        <input value={form.role} onChange={(e) => setField("role", e.target.value)} placeholder="Role" className="p-2 rounded border" />
        <input value={form.specialization} onChange={(e) => setField("specialization", e.target.value)} placeholder="Specialization" className="p-2 rounded border" />

        <input value={form.license_no} onChange={(e) => setField("license_no", e.target.value)} placeholder="License no" className="p-2 rounded border" />
        <input value={form.experience_years} onChange={(e) => setField("experience_years", e.target.value)} placeholder="Experience (years)" type="number" className="p-2 rounded border" />

        <input value={form.department_id} onChange={(e) => setField("department_id", e.target.value)} placeholder="Department ID (optional)" className="p-2 rounded border col-span-2" />

        <div className="col-span-2 flex items-center gap-3">
          <label>
            Active
            <select value={form.is_active} onChange={(e) => setField("is_active", e.target.value)} className="ml-2 rounded border p-1">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>

        <div className="col-span-2 flex gap-2 mt-3">
          <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">
            {loading ? "Saving..." : "Create"}
          </button>
          <button type="button" onClick={() => router.push("/hms/clinicians")} className="px-4 py-2 rounded border">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
