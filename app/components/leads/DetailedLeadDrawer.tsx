"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CountryPhoneRow, dialOf } from "@/app/components/phones/CountryPhoneRow";

/* ───────── Small UI helpers ───────── */
function CaretDown({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </svg>
  );
}
function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T>, onOutside: () => void) {
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onOutside]);
}
function MenuItem({
  children, onClick, active = false,
}: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${active ? "bg-white/15" : "hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

/* ───────── Types ───────── */
type CompanyOpt = { id: string; name?: string | null };
type UserOpt = { id: string; name?: string | null; email?: string | null };
type StageOpt = { id: string; name: string; pipeline_id: string | null };

/* ───────── Custom Fields Types ───────── */
type CFDef = {
  definition_id: string;
  key: string;
  label: string;
  field_type:
    | "text" | "textarea" | "number" | "boolean"
    | "date" | "datetime" | "select" | "multiselect" | "json" | "file";
  options?: any;
  required?: boolean;
  visible?: boolean;
  sort_order?: number | null;
  metadata?: any;
};
type CFValue = {
  value_text?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_json?: any | null;
};

/* ───────── Assign Employee (loads /api/users) ───────── */
function AssignEmployee({
  value, onChange,
}: { value: string | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const anchor = React.useRef<HTMLDivElement>(null);
  useClickOutside(anchor, () => setOpen(false));

  const selected = users.find(u => u.id === value) || null;

  async function loadUsers() {
    try {
      setErr(null); setLoading(true);
      const { data } = await apiClient.get("/users", { params: { active: 1 }, withCredentials: true });
      const arr = Array.isArray(data?.users) ? data.users
        : Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : [];
      setUsers(arr.map((u: any) => ({
        id: String(u.id ?? u.user_id ?? u.uuid),
        name: u.name ?? u.full_name ?? null,
        email: u.email ?? null,
      })));
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Could not load team");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (open && users.length === 0 && !loading && !err) loadUsers();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative" ref={anchor}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-haspopup="listbox" aria-expanded={open}
      >
        <span>{selected ? (selected.name || selected.email || selected.id) : "Unassigned"}</span>
        <CaretDown />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl p-2">
          <div className="max-h-60 overflow-auto pr-1">
            {loading && <div className="px-3 py-2 text-sm opacity-70">Loading…</div>}
            {err && <div className="px-3 py-2 text-sm text-amber-300">{err}</div>}
            {!loading && !err && (
              <>
                <MenuItem active={!value} onClick={() => { onChange(null); setOpen(false); }}>
                  Unassigned
                </MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} active={u.id === value} onClick={() => { onChange(u.id); setOpen(false); }}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[10px]">
                        {(u.name || u.email || u.id).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">{u.name || u.email || u.id}</div>
                        {u.email && <div className="text-xs opacity-60">{u.email}</div>}
                      </div>
                    </div>
                  </MenuItem>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Custom Fields helpers + renderer ───────── */
function selectOptionsFrom(def: CFDef): Array<{ value: string; label: string }> {
  const raw = def.options ?? [];
  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === "object") return raw as any;
    return raw.map((s: any) => ({ value: String(s), label: String(s) }));
  }
  return [];
}

function CustomFieldInput({
  def, value, onChange,
}: { def: CFDef; value: CFValue; onChange: (val: CFValue) => void }) {
  const common = "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white";

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const fd = new FormData();
    fd.append("file", file);
    try {
      // Adjust to your uploader route/response shape.
      const { data } = await apiClient.post("/uploads", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      const url = data?.url || data?.path || "";
      onChange({ value_text: url || file.name });
    } catch (e) {
      console.warn("Upload failed", e);
      onChange({ value_text: file.name }); // fallback keep filename so user sees something
    }
  }

  switch (def.field_type) {
    case "textarea":
      return (
        <Textarea
          className={common}
          rows={3}
          placeholder={def.label}
          value={value.value_text ?? ""}
          onChange={e => onChange({ value_text: e.target.value })}
        />
      );
    case "number":
      return (
        <Input
          className={common}
          type="number"
          inputMode="decimal"
          placeholder={def.label}
          value={value.value_number ?? (value.value_text ? Number(value.value_text) : "") as any}
          onChange={e => onChange({ value_number: e.target.value === "" ? null : Number(e.target.value) })}
        />
      );
    case "boolean":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={!!value.value_boolean}
            onChange={e => onChange({ value_boolean: e.target.checked })}
          />
          <span>{def.label}{def.required ? " *" : ""}</span>
        </label>
      );
    case "date":
      return (
        <Input
          className={common}
          type="date"
          value={value.value_text ?? ""}
          onChange={e => onChange({ value_text: e.target.value })}
        />
      );
    case "datetime":
      return (
        <Input
          className={common}
          type="datetime-local"
          value={value.value_text ?? ""}
          onChange={e => onChange({ value_text: e.target.value })}
        />
      );
    case "select": {
      const opts = selectOptionsFrom(def);
      return (
        <select
          className={`${common} dark-select`}
          style={{ colorScheme: "dark" as any }}
          value={value.value_text ?? ""}
          onChange={e => onChange({ value_text: e.target.value })}
        >
          <option value="">— Select —</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    case "multiselect": {
      const opts = selectOptionsFrom(def);
      const arr = Array.isArray(value.value_json) ? value.value_json : [];
      return (
        <select
          className={`${common} dark-select`}
          style={{ colorScheme: "dark" as any, minHeight: 80 }}
          multiple
          value={arr}
          onChange={e => {
            const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
            onChange({ value_json: selected });
          }}
        >
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    case "json":
      return (
        <Textarea
          className={common}
          rows={3}
          placeholder='JSON (e.g., {"pref":"vip"})'
          value={value.value_json ? JSON.stringify(value.value_json) : ""}
          onChange={e => {
            const t = e.target.value.trim();
            if (!t) return onChange({ value_json: null });
            try { onChange({ value_json: JSON.parse(t) }); }
            catch { onChange({ value_json: t as any }); }
          }}
        />
      );
    case "file":
      return (
        <div className="space-y-2">
          <Input type="file" className={common} onChange={(e) => handleFile(e.currentTarget.files)} />
          {value.value_text
            ? <div className="text-xs opacity-70 break-all">Uploaded: {value.value_text}</div>
            : <div className="text-xs opacity-50">Choose a file to upload…</div>}
        </div>
      );
    default: // "text"
      return (
        <Input
          className={common}
          placeholder={def.label}
          value={value.value_text ?? ""}
          onChange={e => onChange({ value_text: e.target.value })}
        />
      );
  }
}

/* ───────── Detailed Lead Page ───────── */
export default function DetailedLeadPage({ onCreated }: { onCreated?: (lead: any) => void }) {
  const [form, setForm] = useState<any>({
    lead_name: "",
    email: "",
    phone_country: "IN",
    phone_national: "",
    profession: "",
    estimated_value: "",
    probability: "50",
    expected_revenue: "",
    owner_id: "" as string | null,
    company_id: "",
    pipeline_id: "",
    stage_id: "",
    source_label: "Web",
    source_id: "",
    follow_up_date: "",
    tags: "",
    notes: "",
    address: { line1: "", line2: "", city: "", state: "", country: "India", pincode: "" },
  });

  // dropdown data
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [stages, setStages] = useState<StageOpt[]>([]);
  const [loadErr, setLoadErr] = useState<{ companies?: string; stages?: string }>({});

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // ───────── Custom Fields state ─────────
  const [cfDefs, setCfDefs] = useState<CFDef[]>([]);
  const [cfValues, setCfValues] = useState<Record<string, CFValue>>({});
  const [cfLoading, setCfLoading] = useState(false);
  const [cfErr, setCfErr] = useState<string | null>(null);

  // derived lists
  const tagList = useMemo(
    () => String(form.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
    [form.tags]
  );
  const phoneE164 = useMemo(() => {
    const digits = String(form.phone_national || "").replace(/\D/g, "");
    return digits ? `+${dialOf(form.phone_country)}${digits}` : null;
  }, [form.phone_country, form.phone_national]);
  const autoExpectedRevenue = useMemo(() => {
    const v = Number(form.estimated_value || 0);
    const p = Math.min(100, Math.max(0, Number(form.probability || 0)));
    if (!v || isNaN(v)) return 0;
    return Math.round((v * (p / 100)) * 100) / 100;
  }, [form.estimated_value, form.probability]);

  // build pipeline list from stages (unique pipeline_id)
  const pipelines = useMemo(() => {
    const ids = Array.from(new Set(stages.map(s => s.pipeline_id || "__null__")));
    return ids.map((pid) => ({
      id: pid === "__null__" ? "" : (pid as string),
      label: pid === "__null__" ? "Default (no pipeline)" : `Pipeline ${String(pid).slice(0, 8)}…`,
    }));
  }, [stages]);

  const filteredStages = useMemo(() => {
    const selected = form.pipeline_id || ""; // "" means null/default
    return stages.filter(s => (s.pipeline_id || "") === selected);
  }, [stages, form.pipeline_id]);

  // initial loads
  useEffect(() => {
    (async () => {
      try {
        setLoadErr(e => ({ ...e, companies: undefined }));
        const { data } = await apiClient.get("/companies", { params: { active: 1 }, withCredentials: true });
        const arr = Array.isArray(data?.companies) ? data.companies
          : Array.isArray(data) ? data
          : Array.isArray(data?.data) ? data.data
          : [];
        const mapped: CompanyOpt[] = arr.map((c: any) => ({ id: String(c.id), name: c.name ?? null }));
        setCompanies(mapped);
      } catch (e: any) {
        setLoadErr(e2 => ({ ...e2, companies: e?.response?.data?.error || "Could not load companies" }));
      }
    })();
    (async () => {
      try {
        setLoadErr(e => ({ ...e, stages: undefined }));
        const { data } = await apiClient.get("/stages", { withCredentials: true });
        const list = Array.isArray(data?.stages) ? data.stages : Array.isArray(data) ? data : [];
        const mapped: StageOpt[] = list.map((s: any) => ({
          id: String(s.id ?? s.name),
          name: String(s.name ?? s.id ?? "Stage"),
          pipeline_id: s.pipeline_id ?? null,
        }));
        setStages(mapped);
      } catch (e: any) {
        setLoadErr(e2 => ({ ...e2, stages: e?.response?.data?.error || "Could not load stages" }));
      }
    })();
  }, []);

  // load custom field definitions
  useEffect(() => {
    (async () => {
      try {
        setCfErr(null); setCfLoading(true);
        const { data } = await apiClient.get("/admin/custom-fields", {
          params: { entity: "lead" },
          withCredentials: true,
        });
        const defs = (Array.isArray(data?.items) ? data.items : []).map((r: any) => ({
          definition_id: String(r.id),
          key: r.key,
          label: r.label,
          field_type: r.field_type,
          options: r.options,
          required: !!r.required,
          visible: r.visible !== false,
          sort_order: r.sort_order ?? null,
          metadata: r.metadata ?? null,
        })) as CFDef[];

        setCfDefs(defs);

        // init values per field type
        const init: Record<string, CFValue> = {};
        for (const d of defs) {
          switch (d.field_type) {
            case "number": init[d.definition_id] = { value_number: null }; break;
            case "boolean": init[d.definition_id] = { value_boolean: false }; break;
            case "json": init[d.definition_id] = { value_json: null }; break;
            case "multiselect": init[d.definition_id] = { value_json: [] }; break;
            default: init[d.definition_id] = { value_text: "" }; break;
          }
        }
        setCfValues(init);
      } catch (e: any) {
        setCfErr(e?.response?.data?.error || "Could not load custom fields");
      } finally {
        setCfLoading(false);
      }
    })();
  }, []);

  // when pipeline changes, clear stage if it doesn’t belong
  useEffect(() => {
    if (!form.stage_id) return;
    const ok = filteredStages.some(s => s.id === form.stage_id);
    if (!ok) setForm((f: any) => ({ ...f, stage_id: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pipeline_id]);

  function coerceCompaniesFromError(raw: any): CompanyOpt[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((r) => (typeof r === "string" ? { id: r } : { id: String(r.id), name: r.name }));
    return [];
  }

  function setCF(defId: string, updater: (prev: CFValue) => CFValue) {
    setCfValues(prev => ({ ...prev, [defId]: updater(prev[defId] || {}) }));
  }

  // quick required check for custom fields
  function validateRequiredCustomFields(): string | null {
    for (const d of cfDefs) {
      if (!d.required || d.visible === false) continue;
      const v = cfValues[d.definition_id];
      const empty =
        !v ||
        (d.field_type === "number" ? v.value_number == null :
         d.field_type === "boolean" ? v.value_boolean == null :
         d.field_type === "multiselect" ? !(Array.isArray(v.value_json) && v.value_json.length) :
         d.field_type === "json" ? v.value_json == null :
         !v.value_text || String(v.value_text).trim() === "");
      if (empty) return `Custom field "${d.label}" is required`;
    }
    return null;
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (submittingRef.current) return;
    setErr(null); setOk(null);
    if (!form.lead_name?.trim()) return setErr("Lead name is required");

    // validate required CFs (client)
    const cfError = validateRequiredCustomFields();
    if (cfError) return setErr(cfError);

    submittingRef.current = true;
    const name = form.lead_name.trim();

    const meta = {
      address: { ...form.address },
      profession: form.profession || undefined,
      notes: form.notes || undefined,
      follow_up_date: form.follow_up_date || undefined,
      expected_revenue: form.expected_revenue ? Number(form.expected_revenue) : autoExpectedRevenue || undefined,
      source_id: form.source_id || undefined,
      pipeline_id: form.pipeline_id || undefined,
      stage_id: form.stage_id || undefined,
    };

    const payload: any = {
      name,
      title: name,
      lead_name: name,
      email: form.email || undefined,
      phone_e164: phoneE164 || undefined,
      source: form.source_label || undefined,
      assigned_user_id: form.owner_id || undefined,
      company_id: form.company_id || undefined,
      pipeline_id: form.pipeline_id || undefined,
      stage_id: form.stage_id || undefined,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
      probability: form.probability !== "" ? Math.min(100, Math.max(0, Number(form.probability))) : undefined,
      tags: tagList,
      notes: form.notes || undefined,
      meta,
    };

    try {
      setLoading(true);

      // 1) Create lead
      const { data } = await apiClient.post("/leads", payload, { withCredentials: true });
      const createdLead = data?.lead ?? data;
      const leadId: string | undefined = createdLead?.id;
      const initialNote = String(form.notes || "").trim();

      // 2) Save custom-field values (best-effort)
      if (leadId && cfDefs.length > 0) {
        for (const def of cfDefs) {
          if (def.visible === false) continue;
          const v = cfValues[def.definition_id];
          if (!v) continue;

          const body = {
            value_text:    v.value_text ?? null,
            value_number:  v.value_number ?? null,
            value_boolean: typeof v.value_boolean === "boolean" ? v.value_boolean : null,
            value_json:    v.value_json ?? null,
          };

          try {
            await apiClient.put(
              `/leads/${leadId}/custom-fields/${def.definition_id}`,
              body,
              { withCredentials: true }
            );
          } catch (e: any) {
            console.warn("CF upsert failed:", def.key, e?.response?.data || e);
            setErr(prev => prev || "Some custom fields failed to save. You can retry from the lead drawer.");
          }
        }
      }

      // 3) If notes exist, create initial note (non-blocking if it fails)
      let noteError: string | null = null;
      if (leadId && initialNote) {
        try {
          await apiClient.post(
            `/leads/${leadId}/notes`,
            { body: initialNote },
            { withCredentials: true }
          );
        } catch (e: any) {
          noteError = e?.response?.data?.error || "initial_note_failed";
          console.warn("Failed to create initial note:", e?.response?.data || e);
        }
      }

      // 4) Success messages + callback
      if (noteError) {
        setOk("Lead created successfully. (Note save failed — you can add it from the lead drawer.)");
        if (!err) setErr("Note creation failed. Please retry from the Notes tab.");
      } else {
        setOk(`Lead created successfully.${initialNote ? " Initial note saved." : ""}`);
      }
      onCreated?.(createdLead);

      // 5) Reset form + CFs
      setForm((f: any) => ({
        ...f,
        lead_name: "",
        email: "",
        phone_national: "",
        phone_country: "IN",
        profession: "",
        estimated_value: "",
        probability: "50",
        expected_revenue: "",
        tags: "",
        notes: "",
        follow_up_date: "",
        company_id: "",
        pipeline_id: "",
        stage_id: "",
        owner_id: "",
      }));

      const init: Record<string, CFValue> = {};
      for (const d of cfDefs) {
        switch (d.field_type) {
          case "number": init[d.definition_id] = { value_number: null }; break;
          case "boolean": init[d.definition_id] = { value_boolean: false }; break;
          case "json": init[d.definition_id] = { value_json: null }; break;
          case "multiselect": init[d.definition_id] = { value_json: [] }; break;
          default: init[d.definition_id] = { value_text: "" }; break;
        }
      }
      setCfValues(init);

    } catch (e: any) {
      const status = e?.response?.status;
      const errData = e?.response?.data;

      if (status === 400 && errData?.error === "company_required") {
        const list = coerceCompaniesFromError(errData?.companies);
        if (list.length > 0) setCompanies(list);
        setErr("Please select a company, then click Save again.");
        return;
      }

      const msg =
        errData?.error ||
        errData?.message ||
        (typeof errData === "string" ? errData : e?.message) ||
        "Failed to create lead";
      setErr(msg);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Create Lead (Detailed)</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>Back</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <form id="leadForm" onSubmit={submit} className="max-w-screen-2xl mx-auto px-6 py-6 space-y-8">
          {(err || ok) && (
            <div className="space-y-2">
              {err && <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{err}</div>}
              {ok && <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">{ok}</div>}
            </div>
          )}

          {/* Contact */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Contact</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70">Lead Name *</label>
                <Input placeholder="e.g., Rahul Sharma" value={form.lead_name}
                  onChange={(e) => setForm({ ...form, lead_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-white/70">Email</label>
                <Input type="email" placeholder="name@company.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70">Phone</label>
                <CountryPhoneRow
                  phone_country={form.phone_country}
                  phone_national={form.phone_national}
                  onChangeCountry={(iso2) => setForm({ ...form, phone_country: iso2 })}
                  onChangeNational={(v) => setForm({ ...form, phone_national: v })}
                  InputComp={Input}
                />
              </div>
              <div>
                <label className="block text-sm text-white/70">Profession</label>
                <Input placeholder="e.g., Business Owner, Engineer" value={form.profession}
                  onChange={(e) => setForm({ ...form, profession: e.target.value })} />
              </div>
            </div>
          </section>

          {/* Qualification */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Qualification</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm text-white/70">Value (₹)</label>
                <Input type="number" inputMode="decimal" placeholder="50000" value={form.estimated_value}
                  onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-white/70">Probability (%)</label>
                <Input type="number" inputMode="numeric" placeholder="50" min={0} max={100} value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-white/70">Expected Revenue (₹)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={String(autoExpectedRevenue || 0)}
                  value={form.expected_revenue}
                  onChange={(e) => setForm({ ...form, expected_revenue: e.target.value })}
                />
                <div className="mt-1 text-xs opacity-60">Auto: ₹{autoExpectedRevenue.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </section>

          {/* Pipeline, Stage & Ownership */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Pipeline, Stage & Ownership</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Assign To */}
              <div>
                <label className="block text-sm text-white/70">Assign To</label>
                <AssignEmployee
                  value={form.owner_id || null}
                  onChange={(id) => setForm({ ...form, owner_id: id || "" })}
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm text-white/70">Company</label>
                <select
                  className="dark-select w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  style={{ colorScheme: "dark" as any }}
                  value={form.company_id}
                  onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                >
                  <option value="">— Select company —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} (${c.id.slice(0,8)}…)` : c.id}
                    </option>
                  ))}
                </select>
                {loadErr.companies && (
                  <div className="text-[11px] text-amber-300 mt-1">{loadErr.companies}</div>
                )}
              </div>

              {/* Pipeline */}
              <div>
                <label className="block text-sm text-white/70">Pipeline</label>
                <select
                  className="dark-select w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  style={{ colorScheme: "dark" as any }}
                  value={form.pipeline_id}
                  onChange={(e) => setForm({ ...form, pipeline_id: e.target.value })}
                >
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                {loadErr.stages && (
                  <div className="text-[11px] text-amber-300 mt-1">{loadErr.stages}</div>
                )}
              </div>

              {/* Stage (filtered by pipeline) */}
              <div className="md:col-span-3">
                <label className="block text-sm text-white/70">Stage</label>
                <select
                  className="dark-select w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  style={{ colorScheme: "dark" as any }}
                  value={form.stage_id}
                  onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
                >
                  <option value="">— Select stage —</option>
                  {filteredStages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {!loadErr.stages && stages.length === 0 && (
                  <div className="text-[11px] opacity-70 mt-1">No stages available yet.</div>
                )}
              </div>
            </div>
          </section>

          {/* Source */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Source</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-white/70">Source (label)</label>
                <select
                  className="dark-select w-full inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  style={{ colorScheme: "dark" as any }}
                  value={form.source_label}
                  onChange={(e) => setForm({ ...form, source_label: e.target.value })}
                >
                  {["Direct","Web","Referral","Campaign","Inbound Call","Outbound Call","Event","Social","Partner","Other"].map(opt =>
                    <option key={opt} value={opt}>{opt}</option>
                  )}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70">Source ID (UUID)</label>
                <Input placeholder="Optional — link to lead_source.id" value={form.source_id}
                  onChange={(e) => setForm({ ...form, source_id: e.target.value })} />
              </div>
            </div>
          </section>

          {/* Scheduling */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Scheduling</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-white/70">Follow-up Date</label>
                <Input
                  type="date"
                  value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Advance (Custom Fields) */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Advance</div>

            {cfLoading && <div className="text-sm opacity-70">Loading fields…</div>}
            {cfErr && <div className="text-xs text-amber-300">{cfErr}</div>}

            {!cfLoading && !cfErr && cfDefs.filter(d => d.visible !== false).length === 0 && (
              <div className="text-sm opacity-60">No custom fields configured yet.</div>
            )}

            {!cfLoading && !cfErr && cfDefs.filter(d => d.visible !== false).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cfDefs.filter(d => d.visible !== false).map(def => {
                  const v = cfValues[def.definition_id] || {};
                  return (
                    <div key={def.definition_id}>
                      {def.field_type !== "boolean" && (
                        <label className="block text-sm text-white/70 mb-1">
                          {def.label}{def.required ? " *" : ""}
                        </label>
                      )}
                      <CustomFieldInput
                        def={def}
                        value={v}
                        onChange={(nv) => setCF(def.definition_id, () => nv)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes & Tags */}
          <section>
            <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Notes & Tags</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-white/70">Tags (comma separated)</label>
                <Input placeholder="hot, demo, priority" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                {tagList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tagList.map((t: string) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-white/70">Notes</label>
                <Textarea rows={4} placeholder="Short context, preferences, next action…" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </section>
        </form>
      </main>

      {/* Single footer actions */}
      <footer className="sticky bottom-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
          <Button type="submit" form="leadForm" disabled={loading || !form.lead_name.trim()}>
            {loading ? "Saving..." : "Save Lead"}
          </Button>
        </div>
      </footer>

      {/* Force native selects to be readable on dark UIs */}
      <style jsx global>{`
        select.dark-select { color: #fff; }
        select.dark-select option {
          background-color: #0a0a0a;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
