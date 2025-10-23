// app/crm/leads/[id]/edit/EditLeadFormClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

/* Backend base */
// ensures we always know what the frontend will call
if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
  // fail fast so we don't silently call localhost in prod
  throw new Error("NEXT_PUBLIC_BACKEND_URL must be set in the frontend environment");
}
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL!;
console.log("CLIENT API_BASE =", API_BASE);

/* ───────── Multi-tenant headers ───────── */
const TENANT_ID =
  typeof window !== "undefined"
    ? localStorage.getItem("tenant_id") || process.env.NEXT_PUBLIC_TENANT_ID || null
    : process.env.NEXT_PUBLIC_TENANT_ID || null;

const COMPANY_ID =
  typeof window !== "undefined"
    ? localStorage.getItem("company_id") || process.env.NEXT_PUBLIC_COMPANY_ID || null
    : process.env.NEXT_PUBLIC_COMPANY_ID || null;

/* ───────── Auth helpers ───────── */
// read token (if you use Bearer tokens in the browser)
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token") || localStorage.getItem("token") || null;
}

/**
 * authHeaders builds headers including Accept, Content-Type (when appropriate),
 * tenant/company headers, and optional Authorization Bearer token if present.
 */
function authHeaders(
  extra?: Record<string, string>,
  opts?: { method?: string; isForm?: boolean }
) {
  const base: Record<string, string> = {
    Accept: "application/json",
  };

  // Add multi-tenant headers only if available
  if (TENANT_ID) base["X-Tenant-Id"] = TENANT_ID;
  if (COMPANY_ID) base["X-Company-Id"] = COMPANY_ID;

  const method = (opts?.method || "GET").toUpperCase();

  if (!opts?.isForm && method !== "GET") {
    base["Content-Type"] = "application/json";
  }

  const token = getAuthToken();
  if (token) {
    base["Authorization"] = `Bearer ${token}`;
  }

  return { ...base, ...(extra || {}) };
}

/**
 * apiFetch helper:
 * - If path is relative and starts with /api, call same-origin endpoint (no cross-site cookies/CORS).
 * - If path is an absolute URL, call it directly (preserves original behavior).
 * This lets you call `/api/...` and have requests go to your Next server which can proxy/forward.
 */
function apiFetch(path: string, init?: RequestInit) {
  if (/^\/api\//.test(path)) {
    // same-origin call to Next.js API route
    return fetch(path, init);
  }
  // absolute URL (fallback)
  return fetch(path, init);
}

/* ───────────────── Types ──────────────── */
type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  probability?: number | null;
  follow_up_date?: string | null;
  meta?: Record<string, any> | null;
};

type CFFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "json"
  | "file"
  | "image";

type CFDef = {
  definition_id: string;
  key: string;
  label: string;
  field_type: CFFieldType;
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

const STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
  "On Hold",
];

/* ───────────────── Small helpers ───────── */
function toYMD(value?: string | null): string {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function ensureArrayRows(data: any): any[] {
  // Try common shapes
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;

  // defs+values split
  if (Array.isArray(data?.defs)) {
    const vals = Array.isArray(data?.values) ? data.values : [];
    const byDef: Record<string, any> = {};
    for (const v of vals) {
      const did = String(v.definition_id ?? v.definitionId ?? v.id ?? "");
      if (did) byDef[did] = v;
    }
    return data.defs.map((d: any) => {
      const did = String(d.definition_id ?? d.definitionId ?? d.id ?? "");
      return { ...d, ...(did ? byDef[did] : {}) };
    });
  }
  return [];
}

function coerceFieldType(r: any): CFFieldType {
  const t = String(r.field_type ?? r.type ?? r.input_type ?? "text").toLowerCase();
  const known: CFFieldType[] = [
    "text",
    "textarea",
    "number",
    "boolean",
    "date",
    "datetime",
    "select",
    "multiselect",
    "json",
    "file",
    "image",
  ];
  return (known.includes(t as CFFieldType) ? t : "text") as CFFieldType;
}

function defId(r: any): string {
  return String(r.definition_id ?? r.definitionId ?? r.id ?? "");
}

function tryParseOptions(opts: any) {
  if (opts == null) return null;
  if (typeof opts === "string") {
    try {
      return JSON.parse(opts);
    } catch {
      return opts;
    }
  }
  return opts;
}

function selectOptionsFrom(def: CFDef): Array<{ value: string; label: string }> {
  const raw = def.options ?? [];
  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === "object") return raw as any;
    return raw.map((s: any) => ({ value: String(s), label: String(s) }));
  }
  return [];
}

