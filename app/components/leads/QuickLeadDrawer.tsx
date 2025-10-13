"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Fireworks from "@/app/components/effects/Fireworks";
import { useToast } from "@/components/ui/use-toast";

/* ───────────────── Types ───────────────── */
type FireworksHandle = {
  burstAt: (x: number, y: number) => void;
  burstCenter: () => void;
};

type CompanyOpt = { id: string; name?: string };

/* ======================= Auth-safe axios defaults ======================= */
// Ensure browser sends cookies to the Next API (same origin)
try {
  apiClient.defaults.withCredentials = true;
  // If your apiClient has a baseURL, keep it '', or make sure it’s same-origin.
  // Example (uncomment if needed):
  // apiClient.defaults.baseURL = "";
} catch {
  /* no-op */
}

/* ======================= Data ======================= */
const COUNTRIES = [
  { iso2: "IN", name: "India", dial: "91" },
  { iso2: "AE", name: "United Arab Emirates", dial: "971" },
  { iso2: "US", name: "United States", dial: "1" },
  { iso2: "GB", name: "United Kingdom", dial: "44" },
  { iso2: "SG", name: "Singapore", dial: "65" },
  { iso2: "SA", name: "Saudi Arabia", dial: "966" },
];

const SOURCE_OPTIONS = [
  "Direct",
  "Web",
  "Referral",
  "Campaign",
  "Inbound Call",
  "Outbound Call",
  "Event",
  "Social",
  "Partner",
  "Other",
];

const dialOf = (iso2: string) => COUNTRIES.find((c) => c.iso2 === iso2)?.dial ?? "91";
const countryOf = (iso2: string) => COUNTRIES.find((c) => c.iso2 === iso2) ?? COUNTRIES[0];

/* ======================= Utils (flags) ======================= */
function iso2ToEmoji(iso2: string) {
  const A = 0x1f1e6;
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(A + c.charCodeAt(0) - 65))
    .join("");
}
const flagClass = (iso2: string) => `fi fi-${iso2.toLowerCase()}`;

// Shows SVG flag if flag-icons CSS is present; falls back to emoji
function FlagIcon({ iso2, width = 20, height = 14 }: { iso2: string; width?: number; height?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") setFallback(iso2ToEmoji(iso2));
  }, [iso2]);
  if (fallback) {
    return (
      <span
        aria-hidden
        style={{ width, height, display: "inline-grid", placeItems: "center", fontSize: Math.round(height * 0.9) }}
      >
        {fallback}
      </span>
    );
  }
  return <span ref={ref} aria-hidden className={`${flagClass(iso2)} block`} style={{ width, height, borderRadius: 3 }} />;
}

/* ======================= Hooks ======================= */
function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T>, onOutside: () => void) {
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onOutside]);
}

