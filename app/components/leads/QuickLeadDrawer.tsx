"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

/* ───────────────── Types ───────────────── */
export interface LeadDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (lead: any) => void;
}
type CompanyOpt = { id: string; name?: string | null };

/* ======================= Auth-safe axios defaults ======================= */
try {
  apiClient.defaults.withCredentials = true;
} catch {}

/* ======================= Data ======================= */
const COUNTRIES = [
  { iso2: "IN", name: "India", dial: "91" },
  { iso2: "AE", name: "United Arab Emirates", dial: "971" },
  { iso2: "US", name: "United States", dial: "1" },
  { iso2: "GB", name: "United Kingdom", dial: "44" },
  { iso2: "SG", name: "Singapore", dial: "65" },
  { iso2: "SA", name: "Saudi Arabia", dial: "966" },
] as const;

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
] as const;

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

/* ======================= Country + Phone ======================= */
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 text-white/90"
      >
        <FlagIcon iso2={country.iso2} />
        <span className="tabular-nums">+{country.dial}</span>
        <CaretDown className="opacity-70" />
      </button>

      <div className="flex-1 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/60">{prefix}</span>
        <Input
          className="pl-12 bg-transparent text-white/95 placeholder:text-white/60 border border-white/15"
          placeholder="XXXXXXXXXX"
          inputMode="numeric"
          value={phone_national}
          onChange={(e) => onChangeNational(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-72 rounded-xl border border-white/10 bg-zinc-900/95 text-white shadow-2xl p-2 left-0 backdrop-blur-xl"
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
function SourceSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  useClickOutside(anchor, () => setOpen(false));

  return (
    <div className="relative" ref={anchor}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        <span>{value}</span>
        <CaretDown />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-zinc-900/95 text-white shadow-2xl p-2 backdrop-blur-xl"
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

/* ======================= Main ======================= */
export default function QuickLeadDrawer({ open, onClose, onCreated }: LeadDrawerProps) {
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
  const submittingRef = useRef(false);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  const phoneE164 = useMemo(() => {
    const digits = (form.phone_national || "").replace(/\D/g, "");
    return digits ? `+${dialOf(form.phone_country)}${digits}` : null;
  }, [form.phone_country, form.phone_national]);

  async function doCreate(payload: any) {
    const { data } = await apiClient.post("/leads", payload, { withCredentials: true });
    return data?.lead ?? data;
  }

  async function submit() {
    if (submittingRef.current) return;
    setErr(null);

    if (!form.lead_name.trim()) {
      setErr("Lead name is required");
      return;
    }

    try {
      submittingRef.current = true;
      setLoading(true);
      try {
        document.body.style.cursor = "wait";
      } catch {}

      const name = form.lead_name.trim();
      const basePayload: any = {
        name,
        title: name,
        lead_name: name,
        email: form.email || undefined,
        phone_e164: phoneE164 || undefined,
        source: form.source || undefined,
        assigned_user_id: form.assigned_user_id || undefined,
        company_id: form.company_id || undefined,
      };

      console.log("[QuickLeadDrawer] POST /leads payload:", basePayload);

      let created;
      try {
        created = await doCreate(basePayload);
        console.log("[QuickLeadDrawer] /leads response:", created);
      } catch (apiErr: any) {
        console.error("[QuickLeadDrawer] POST /leads failed:", apiErr?.response?.status, apiErr?.response?.data || apiErr);
        try {
          toast({ title: "Save failed", description: apiErr?.response?.data?.error || apiErr?.message || "Error creating lead", variant: "destructive" });
        } catch {
          alert("Save failed: " + (apiErr?.response?.data?.error || apiErr?.message || "Error creating lead"));
        }
        setErr(String(apiErr?.response?.data?.error || apiErr?.message || "Failed to create"));
        return;
      }

      // success
      console.log("[QuickLeadDrawer] created lead:", created);
      try {
        toast({ title: "Lead saved", description: created?.name ?? name });
      } catch {
        alert("Lead saved: " + (created?.name ?? name));
      }

      try {
        onCreated?.(created);
      } catch (cbErr: any) {
        console.error("[QuickLeadDrawer] onCreated callback threw:", cbErr);
      }

      // dispatch a global event so listeners can update immediately
      try {
        // keep the old event (for any existing listeners)
        window.dispatchEvent(
          new CustomEvent("app:notification", {
            detail: {
              type: "lead_created",
              lead: created,
              increment: 1,
              toast: {
                title: "Lead saved",
                description: created?.name ?? name,
              },
            },
          })
        );
      } catch (e: any) {
        console.warn("[QuickLeadDrawer] failed to dispatch app:notification:", e);
      }

      // NEW: dispatch app:messages (Topbar friendly shape)
try {
  const messagePayload = {
    id: String(created?.id ?? `lead-${Date.now()}`),
    title: "Lead saved",
    body: created?.name ?? name,
    from: created?.created_by ?? "System",
    created_at: created?.created_at ?? new Date().toISOString(),
    read: false,
  };

  console.info("[QuickLeadDrawer] about to dispatch app:messages", messagePayload);

  window.dispatchEvent(
    new CustomEvent("app:messages", {
      detail: {
        messagesIncrement: 1,
        messages: [messagePayload],
      },
    })
  );

  // fallback
  try {
    const store = { ts: Date.now(), messagesIncrement: 1, messages: [messagePayload] };
    localStorage.setItem("gg:messages:latest", JSON.stringify(store));
  } catch (lsErr) {
    console.warn("[QuickLeadDrawer] localStorage write failed", lsErr);
  }

  console.info("[QuickLeadDrawer] dispatched app:messages and wrote gg:messages:latest");
} catch (e: any) {
  console.warn("[QuickLeadDrawer] failed to dispatch app:messages:", e);
}
      // reset
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
      console.error("[QuickLeadDrawer] unexpected error:", e);
      try {
        toast({ title: "Save failed", description: e?.message || "Unexpected error", variant: "destructive" });
      } catch {
        alert("Save failed: " + (e?.message || "Unexpected error"));
      }
      setErr(String(e?.message || "Unexpected error"));
    } finally {
      setLoading(false);
      submittingRef.current = false;
      try {
        document.body.style.cursor = "";
      } catch {}
      console.log("[QuickLeadDrawer] submit finished, loading reset");
    }
  }

  // keyboard shortcuts: Enter => save, Escape => close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.isComposing) {
        const t = e.target as HTMLElement | null;
        const tag = (t?.tagName || "").toLowerCase();
        if (tag !== "textarea" && tag !== "select") submit();
      }
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form, phoneE164]);

  if (!open || typeof document === "undefined") return null;

  // Prefer layout-local portal root when available so drawer inherits layout theme & stacking
  const mountNode =
    (typeof document !== "undefined" && document.getElementById("portal-root")) || document.body;

  return ReactDOM.createPortal(
    // Wrapper forces pointer-events handling and preserves layout theme when mounted into body
    <div className="pointer-events-auto" aria-hidden={false}>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[999999] flex"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: "linear-gradient(180deg, rgba(6,6,9,0.55), rgba(2,2,5,0.65))",
            backdropFilter: "blur(30px)",
          }}
        />

        <aside
          className="
            relative ml-auto w-full max-w-md h-full overflow-auto p-8
            border-l border-white/10
            bg-gradient-to-br from-white/[0.03] via-white/[0.015] to-white/[0.04]
            backdrop-blur-2xl
            shadow-[inset_0_0_60px_rgba(255,255,255,0.04),_0_8px_40px_rgba(100,100,255,0.08)]
            rounded-l-3xl
            text-white
          "
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <div>
              <div
                className="text-lg font-semibold text-white/95"
                style={{ textShadow: "0 1px 0 rgba(0,0,0,0.6), 0 6px 12px rgba(80,70,200,0.1)" }}
              >
                Quick Lead
              </div>
              <div className="text-xs text-white/70">Create lead quickly</div>
            </div>
            <button
              onClick={onClose}
              className="rounded px-2 py-1 text-sm text-white/70 hover:bg-white/5 focus:outline-none"
              aria-label="Close quick lead"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {err && <div className="text-rose-400 text-sm">{err}</div>}

            <div>
              <label className="block text-sm text-white/80 mb-1">Lead Name</label>
              <Input
                placeholder="e.g., Rahul Sharma"
                value={form.lead_name}
                onChange={(e) => setForm({ ...form, lead_name: e.target.value })}
                className="bg-transparent text-white/95 placeholder:text-white/60 border border-white/15"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">Email</label>
              <Input
                placeholder="name@company.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-transparent text-white/95 placeholder:text-white/60 border border-white/15"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">Phone</label>
              <CountryPhoneRow
                phone_country={form.phone_country}
                phone_national={form.phone_national}
                onChangeCountry={(iso2) => setForm({ ...form, phone_country: iso2 })}
                onChangeNational={(v) => setForm({ ...form, phone_national: v })}
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">Source</label>
              <SourceSelect value={form.source} onChange={(v) => setForm({ ...form, source: v })} options={SOURCE_OPTIONS} />
            </div>

            {companyChoices.length > 0 && (
              <div>
                <label className="block text-sm text-white/80 mb-1">Company</label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={form.company_id ?? ""}
                  onChange={(e) => setForm({ ...form, company_id: e.target.value || null })}
                >
                  <option value="" disabled>
                    Select company
                  </option>
                  {companyChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} (${c.id.slice(0, 8)}…)` : c.id}
                    </option>
                  ))}
                </select>
                <div className="text-xs opacity-70 mt-1">Pick a company and hit Save again.</div>
              </div>
            )}

            <div className="pt-2 flex gap-3 items-center">
              <Button
                ref={saveBtnRef}
                onClick={submit}
                disabled={loading || !form.lead_name.trim()}
                aria-busy={loading}
                className={`
                  flex-1 rounded-lg px-3 py-2 text-sm font-semibold
                  bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 text-black
                  hover:from-cyan-300 hover:to-violet-400
                  shadow-[0_0_25px_rgba(120,80,255,0.3)]
                  transition-all duration-300
                  ${loading ? "cursor-wait" : ""}
                `}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
                      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>

              <Button onClick={onClose} className="rounded-lg px-3 py-2 text-sm border border-white/15 text-white/80 hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </div>

          <div style={{ height: 28 }} />
        </aside>
      </div>
    </div>,
    mountNode,
  );
}