function fieldLabel(def: CFDef) {
  return `${def.label}${def.required ? " *" : ""}`;
}

/* ───────────────── Field renderer ───────── */
function CustomFieldInput({
  def,
  value,
  onChange,
  disabled,
}: {
  def: CFDef;
  value: CFValue;
  onChange: (v: CFValue) => void;
  disabled?: boolean;
}) {
  const common =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white";

  type CFUIOverride = "file" | "image" | undefined;
  const ui = (def.metadata?.ui as CFUIOverride) || undefined;
  const kind: CFFieldType = (ui as CFFieldType) ?? def.field_type;

  async function uploadOne(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    // Use same-origin uploads route so the server proxy can attach cookies / auth
    const r = await apiFetch(`/api/uploads`, {
      method: "POST",
      body: fd,
      credentials: "include",
      headers: authHeaders({}, { method: "POST", isForm: true }),
    });

    if (!r.ok) throw new Error((await r.text().catch(() => "")) || "Upload failed");
    return r.json(); // { url, name, size, type, ... }
  }

  switch (kind) {
    case "textarea":
      return (
        <textarea
          className={common}
          rows={3}
          placeholder={def.label}
          value={value.value_text ?? ""}
          onChange={(e) => onChange({ value_text: e.target.value })}
          disabled={disabled}
        />
      );

    case "number":
      return (
        <input
          className={common}
          type="number"
          inputMode="decimal"
          placeholder={def.label}
          value={value.value_number ?? ("" as any)}
          onChange={(e) =>
            onChange({
              value_number: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          disabled={disabled}
        />
      );

    case "boolean":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={!!value.value_boolean}
            onChange={(e) => onChange({ value_boolean: e.target.checked })}
            disabled={disabled}
          />
          <span>{fieldLabel(def)}</span>
        </label>
      );

    case "date":
      return (
        <input
          className={common}
          type="date"
          value={value.value_text ?? ""}
          onChange={(e) => onChange({ value_text: e.target.value })}
          disabled={disabled}
        />
      );

    case "datetime":
      return (
        <input
          className={common}
          type="datetime-local"
          value={value.value_text ?? ""}
          onChange={(e) => onChange({ value_text: e.target.value })}
          disabled={disabled}
        />
      );

    case "select": {
      const opts = selectOptionsFrom(def);
      return (
        <select
          className={`${common} dark-select`}
          style={{ colorScheme: "dark" as any }}
          value={value.value_text ?? ""}
          onChange={(e) => onChange({ value_text: e.target.value })}
          disabled={disabled}
        >
          <option value="">— Select —</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case "multiselect": {
      const opts = selectOptionsFrom(def);
      const arr = Array.isArray(value.value_json) ? value.value_json : [];
      return (
        <select
          className={`${common} dark-select`}
          style={{ colorScheme: "dark" as any }}
          multiple
          value={arr}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
            onChange({ value_json: selected });
          }}
          disabled={disabled}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case "json":
      return (
        <textarea
          className={common}
          rows={3}
          placeholder='JSON (e.g., {"pref":"vip"})'
          value={value.value_json ? JSON.stringify(value.value_json) : ""}
          onChange={(e) => {
            const t = e.target.value.trim();
            if (!t) return onChange({ value_json: null });
            try {
              onChange({ value_json: JSON.parse(t) });
            } catch {
              onChange({ value_json: t as any });
            }
          }}
          disabled={disabled}
        />
      );

    case "file":
    case "image": {
      const meta = (value.value_json as any) || null;
      const url = meta?.url || value.value_text || "";
      return (
        <div className="space-y-2">
          {kind === "image" && url ? (
            <img
              src={url}
              alt={def.label}
              className="max-h-32 rounded-lg border border-white/10"
            />
          ) : url ? (
            <a href={url} target="_blank" className="text-xs underline break-all">
              {meta?.name || url}
            </a>
          ) : null}

         <input
  type="file"
  className={common}
  accept={kind === "image" ? "image/*" : undefined}
  onChange={async (e) => {
    // capture the input element and file synchronously (before any await)
    const input = e.currentTarget;
    const f = input.files?.[0];
    if (!f) return;

    try {
      const uploaded = await uploadOne(f);
      onChange({ value_text: uploaded.url, value_json: uploaded });
    } catch (err: any) {
      alert(err?.message || "Upload failed");
    } finally {
      // use the saved DOM element reference (not the synthetic event)
      // guard against null just to be safe
      try {
        if (input) input.value = "";
      } catch {
        /* ignore */
      }
    }
  }}
  disabled={disabled}
/>

        </div>
      );
    }

    default:
      return (
        <input
          className={common}
          placeholder={def.label}
          value={value.value_text ?? ""}
          onChange={(e) => onChange({ value_text: e.target.value })}
          disabled={disabled}
        />
      );
  }
}

/* ───────────────── Component ───────── */
export default function EditLeadFormClient({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [cfDefs, setCfDefs] = useState<CFDef[]>([]);
  const [cfValues, setCfValues] = useState<Record<string, CFValue>>({});
  const [cfLoading, setCfLoading] = useState(false);
  const [cfErr, setCfErr] = useState<string | null>(null);

  // Debug state
  const [debugRaw, setDebugRaw] = useState<any>(null);
  const [debugFrom, setDebugFrom] = useState<"leadJoined" | "adminFallback" | null>(null);
  const debugPretty = useMemo(
    () => (debugRaw ? JSON.stringify(debugRaw, null, 2) : ""),
    [debugRaw]
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setCfErr(null);
        setCfLoading(true);

        // 1) try richer joined endpoint (same-origin proxy)
        const url1 = `/api/leads/${encodeURIComponent(lead.id)}/custom-fields`;
        console.log("Fetching custom fields (lead-joined):", url1);
        let resp = await apiFetch(url1, {
          credentials: "include",
          headers: authHeaders({}, { method: "GET" }),
          signal: controller.signal,
        });

        let data: any = null;
        if (resp.ok) {
          try {
            data = await resp.json();
          } catch {
            data = null;
          }
          const rows1 = ensureArrayRows(data);
          if (rows1.length) {
            if (!cancelled) {
              setDebugFrom("leadJoined");
              setDebugRaw({ url: url1, data });
              applyRows(rows1);
            }
            return;
          }
        } else {
          // log body for debugging
          const t = await resp.text().catch(() => "");
          console.warn("lead-joined fetch failed", resp.status, t);
        }

        // 2) fallback to admin defs (same-origin proxy)
        const url2 = `/api/admin/custom-fields?entity=lead`;
        console.log("Fetching custom fields (admin fallback):", url2);
        resp = await apiFetch(url2, {
          credentials: "include",
          headers: authHeaders({}, { method: "GET" }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || `HTTP ${resp.status}`);
        }

        data = await resp.json();
        const rows2 = ensureArrayRows(data);

        if (!cancelled) {
          setDebugFrom("adminFallback");
          setDebugRaw({ url: url2, data });
          applyRows(rows2);
        }
      } catch (e: any) {
        if (!cancelled && e?.name !== "AbortError") {
          setCfErr(e?.message || "Could not load custom fields");
        }
      } finally {
        if (!cancelled) setCfLoading(false);
      }
    })();

    function applyRows(rows: any[]) {
      const defs: CFDef[] = rows.map((r: any) => ({
        definition_id: defId(r),
        key: r.key ?? r.field_key ?? r.name ?? r.slug ?? "",
        label: r.label ?? r.title ?? r.name ?? r.key ?? "Unnamed",
        field_type: coerceFieldType(r),
        options: tryParseOptions(r.options ?? r.choices ?? r.select_options ?? null),
        required: !!(r.required ?? r.is_required),
        visible: (r.visible ?? r.is_visible) !== false,
        sort_order: r.sort_order ?? r.order ?? null,
        metadata: r.metadata ?? r.meta ?? null,
      }));

      const values: Record<string, CFValue> = {};
      for (const r of rows) {
        const id = defId(r);
        const v: CFValue = {
          value_text: r.value_text !== undefined ? r.value_text : undefined,
          value_number: r.value_number !== undefined ? Number(r.value_number) : undefined,
          value_boolean: r.value_boolean !== undefined ? !!r.value_boolean : undefined,
          value_json: r.value_json !== undefined ? r.value_json : undefined,
        };

        if (
          v.value_text === undefined &&
          v.value_number === undefined &&
          v.value_boolean === undefined &&
          v.value_json === undefined
        ) {
          switch (coerceFieldType(r)) {
            case "number":
              v.value_number = null;
              break;
            case "boolean":
              v.value_boolean = false;
              break;
            case "multiselect":
              v.value_json = [];
              break;
            case "json":
            case "file":
            case "image":
              v.value_json = null;
              break;
            default:
              v.value_text = "";
          }
        }
        values[id] = v;
      }

      defs.sort((a, b) => {
        const sa = a.sort_order ?? 100;
        const sb = b.sort_order ?? 100;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      });

      setCfDefs(defs);
      setCfValues(values);
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lead.id]);

  function setCF(defId: string, updater: (prev: CFValue) => CFValue) {
    setCfValues((prev) => ({ ...prev, [defId]: updater(prev[defId] || {}) }));
  }

  function validateRequiredCustomFields(): string | null {
    for (const d of cfDefs) {
      if (!d.required) continue;
      const v = cfValues[d.definition_id];
      const empty =
        !v ||
        (d.field_type === "number"
          ? v.value_number == null
          : d.field_type === "boolean"
          ? v.value_boolean == null
          : d.field_type === "multiselect"
          ? !(Array.isArray(v.value_json) && v.value_json.length)
          : d.field_type === "json"
          ? v.value_json == null
          : d.field_type === "file" || d.field_type === "image"
          ? !v.value_text && !v.value_json
          : !v.value_text || String(v.value_text).trim() === "");
      if (empty) return `Custom field "${d.label}" is required`;
    }
    return null;
  }

  async function saveCustomFields() {
    if (cfDefs.length === 0) return { ok: true };
    const requiredErr = validateRequiredCustomFields();
    if (requiredErr) throw new Error(requiredErr);

    const calls = cfDefs.map(async (def) => {
      const v = cfValues[def.definition_id] || {};
      const body = {
        value_text: v.value_text ?? null,
        value_number: v.value_number === undefined ? null : (v.value_number as number | null),
        value_boolean: typeof v.value_boolean === "boolean" ? v.value_boolean : null,
        value_json: v.value_json ?? null,
      };

      const url = `/api/leads/${encodeURIComponent(lead.id)}/custom-fields/${encodeURIComponent(
        def.definition_id
      )}`;

      const r = await apiFetch(url, {
        method: "PUT",
        headers: authHeaders({}, { method: "PUT" }),
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!r.ok && r.status !== 204) {
        const text = await r.text().catch(() => "");
        throw new Error(`"${def.label}": ${text || `HTTP ${r.status}`}`);
      }
    });

    const results = await Promise.allSettled(calls);
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    if (rejected.length) {
      throw new Error(`Some custom fields failed to save (${rejected.length}).`);
    }
    return { ok: true };
  }

  /* ───────────────── Core form handlers ───────── */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const fd = new FormData(e.currentTarget);

    const follow = toYMD(fd.get("follow_up_date") as string);
    const payload = {
      name: (fd.get("name") as string)?.trim() || null,
      email: (fd.get("email") as string)?.trim() || null,
      phone: (fd.get("phone") as string)?.trim() || null,
      status: (fd.get("status") as string)?.trim() || null,
      estimated_value: fd.get("estimated_value") ? Number(fd.get("estimated_value")) : null,
      probability: fd.get("probability") ? Number(fd.get("probability")) : null,
      follow_up_date: follow || null,
      meta: { ...(lead.meta ?? {}), follow_up_date: follow || null },
    };

    try {
      const r = await apiFetch(`/api/leads/${encodeURIComponent(lead.id)}`, {
        method: "PATCH",
        headers: authHeaders({}, { method: "PATCH" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `HTTP ${r.status}`);
      }

      if (cfDefs.length) {
        await saveCustomFields();
      }

      startTransition(() => {
        router.push("/crm/leads");
        router.refresh();
      });
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
  }

  async function onDelete() {
    if (deleting || pending) return;
    const ok = window.confirm("Delete this lead permanently?");
    if (!ok) return;

    setErr(null);
    setDeleting(true);
    try {
      const r = await apiFetch(`/api/leads/${encodeURIComponent(lead.id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders({}, { method: "DELETE" }),
      });

      if (!r.ok && r.status !== 204) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `HTTP ${r.status}`);
      }

      startTransition(() => {
        router.push("/crm/leads");
        router.refresh();
      });
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* ───────── Basic Info ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-xs opacity-70 mb-1">Name</div>
          <input
            name="name"
            defaultValue={lead.name || ""}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Email</div>
          <input
            name="email"
            defaultValue={lead.email || ""}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Phone</div>
          <input
            name="phone"
            defaultValue={lead.phone || ""}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Status</div>
          <select
            name="status"
            defaultValue={lead.status ?? ""}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          >
            <option value="" disabled hidden>
              Select status…
            </option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {lead.status && !STATUS_OPTIONS.includes(lead.status) && (
              <option value={lead.status}>{lead.status}</option>
            )}
          </select>
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Estimated Value (₹)</div>
          <input
            name="estimated_value"
            type="number"
            step="1"
            defaultValue={lead.estimated_value ?? ""}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Probability (%)</div>
          <input
            name="probability"
            type="number"
            step="1"
            min="0"
            max="100"
            defaultValue={lead.probability ?? ""}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Follow-up Date</div>
          <input
            name="follow_up_date"
            type="date"
            defaultValue={toYMD(lead.follow_up_date)}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            disabled={pending || deleting}
          />
        </label>
      </div>

      {/* ───────── Advance (Custom Fields) ───────── */}
      <section className="pt-2">
        <div className="text-[11px] uppercase tracking-wide text-white/60 mb-2">Advance</div>

        {cfLoading && <div className="text-sm opacity-70">Loading custom fields…</div>}
        {cfErr && (
          <div className="text-xs text-amber-300">
            {cfErr} — the form can still be saved without them.
          </div>
        )}

        {!cfLoading && !cfErr && cfDefs.length === 0 && (
          <div className="space-y-2">
            <div className="text-sm opacity-60">No custom fields configured.</div>
            {/* Inline debug when empty to see raw response & endpoint */}
            {debugRaw && (
              <details className="rounded border border-amber-400/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                <summary className="cursor-pointer">
                  Debug: {debugFrom === "leadJoined" ? "Lead joined endpoint" : "Admin fallback"} response
                </summary>
                <div className="mt-2">
                  <div className="mb-1 font-semibold">URL</div>
                  <code className="block break-all">{String(debugRaw.url)}</code>
                  <div className="mt-2 mb-1 font-semibold">Raw JSON</div>
                  <pre className="whitespace-pre-wrap break-all">{debugPretty}</pre>
                </div>
              </details>
            )}
          </div>
        )}

        {!cfLoading && cfDefs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cfDefs.map((def) => {
              if (def.visible === false) return null;
              const v = cfValues[def.definition_id] || {};
              const isBoolean = (def.metadata?.ui ?? def.field_type) === "boolean";
              return (
                <label key={def.definition_id} className="block">
                  {!isBoolean && (
                    <div className="text-xs opacity-70 mb-1">{fieldLabel(def)}</div>
                  )}
                  <CustomFieldInput
                    def={def}
                    value={v}
                    onChange={(nv) => setCF(def.definition_id, () => ({ ...nv }))}
                    disabled={pending || deleting}
                  />
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────── Footer actions ───────── */}
      <div className="flex flex-wrap gap-2 items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || deleting}
            className="rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/crm/leads")}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            disabled={pending || deleting}
          >
            Cancel
          </button>
        </div>

        {/* Danger zone */}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending || deleting}
          className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm hover:bg-red-500/20 disabled:opacity-60"
          title="Delete this lead"
        >
          {deleting ? "Deleting…" : "Delete Lead"}
        </button>
      </div>

      {/* native select readability on dark UIs */}
      <style jsx global>{`
        select.dark-select {
          color: #fff;
        }
        select.dark-select option {
          background-color: #0a0a0a;
          color: #fff;
        }
      `}</style>
    </form>
  );
}
