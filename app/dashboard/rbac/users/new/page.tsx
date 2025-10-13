// app/dashboard/rbac/users/new/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Role } from "@/lib/types";

type Company = { id: string; name: string };

// Toggle this depending on your backend contract
// true  → send role CODES (['tenant_admin', 'crm.manager'])
// false → send role IDs   (['6a2e-...-9fd2', ...])
const SEND_ROLE_CODES = true;

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function NewUserPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assign, setAssign] = useState<string[]>([]); // codes or ids depending on SEND_ROLE_CODES
  const [companyId, setCompanyId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [loadingInit, setLoadingInit] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          apiClient.get("/admin/roles"),
          apiClient.get("/admin/companies"),
        ]);

        const rolesData: Role[] = r1.data?.items || r1.data || [];
        setRoles(rolesData);

        const compItems: Company[] = r2.data?.items || r2.data || [];
        setCompanies(compItems);
        if (compItems.length === 1) setCompanyId(compItems[0].id);
      } catch (e: any) {
        console.error("Load init failed:", e?.response?.data || e?.message);
        setErr(e?.response?.data?.error || "Failed to load initial data");
        setRoles([]);
        setCompanies([]);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!email.trim() || !validateEmail(email)) return false;
    // Password optional → invite flow
    // Company optional (depends on your multi-company logic)
    return true;
  }, [name, email]);

  async function create() {
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        password: password || undefined, // let backend choose invite flow if undefined
        company_id: companyId || undefined,
      };

      if (SEND_ROLE_CODES) {
        payload.role_codes = assign; // <-- ensure backend supports role_codes
      } else {
        payload.role_ids = assign;   // <-- or role_ids if backend expects IDs
      }

      await apiClient.post("/admin/users", payload);
      window.location.href = "/dashboard/rbac/users";
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (e?.response?.status === 409
          ? "A user with this email already exists."
          : e?.message) ||
        "Failed";
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/rbac/users"
          className="rounded-md border border-white/10 px-2 py-1 hover:bg-white/10"
        >
          ← Back
        </Link>
        <div className="text-sm opacity-70">Invite / Create user</div>
      </div>

      {err && <div className="text-red-400 text-sm">{err}</div>}
      {loadingInit && (
        <div className="text-sm opacity-70">Loading…</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <div className="text-xs text-white/60">Full name</div>
          <input
            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs text-white/60">Email</div>
          <input
            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
          />
          {!!email && !validateEmail(email) && (
            <div className="text-xs text-red-400">Please enter a valid email.</div>
          )}
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-xs text-white/60">
            Password <span className="opacity-60">(leave blank to send invite link)</span>
          </div>
          <input
            type="password"
            className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <div className="space-y-1 md:col-span-2">
          <div className="text-xs text-white/60">Default company</div>

          <div className="relative">
            <select
              className="w-full bg-black/40 text-white border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option className="text-black bg-white" value="">
                — Select company —
              </option>
              {companies.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="text-black bg-white"
                >
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {!companies.length && !loadingInit && (
            <div className="text-xs text-white/50 mt-1">
              No companies found for this tenant.
            </div>
          )}
        </div>

        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">Assign roles</div>
            <div className="text-xs text-white/50">
              Selected: {assign.length}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 p-2 grid md:grid-cols-2 gap-1">
            {roles.map((r) => {
              const value = SEND_ROLE_CODES ? r.code : (r.id as unknown as string);
              return (
                <label key={r.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={assign.includes(value)}
                    onChange={(e) => {
                      setAssign((prev) => {
                        const set = new Set(prev);
                        if (e.target.checked) set.add(value);
                        else set.delete(value);
                        return Array.from(set);
                      });
                    }}
                  />
                  {r.name} <span className="text-white/40">({r.code})</span>
                </label>
              );
            })}

            {!roles.length && !loadingInit && (
              <div className="text-xs text-white/50">No roles found for this tenant.</div>
            )}
          </div>
        </div>
      </div>

      <button
        disabled={saving || !canSubmit}
        onClick={create}
        className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
        title={!canSubmit ? "Fill name & valid email" : "Create user"}
      >
        {saving ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
