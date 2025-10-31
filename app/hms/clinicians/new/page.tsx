"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";

type Dept = { id: string; name: string };

export default function NewClinicianPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // departments
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsErr, setDepsErr] = useState<string | null>(null);
  const [deptSearch, setDeptSearch] = useState("");

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

  // fetch departments on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      setDepsErr(null);
      setDepsLoading(true);
      try {
        const res = await apiClient.get("/hms/departments");
        // assume { data: [...] } shape
        const data = res?.data?.data ?? res?.data ?? [];
        if (!mounted) return;
        setDepartments(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error("failed loading departments", e);
        setDepsErr(e?.response?.data?.error || e?.message || "Failed to load departments");
      } finally {
        if (mounted) setDepsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const s = deptSearch.toLowerCase();
    return departments.filter((d) => d.name.toLowerCase().includes(s) || d.id.toLowerCase().includes(s));
  }, [departments, deptSearch]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // simple client validation
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setErr("First name and last name are required");
      return;
    }

    // If department_id is provided, backend expects a UUID — keep client-side quick-check (optional)
    if (form.department_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.department_id)) {
      setErr("Department ID looks invalid. Please choose a department from the list.");
      return;
    }

    setLoading(true);

    try {
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

      await apiClient.post("/hms/clinicians", payload);

      // success — navigate back
      router.push("/hms/clinicians");
    } catch (e: any) {
      console.error("create clinician failed", e);
      setErr(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to create clinician");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 rounded-2xl backdrop-blur-sm bg-white/7 border border-white/10 shadow-lg max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4">Add clinician</h2>

      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          required
          value={form.first_name}
          onChange={(e) => setField("first_name", e.target.value)}
          placeholder="First name"
          className="p-2 rounded-lg border bg-white/5"
        />
        <input
          required
          value={form.last_name}
          onChange={(e) => setField("last_name", e.target.value)}
          placeholder="Last name"
          className="p-2 rounded-lg border bg-white/5"
        />

        <input
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="Email"
          type="email"
          className="p-2 rounded-lg border bg-white/5"
        />
        <input
          value={form.phone}
          onChange={(e) => setField("phone", e.target.value)}
          placeholder="Phone"
          className="p-2 rounded-lg border bg-white/5"
        />

        <input
          value={form.role}
          onChange={(e) => setField("role", e.target.value)}
          placeholder="Role"
          className="p-2 rounded-lg border bg-white/5"
        />
        <input
          value={form.specialization}
          onChange={(e) => setField("specialization", e.target.value)}
          placeholder="Specialization"
          className="p-2 rounded-lg border bg-white/5"
        />

        <input
          value={form.license_no}
          onChange={(e) => setField("license_no", e.target.value)}
          placeholder="License no"
          className="p-2 rounded-lg border bg-white/5"
        />
        <input
          value={form.experience_years}
          onChange={(e) => setField("experience_years", e.target.value)}
          placeholder="Experience (years)"
          type="number"
          min={0}
          className="p-2 rounded-lg border bg-white/5"
        />

        {/* Department field — searchable select */}
        <div className="col-span-2">
          <label className="block text-sm mb-1">Department (optional)</label>

          <div className="flex gap-2">
            <input
              value={deptSearch}
              onChange={(e) => setDeptSearch(e.target.value)}
              placeholder={depsLoading ? "Loading departments..." : departments.length ? "Search departments..." : "No departments"}
              className="flex-1 p-2 rounded-lg border bg-white/5"
              aria-label="Search departments"
              disabled={depsLoading || !!depsErr}
            />

            <select
              value={form.department_id}
              onChange={(e) => setField("department_id", e.target.value)}
              className="w-56 p-2 rounded-lg border bg-white/5"
              disabled={depsLoading || !!depsErr}
            >
              <option value="">— none —</option>
              {filteredDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {depsErr && <div className="mt-1 text-xs text-red-500">{depsErr}</div>}
          {!depsErr && !depsLoading && departments.length === 0 && (
            <div className="mt-1 text-xs text-gray-400">No departments found for your company.</div>
          )}
        </div>

        <div className="col-span-2 flex items-center gap-3">
          <label className="flex items-center gap-2">
            Active
            <select
              value={form.is_active}
              onChange={(e) => setField("is_active", e.target.value)}
              className="ml-2 rounded-lg border p-1 bg-white/5"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>

        <div className="col-span-2 flex gap-2 mt-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/hms/clinicians")}
            className="px-4 py-2 rounded-lg border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
