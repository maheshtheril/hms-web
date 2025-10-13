"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function NewTenantPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const { data } = await apiClient.post("/tenants", {
        name, slug: slug || undefined, owner_email: ownerEmail || undefined,
      });
      setMsg(`Created tenant ${data.tenant.name} (${data.tenant.slug})`);
      setName(""); setSlug(""); setOwnerEmail("");
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? "Failed to create tenant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Create Tenant</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="border p-2 w-full" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required/>
        <input className="border p-2 w-full" placeholder="Slug (optional)" value={slug} onChange={e=>setSlug(e.target.value)}/>
        <input className="border p-2 w-full" placeholder="Owner email (optional)" value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)}/>
        <button disabled={busy} className="px-4 py-2 bg-black text-white">{busy ? "Creating..." : "Create"}</button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