/* ======================= Small UI ======================= */
function CaretDown({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function MenuItem({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
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

/* ======================= Country + Phone (one line) ======================= */
function CountryPhoneRow({
  phone_country,
  phone_national,
  onChangeCountry,
  onChangeNational,
}: {
  phone_country: string;
  phone_national: string;
  onChangeCountry: (iso2: string) => void;
  onChangeNational: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const country = countryOf(phone_country);
  const prefix = `+${country.dial}`;

  return (
    <div className="relative flex gap-2" ref={ref}>
      {/* Flag + dial toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FlagIcon iso2={country.iso2} />
        <span className="tabular-nums">+{country.dial}</span>
        <CaretDown className="opacity-70" />
      </button>

      {/* Phone input — same line as flag button */}
      <div className="flex-1 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-70">{prefix}</span>
        <Input
          className="pl-12"
          placeholder="XXXXXXXXXX"
          value={phone_national}
          onChange={(e) => onChangeNational(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>

      {/* Country menu */}
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-72 rounded-xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl p-2 left-0"
        >
          <div className="max-h-56 overflow-auto pr-1">
            {COUNTRIES.map((c) => (
              <MenuItem
                key={c.iso2}
                active={c.iso2 === phone_country}
                onClick={() => {
                  onChangeCountry(c.iso2);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <FlagIcon iso2={c.iso2} />
                  <span className="flex-1">{c.name}</span>
                  <span className="opacity-80">+{c.dial}</span>
                </div>
              </MenuItem>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Source (dark dropdown) ======================= */
function SourceSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  useClickOutside(anchor, () => setOpen(false));

  return (
    <div className="relative" ref={anchor}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <CaretDown />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl p-2"
        >
          <div className="max-h-56 overflow-auto pr-1">
            {options.map((opt) => (
              <MenuItem
                key={opt}
                active={opt === value}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </MenuItem>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================= Assign Employee (practical) ======================= */
/** Tries GET /admin/users (expects {users:[{id,name,email}]}). Falls back to manual ID input if fetch fails. */
function AssignEmployee({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const selected = users.find((u) => u.id === value) || null;

  async function loadUsers() {
    try {
      setErr(null);
      setLoading(true);
      // If apiClient.baseURL ends with /api, use "/admin/users"
      const { data } = await apiClient.get("/admin/users", {
        params: { active: 1, page: 1, pageSize: 50 },
        withCredentials: true,
      });
      const arr = Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setUsers(
        arr.map((u: any) => ({
          id: String(u.id ?? u.user_id ?? u.uuid),
          name: u.name ?? u.full_name ?? null,
          email: u.email ?? null,
        })),
      );
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Could not load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && users.length === 0 && !loading && !err) {
      loadUsers();
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? (selected.name || selected.email || selected.id) : "Unassigned"}</span>
        <CaretDown />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl p-2">
          <div className="max-h-60 overflow-auto pr-1">
            {loading && <div className="px-3 py-2 text-sm opacity-70">Loading...</div>}
            {err && (
              <div className="space-y-2 p-2">
                <div className="px-3 py-2 text-sm text-amber-300">Team not available. Enter an ID:</div>
                <ManualAssign value={value} onChange={onChange} />
              </div>
            )}
            {!loading && !err && users.length > 0 && (
              <>
                <MenuItem active={!value} onClick={() => { onChange(null); setOpen(false); }}>
                  Unassigned
                </MenuItem>
                {users.map((u) => (
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
            {!loading && !err && users.length === 0 && (
              <div className="space-y-2 p-2">
                <div className="px-3 py-2 text-sm opacity-70">No team found. Enter an ID:</div>
                <ManualAssign value={value} onChange={onChange} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualAssign({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [input, setInput] = useState(value ?? "");
  return (
    <div className="flex gap-2">
      <Input className="flex-1" placeholder="user-id / uuid" value={input} onChange={(e) => setInput(e.target.value)} />
      <Button onClick={() => onChange(input || null)}>Set</Button>
    </div>
  );
}

/* ======================= Main ======================= */
export default function QuickLeadDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (lead: any) => void;
}) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    lead_name: "",
    email: "",
    phone_national: "",
    phone_country: "IN",
    source: "Direct",
    assigned_user_id: null as string | null,
    company_id: null as string | null,
  });
  const [companyChoices, setCompanyChoices] = useState<CompanyOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🎆 Fireworks refs
  const fxRef = useRef<FireworksHandle>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  const phoneE164 = useMemo(() => {
    const digits = (form.phone_national || "").replace(/\D/g, "");
    return digits ? `+${dialOf(form.phone_country)}${digits}` : null;
  }, [form.phone_country, form.phone_national]);

  function coerceCompanies(raw: any): CompanyOpt[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((r) => (typeof r === "string" ? { id: r } : { id: String(r.id), name: r.name }));
    }
    return [];
  }

  function celebrate() {
    const rect = saveBtnRef.current?.getBoundingClientRect();
    if (rect) {
      fxRef.current?.burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      fxRef.current?.burstCenter();
    }
  }

  async function submit() {
    setErr(null);
    if (!form.lead_name.trim()) {
      setErr("Lead name is required");
      return;
    }

    try {
      setLoading(true);

      const name = form.lead_name.trim();

      // Minimal, schema-safe payload:
      const payload: any = {
        name,
        title: name,
        lead_name: name, // harmless duplicate; backend may map to name anyway
        email: form.email || undefined,
        phone_e164: phoneE164 || undefined,
        source: form.source || undefined,
        assigned_user_id: form.assigned_user_id || undefined,
        company_id: form.company_id || undefined, // include only if user picked
      };

      // If apiClient.baseURL ends with /api, this is correct:
      const { data } = await apiClient.post("/leads", payload, { withCredentials: true });

      celebrate(); // 🎆 success!
      toast({ title: "Lead saved", description: data?.lead?.name ?? name });

      onCreated?.(data.lead ?? data);
      onClose();
      setForm({
        lead_name: "",
        email: "",
        phone_national: "",
        phone_country: "IN",
        source: "Direct",
        assigned_user_id: null,
        company_id: null,
      });
      setCompanyChoices([]);
    } catch (e: any) {
      // dump helpful context to console
      console.error("Create lead failed", {
        status: e?.response?.status,
        data: e?.response?.data,
        text: e?.response?.request?.responseText,
      });

      const status = e?.response?.status;
      const errData = e?.response?.data;

      // Server needs a company choice → try auto-pick first and retry once
      if (status === 400 && errData?.error === "company_required") {
        const list = coerceCompanies(errData?.companies);
        setCompanyChoices(list);

        if (list.length === 1) {
          const [only] = list;
          setForm((f) => ({ ...f, company_id: only.id }));
          try {
            const retryPayload = {
              name: form.lead_name.trim(),
              title: form.lead_name.trim(),
              lead_name: form.lead_name.trim(),
              email: form.email || undefined,
              phone_e164: phoneE164 || undefined,
              source: form.source || undefined,
              assigned_user_id: form.assigned_user_id || undefined,
              company_id: only.id,
            };
            const { data } = await apiClient.post("/leads", retryPayload, { withCredentials: true });

            celebrate(); // 🎆 success after retry
            toast({ title: "Lead saved", description: data?.lead?.name ?? form.lead_name });

            onCreated?.(data.lead ?? data);
            onClose();
            setForm({
              lead_name: "",
              email: "",
              phone_national: "",
              phone_country: "IN",
              source: "Direct",
              assigned_user_id: null,
              company_id: null,
            });
            setCompanyChoices([]);
            return;
          } catch (retryErr: any) {
            console.error("Retry after auto-select company failed", retryErr?.response?.data || retryErr);
          }
        }

        setErr("Please select a company, then click Save again.");
        toast({
          title: "Company required",
          description: "Pick a company from the dropdown and save once more.",
          variant: "destructive",
        });
        return;
      }

      const serverMsg =
        errData?.error ||
        errData?.message ||
        (typeof errData === "string" ? errData : null);

      const msg =
        status === 401
          ? "Unauthorized (401): Please log in again."
          : status === 400
          ? `Bad Request (400): ${serverMsg ?? "Validation failed — check required fields."}`
          : status === 500
          ? `Server Error (500): ${serverMsg ?? "See server logs for stack trace."}`
          : serverMsg || e?.message || "Failed to create";

      setErr(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* 🎆 Overlay on the whole app */}
      <Fireworks ref={fxRef} zIndex={80} />

      <Drawer open={open} onClose={onClose} title="Quick Lead">
        <div className="space-y-3">
          {err && <div className="text-red-400 text-sm">{err}</div>}

          {/* Lead Name (single field for quick flow) */}
          <div>
            <label className="block text-sm">Lead Name</label>
            <Input
              placeholder="e.g., Rahul Sharma"
              value={form.lead_name}
              onChange={(e) => setForm({ ...form, lead_name: e.target.value })}
            />
          </div>

          {/* Email — its own full-width row */}
          <div>
            <label className="block text-sm">Email</label>
            <Input
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Phone — its own row, with country flag + dial on the same line */}
          <div>
            <label className="block text-sm">Phone</label>
            <CountryPhoneRow
              phone_country={form.phone_country}
              phone_national={form.phone_national}
              onChangeCountry={(iso2) => setForm({ ...form, phone_country: iso2 })}
              onChangeNational={(v) => setForm({ ...form, phone_national: v })}
            />
          </div>

          {/* Source — dark dropdown */}
          <div>
            <label className="block text-sm">Source</label>
            <SourceSelect value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={SOURCE_OPTIONS} />
          </div>

          {/* Assign Employee — practical dropdown with /admin/users fetch + manual fallback */}
          <div>
            <label className="block text-sm">Assign To</label>
            <AssignEmployee
              value={form.assigned_user_id}
              onChange={(id) => setForm({ ...form, assigned_user_id: id })}
            />
          </div>

          {/* Company picker appears only if server asks for it */}
          {companyChoices.length > 0 && (
            <div>
              <label className="block text-sm">Company</label>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={form.company_id ?? ""}
                onChange={(e) => setForm({ ...form, company_id: e.target.value || null })}
              >
                <option value="" disabled>Select company</option>
                {companyChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ? `${c.name} (${c.id})` : c.id}
                  </option>
                ))}
              </select>
              <div className="text-xs opacity-70 mt-1">Pick a company and hit Save again.</div>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button ref={saveBtnRef} onClick={submit} disabled={loading || !form.lead_name.trim()}>
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button onClick={onClose} className="bg-white/0 border-white/20">
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
