// app/hms/admin/SettingsForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/**
 * HmsSettingsForm
 * - GET /api/hms/settings  -> expects a JSON map of keys (billing.currency, billing.taxes, ...)
 * - POST /api/hms/settings -> accepts { key: string, value: any } and requires admin auth
 *
 * Place at: app/hms/admin/SettingsForm.tsx
 */

/* -------------------------
   Validation schemas
   ------------------------- */
const TaxLineSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  rate: z.number().min(0, "Rate must be >= 0"),
  isCompound: z.boolean().optional(),
});
type TaxLine = z.infer<typeof TaxLineSchema>;

const CurrencySchema = z.object({
  code: z.string().min(3).max(3), // ISO 4217
  symbol: z.string().min(1).max(4).optional(),
  locale: z.string().min(2).optional(),
});
type Currency = z.infer<typeof CurrencySchema>;

/* -------------------------
   Defaults
   ------------------------- */
const DEFAULT_CURRENCY: Currency = { code: "INR", symbol: "₹", locale: "en-IN" };
const DEFAULT_TAXES: TaxLine[] = [{ id: "gst", name: "GST", rate: 18, isCompound: false }];

/* -------------------------
   UI Component
   ------------------------- */
export default function HmsSettingsForm() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [taxes, setTaxes] = useState<TaxLine[]>(DEFAULT_TAXES);

  /* helper to set error safely as string | null */
  const setErrorSafe = (maybe: unknown) => {
    const msg = typeof maybe === "string" ? maybe : (maybe && (maybe as any).message ? (maybe as any).message : undefined);
    setError(msg ?? null);
  };

  /* load settings on mount */
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/hms/settings", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch settings (${res.status})`);
        const map = await res.json();
        if (ignore) return;
        const c = map["billing.currency"];
        const t = map["billing.taxes"];
        try {
          // safe parse with zod; fall back to defaults on invalid
          if (c) {
            const parsed = CurrencySchema.safeParse(c);
            if (parsed.success) setCurrency(parsed.data);
            else setCurrency(DEFAULT_CURRENCY);
          } else {
            setCurrency(DEFAULT_CURRENCY);
          }
          if (t && Array.isArray(t)) {
            const ok = t.every((x: any) => TaxLineSchema.safeParse(x).success);
            setTaxes(ok ? (t as TaxLine[]) : DEFAULT_TAXES);
          } else {
            setTaxes(DEFAULT_TAXES);
          }
        } catch {
          setCurrency(DEFAULT_CURRENCY);
          setTaxes(DEFAULT_TAXES);
        }
      } catch (err: any) {
        console.warn("[HmsSettingsForm] load error:", err);
        setErrorSafe("Failed to load settings. Try again later.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  /* helpers for editing tax lines */
  const addTaxLine = () => {
    setTaxes((s) => [...s, { id: `tax-${uuidv4().slice(0, 6)}`, name: "", rate: 0, isCompound: false }]);
  };
  const updateTaxLine = (index: number, patch: Partial<TaxLine>) => {
    setTaxes((s) => s.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };
  const removeTaxLine = (index: number) => {
    setTaxes((s) => s.filter((_, i) => i !== index));
  };

  /* validation before saving */
  const validateAll = (): { ok: true } | { ok: false; message: string } => {
    const c = CurrencySchema.safeParse(currency);
    if (!c.success) {
      return { ok: false, message: "Currency is invalid (code must be 3 letters)." };
    }
    if (!Array.isArray(taxes) || taxes.length === 0) {
      return { ok: false, message: "At least one tax line is required." };
    }
    for (const t of taxes) {
      const r = TaxLineSchema.safeParse(t);
      if (!r.success) {
        // safe access to the first Zod issue
        const issue = r.error.issues && r.error.issues.length ? r.error.issues[0] : undefined;
        const path = issue ? issue.path.join(".") : "tax";
        const msg = issue ? issue.message : "Invalid tax line";
        return { ok: false, message: `Tax line invalid: ${path} — ${msg}` };
      }
    }
    return { ok: true };
  };

  /* upsert helper */
  const upsertKey = async (key: string, value: any) => {
    const res = await fetch("/api/hms/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body && (body as any).error) || `Request failed (${res.status})`);
    }
    return await res.json();
  };

  /* save handler: saves currency and taxes sequentially (atomicity handled server-side) */
  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    const v = validateAll();
    if (!v.ok) {
      setError(v.message ?? "Validation failed. Please review the form.");
      return;
    }

    setSaving(true);
    try {
      // Save currency
      await upsertKey("billing.currency", currency);
      // Save taxes
      await upsertKey("billing.taxes", taxes);
      setSuccessMsg("Settings saved. Changes take effect immediately.");
      // prompt other parts of the app to refresh server components / fetch new values:
      // Next.js app router: router.refresh() will re-fetch server components
      router.refresh();
      // clear success after a bit
      window.setTimeout(() => setSuccessMsg(null), 3000);
      // clear any previous error
      setError(null);
    } catch (err: any) {
      console.error("[HmsSettingsForm] save error:", err);
      setErrorSafe((err as any)?.message ?? String(err) ?? "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white/90">Billing settings</h3>
          <p className="text-sm text-white/60 mt-1">Configure currency and tax rules for this tenant.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/40">{loading ? "Loading…" : saving ? "Saving…" : ""}</div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-md bg-red-800/40 border border-red-700 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {successMsg && (
        <div role="status" className="rounded-md bg-emerald-800/30 border border-emerald-700 p-3 text-sm text-emerald-100">
          {successMsg}
        </div>
      )}

      {/* Currency card */}
      <div className="bg-white/[0.02] border border-white/8 p-4 rounded-2xl">
        <h4 className="text-sm font-medium text-white/90 mb-2">Currency</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col">
            <span className="text-xs text-white/60 mb-1">ISO Code</span>
            <input
              className="rounded-md border border-white/6 bg-transparent p-2 text-white/90"
              value={currency.code}
              onChange={(e) => setCurrency((c) => ({ ...c, code: e.target.value.toUpperCase().slice(0, 3) }))}
              placeholder="INR"
              aria-label="Currency code (ISO 4217)"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-white/60 mb-1">Symbol</span>
            <input
              className="rounded-md border border-white/6 bg-transparent p-2 text-white/90"
              value={currency.symbol ?? ""}
              onChange={(e) => setCurrency((c) => ({ ...c, symbol: e.target.value }))}
              placeholder="₹"
              aria-label="Currency symbol"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-white/60 mb-1">Locale</span>
            <input
              className="rounded-md border border-white/6 bg-transparent p-2 text-white/90"
              value={currency.locale ?? ""}
              onChange={(e) => setCurrency((c) => ({ ...c, locale: e.target.value }))}
              placeholder="en-IN"
              aria-label="Locale (eg. en-IN)"
            />
          </label>
        </div>
      </div>

      {/* Taxes card */}
      <div className="bg-white/[0.02] border border-white/8 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white/90">Tax lines</h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addTaxLine}
              className="rounded-md bg-white/4 px-3 py-1 text-sm font-medium border border-white/6 hover:bg-white/6"
            >
              + Add tax
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {taxes.map((t, i) => (
            <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 md:col-span-4">
                <label className="text-xs text-white/60">ID</label>
                <input
                  value={t.id}
                  onChange={(e) => updateTaxLine(i, { id: e.target.value })}
                  className="w-full rounded-md border border-white/6 bg-transparent p-2 text-white/90"
                  aria-label={`Tax ${i + 1} id`}
                />
              </div>

              <div className="col-span-12 md:col-span-4">
                <label className="text-xs text-white/60">Name</label>
                <input
                  value={t.name}
                  onChange={(e) => updateTaxLine(i, { name: e.target.value })}
                  className="w-full rounded-md border border-white/6 bg-transparent p-2 text-white/90"
                  aria-label={`Tax ${i + 1} name`}
                />
              </div>

              <div className="col-span-8 md:col-span-3">
                <label className="text-xs text-white/60">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={String(t.rate ?? 0)}
                  onChange={(e) => updateTaxLine(i, { rate: Math.max(0, Number(e.target.value || 0)) })}
                  className="w-full rounded-md border border-white/6 bg-transparent p-2 text-white/90"
                  aria-label={`Tax ${i + 1} rate percent`}
                />
              </div>

              <div className="col-span-4 md:col-span-1 flex items-center gap-2">
                <label className="text-xs text-white/60">Compound</label>
                <input
                  type="checkbox"
                  checked={!!t.isCompound}
                  onChange={(e) => updateTaxLine(i, { isCompound: e.target.checked })}
                  className="h-4 w-4 rounded border-white/6 bg-transparent"
                  aria-label={`Tax ${i + 1} compound flag`}
                />
              </div>

              <div className="col-span-12 flex justify-end md:col-span-12">
                <button
                  type="button"
                  onClick={() => removeTaxLine(i)}
                  className="text-xs text-red-300 hover:text-red-100"
                  aria-label={`Remove tax ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {taxes.length === 0 && <div className="text-sm text-white/50 italic">No tax lines configured.</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-medium shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] transition ${
            canSave ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:brightness-105" : "bg-white/6 cursor-not-allowed opacity-60"
          }`}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>

        <button
          type="button"
          onClick={() => {
            // reset to last loaded values by reloading settings
            setLoading(true);
            setError(null);
            setSuccessMsg(null);
            (async () => {
              try {
                const res = await fetch("/api/hms/settings", { cache: "no-store" });
                if (!res.ok) throw new Error("Failed to reload");
                const map = await res.json();
                setCurrency(map["billing.currency"] ?? DEFAULT_CURRENCY);
                setTaxes(map["billing.taxes"] ?? DEFAULT_TAXES);
              } catch (err) {
                setErrorSafe("Failed to reload settings.");
              } finally {
                setLoading(false);
              }
            })();
          }}
          className="rounded-2xl px-3 py-2 text-sm bg-white/4 border border-white/6"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
