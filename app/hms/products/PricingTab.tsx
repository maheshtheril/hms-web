// app/hms/products/product-editor/PricingTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import apiClient from "@/lib/api-client";
import { Loader2, Tag, Repeat, DollarSign, Settings } from "lucide-react";
import type { ProductDraft, Tier, PriceRule, ProductPricing } from "./types";
import { useCompany } from "@/app/providers/CompanyProvider";

type LocalTier = Tier;
type LocalRule = PriceRule;

interface Defaults {
  currency?: string;
}

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
  defaults?: Defaults;
}

const DEFAULT_CURRENCIES = ["USD", "EUR", "INR", "GBP", "AUD"];

export default function PricingTab({ draft, onChange, defaults }: Props) {
  const toast = useToast();
  const { company } = useCompany();

  const companyCurrency = (company as any)?.settings?.default_currency ?? defaults?.currency;
  const initialCurrency = companyCurrency ?? "USD";

  const [loading, setLoading] = useState<boolean>(false);

  // normalize incoming pricing (avoid nulls)
  const pricing: ProductPricing = {
    base_price: draft?.pricing?.base_price ?? draft?.price ?? undefined,
    currency: draft?.pricing?.currency ?? draft?.currency ?? initialCurrency,
    tiers: draft?.pricing?.tiers ?? [],
    tax_percent: draft?.pricing?.tax_percent ?? draft?.metadata?.tax?.percent ?? 0,
    rules: draft?.pricing?.rules ?? [],
  };

  // local editable state (strings avoided where numeric is expected)
  const [basePrice, setBasePrice] = useState<number | "">(pricing.base_price ?? "");
  const [currency, setCurrency] = useState<string>(pricing.currency ?? initialCurrency);
  const [taxPercent, setTaxPercent] = useState<number | "">(pricing.tax_percent ?? 0);
  const [tiers, setTiers] = useState<LocalTier[]>(pricing.tiers ?? []);
  const [rules, setRules] = useState<LocalRule[]>(pricing.rules ?? []);

  const [editingTierIndex, setEditingTierIndex] = useState<number | null>(null);
  const [tierMinQty, setTierMinQty] = useState<number>(1);
  const [tierPrice, setTierPrice] = useState<number | "">(0);

  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleName, setRuleName] = useState<string>("");
  const [ruleCond, setRuleCond] = useState<string>("");
  const [ruleEffect, setRuleEffect] = useState<string>("");

  // margin calculator input
  const [costPrice, setCostPrice] = useState<number | "">("");

  // Keep local state in sync when draft/pricing changes
  useEffect(() => {
    setBasePrice(pricing.base_price ?? "");
    setCurrency(pricing.currency ?? initialCurrency);
    setTaxPercent(pricing.tax_percent ?? 0);
    setTiers(pricing.tiers ?? []);
    setRules(pricing.rules ?? []);
    setEditingTierIndex(null);
    setEditingRuleIndex(null);
  }, [draft?.pricing, draft?.price, initialCurrency]);

  // helpers
  function normalizeNumberInput(value: any): number | undefined {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  const effectivePrice = useMemo(() => {
    const bp = typeof basePrice === "number" ? basePrice : Number(basePrice || 0);
    const tax = typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0);
    const withTax = bp + bp * ((tax || 0) / 100);
    return Number.isFinite(withTax) ? withTax : 0;
  }, [basePrice, taxPercent]);

  const currencyFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency });
    } catch {
      return { format: (v: number) => `${v.toFixed(2)} ${currency}` } as any;
    }
  }, [currency]);

  // Tier helpers
  function addOrUpdateTier() {
    const qty = Number(tierMinQty || 0);
    const p = typeof tierPrice === "number" ? tierPrice : Number(tierPrice || 0);
    if (!qty || qty < 1) return toast.error("Provide valid minimum quantity");
    if (!Number.isFinite(p) || p < 0) return toast.error("Provide valid tier price");
    const next: LocalTier[] = [...tiers];
    if (editingTierIndex === null) {
      next.push({ id: `local-${Date.now()}`, min_qty: qty, price: p, currency });
      toast.success("Tier added");
    } else {
      next[editingTierIndex] = { ...(next[editingTierIndex] ?? {}), min_qty: qty, price: p, currency };
      toast.success("Tier updated");
    }
    setTiers(next.sort((a, b) => a.min_qty - b.min_qty));
    setEditingTierIndex(null);
    setTierMinQty(1);
    setTierPrice(0);
  }

  function editTier(i: number) {
    const t = tiers[i];
    if (!t) return;
    setEditingTierIndex(i);
    setTierMinQty(t.min_qty);
    setTierPrice(t.price ?? 0);
  }

  function removeTier(i: number) {
    const next = tiers.filter((_, idx) => idx !== i);
    setTiers(next);
    toast.info("Tier removed");
  }

  // Rule helpers
  function addOrUpdateRule() {
    if (!ruleName.trim()) return toast.error("Rule name required");
    const r: LocalRule = { id: `local-${Date.now()}`, name: ruleName.trim(), active: true, condition: ruleCond, effect: ruleEffect };
    const next = [...rules];
    if (editingRuleIndex === null) {
      next.push(r);
      toast.success("Rule added");
    } else {
      next[editingRuleIndex] = { ...next[editingRuleIndex], name: r.name, condition: r.condition, effect: r.effect };
      toast.success("Rule updated");
    }
    setRules(next);
    setEditingRuleIndex(null);
    setRuleName(""); setRuleCond(""); setRuleEffect("");
  }

  function editRule(i: number) {
    const r = rules[i];
    if (!r) return;
    setEditingRuleIndex(i);
    setRuleName(r.name); setRuleCond(r.condition ?? ""); setRuleEffect(r.effect ?? "");
  }

  function removeRule(i: number) {
    const next = rules.filter((_, idx) => idx !== i);
    setRules(next);
    toast.info("Rule removed");
  }

  // Apply local pricing into parent draft
  function applyPricingToDraft() {
    const applied: ProductPricing = {
      base_price: typeof basePrice === "number" ? basePrice : Number(basePrice || 0),
      currency,
      tax_percent: typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0),
      tiers,
      rules,
    };
    onChange({
      pricing: applied,
      price: applied.base_price,
      currency,
    });
    toast.success("Pricing applied to draft");
  }

  // Persist to server (if product saved)
  async function persistPricing() {
    if (!draft?.id) return toast.error("Save product first to persist pricing");

    // client-side validation
    if (tiers.some(t => (t.min_qty ?? 0) < 1)) return toast.error("Tier min qty must be >= 1");
    if (!Number.isFinite(Number(basePrice || 0)) || Number(basePrice || 0) < 0) return toast.error("Base price must be a positive number");

    setLoading(true);
    try {
      const body = {
        pricing: {
          base_price: typeof basePrice === "number" ? basePrice : Number(basePrice || 0),
          currency,
          tax_percent: typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0),
          tiers,
          rules,
        },
      };
      // PATCH /hms/products/:id/pricing (server should accept this)
      const res = await apiClient.patch(`/hms/products/${encodeURIComponent(draft.id)}/pricing`, body);
      const saved = res.data?.pricing ?? res.data?.data?.pricing;
      if (saved) {
        // reconcile server-returned tiers/rules (replace local with canonical)
        setTiers(saved.tiers ?? []);
        setRules(saved.rules ?? []);
        onChange({ pricing: saved, price: saved.base_price ?? body.pricing.base_price, currency: saved.currency ?? currency });
        toast.success("Pricing persisted");
      } else {
        // fallback: persist locally into draft
        onChange({ pricing: body.pricing, price: body.pricing.base_price, currency: body.pricing.currency });
        toast.success("Pricing applied locally (server returned no pricing payload)");
      }
    } catch (err: any) {
      console.error("persistPricing", err);
      if (err?.response?.data?.errors) {
        // map server validation errors if present
        const first = err.response.data.errors[0];
        toast.error(first?.message ?? "Persist failed");
      } else {
        toast.error(err?.message ?? "Persist failed");
      }
    } finally {
      setLoading(false);
    }
  }

  // Compute a sample price for a given quantity factoring in tiers and tax
  function computePriceForQty(qty: number) {
    const applicable = [...tiers].sort((a, b) => b.min_qty - a.min_qty).find(t => qty >= t.min_qty);
    const raw = (applicable ? applicable.price : (typeof basePrice === "number" ? basePrice : Number(basePrice || 0)));
    const tax = raw * ((typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0)) / 100 || 0);
    return { raw, withTax: raw + tax, currency };
  }

  // margin suggested price (simple)
  const suggestedPriceFromMargin = useMemo(() => {
    const cost = typeof costPrice === "number" ? costPrice : Number(costPrice || 0);
    if (!Number.isFinite(cost) || cost <= 0) return null;
    // default target margin 30% as example
    const margin = 0.30;
    const suggested = cost / (1 - margin);
    return { suggested, margin: margin * 100 };
  }, [costPrice]);

  return (
    <div className="p-4">
      <style>{`
        :root {
          --ng-surface: rgba(255,255,255,0.92);
          --ng-border: rgba(15,23,42,0.06);
          --ng-muted: rgba(15,23,42,0.45);
          --ng-accent-from: #2563eb;
          --ng-accent-to: #7c3aed;
        }
      `}</style>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm" style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Pricing</h4>
            </div>

            <div className="mt-3 space-y-3">
              <label className="text-xs text-slate-600">Base price</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.01"
                  value={basePrice as any}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBasePrice(v === "" ? "" : Number(v));
                  }}
                  className="flex-1 rounded-2xl px-3 py-2 border outline-none"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Base price"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-2xl px-3 py-2 border"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Currency"
                >
                  {[...new Set([...(companyCurrency ? [companyCurrency] : []), ...DEFAULT_CURRENCIES])].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600">Tax %</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxPercent as any}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTaxPercent(v === "" ? "" : Number(v));
                  }}
                  className="w-28 rounded-2xl px-3 py-2 border outline-none"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Tax percent"
                />
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Effective price (incl. tax): <strong>{currencyFormatter.format(effectivePrice)}</strong>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={applyPricingToDraft}
                  className="px-3 py-2 rounded-2xl inline-flex items-center gap-2"
                  style={{ backgroundImage: "linear-gradient(to bottom right, var(--ng-accent-from), var(--ng-accent-to))", color: "white" }}
                  aria-label="Apply pricing to draft"
                >
                  <Repeat className="w-4 h-4" /> Apply
                </button>
                <button
                  onClick={persistPricing}
                  className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2"
                  disabled={loading || !draft?.id}
                  aria-label="Persist pricing to server"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />} Persist
                </button>
              </div>
            </div>
          </div>

          {/* tiers */}
          <div className="mt-4 rounded-2xl bg-white/30 border p-3" style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}>
            <div className="text-sm font-medium">Tiered pricing</div>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={tierMinQty}
                  onChange={(e) => setTierMinQty(Number(e.target.value || 0))}
                  className="w-24 rounded-2xl px-3 py-2 border"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Tier minimum quantity"
                />
                <input
                  type="number"
                  step="0.01"
                  value={tierPrice as any}
                  onChange={(e) => setTierPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="flex-1 rounded-2xl px-3 py-2 border"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Tier price"
                />
                <button onClick={addOrUpdateTier} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white" aria-label="Add or update tier">
                  {editingTierIndex === null ? "Add" : "Update"}
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {(tiers ?? []).length === 0 && <div className="text-xs text-slate-500">No tiers configured.</div>}
                {(tiers ?? []).map((t, i) => (
                  <div key={t.id ?? `t-${i}`} className="flex items-center justify-between gap-2 p-2 rounded-md" style={{ background: "rgba(255,255,255,0.6)" }}>
                    <div>
                      <div className="text-sm font-medium">{t.min_qty}+ @ {Number(t.price).toFixed(2)} {t.currency ?? currency}</div>
                      { (t as any).note && <div className="text-xs text-slate-500">{(t as any).note}</div> }
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editTier(i)} className="px-2 py-1 rounded-md border text-sm" aria-label={`Edit tier ${i+1}`}>Edit</button>
                      <button onClick={() => removeTier(i)} className="px-2 py-1 rounded-md border text-sm" aria-label={`Remove tier ${i+1}`}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* rules */}
          <div className="mt-4 rounded-2xl bg-white/30 border p-3" style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}>
            <div className="text-sm font-medium">Price rules</div>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Rule name"
                  className="flex-1 rounded-2xl px-3 py-2 border"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Rule name"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={ruleCond}
                  onChange={(e) => setRuleCond(e.target.value)}
                  placeholder="Condition (human-readable or small DSL)"
                  className="flex-1 rounded-2xl px-3 py-2 border"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Rule condition"
                />
                <input
                  value={ruleEffect}
                  onChange={(e) => setRuleEffect(e.target.value)}
                  placeholder="Effect (e.g. -10%)"
                  className="w-48 rounded-2xl px-3 py-2 border"
                  style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                  aria-label="Rule effect"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={addOrUpdateRule} className="px-3 py-2 rounded-2xl bg-sky-600 text-white" aria-label="Add or update rule">{editingRuleIndex === null ? "Add rule" : "Update"}</button>
                <button onClick={() => { setRuleName(""); setRuleCond(""); setRuleEffect(""); setEditingRuleIndex(null); }} className="px-3 py-2 rounded-2xl border" aria-label="Clear rule">Clear</button>
              </div>

              <div className="mt-3 space-y-2">
                {(rules ?? []).length === 0 && <div className="text-xs text-slate-500">No rules defined.</div>}
                {(rules ?? []).map((r, i) => (
                  <div key={r.id ?? `r-${i}`} className="flex items-center justify-between gap-2 p-2 rounded-md" style={{ background: "rgba(255,255,255,0.6)" }}>
                    <div>
                      <div className="text-sm font-medium">{r.name} {r.active ? null : <span className="text-xs text-rose-600"> (inactive)</span>}</div>
                      <div className="text-xs text-slate-500">{r.condition}</div>
                      <div className="text-xs text-slate-500">{r.effect}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editRule(i)} className="px-2 py-1 rounded-md border text-sm" aria-label={`Edit rule ${i+1}`}>Edit</button>
                      <button onClick={() => removeRule(i)} className="px-2 py-1 rounded-md border text-sm" aria-label={`Remove rule ${i+1}`}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-7">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm" style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                <h4 className="text-sm font-semibold">Pricing preview</h4>
              </div>

              <div className="text-xs text-slate-500">Sample pricing scenarios</div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500">Qty</div>
                {[1, 5, 10, 25, 100].map((q) => {
                  const p = computePriceForQty(q);
                  return (
                    <div key={q} className="p-3 rounded-md" style={{ background: "rgba(255,255,255,0.6)", textAlign: "center" }}>
                      <div className="text-sm font-semibold">{q}x</div>
                      <div className="text-xs text-slate-500">{currencyFormatter.format(p.withTax)}</div>
                      <div className="text-xs text-slate-400">({currencyFormatter.format(p.raw)} + tax)</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500">Margin calculator</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Cost price</div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={costPrice as any}
                      onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl px-3 py-2 border"
                      style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}
                      aria-label="Cost price"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Suggested margin</div>
                    <div className="rounded-2xl p-3" style={{ background: "var(--ng-surface)" }}>
                      {suggestedPriceFromMargin ? (
                        <div>
                          <div className="text-sm font-medium">{currencyFormatter.format(suggestedPriceFromMargin.suggested)}</div>
                          <div className="text-xs text-slate-500">Assumes {suggestedPriceFromMargin.margin}% margin</div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">Enter cost to see suggestion</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Tip: Use tiers for volume discounts and rules for customer-specific pricing. Persist pricing to make it active across your sales channels.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3" style={{ background: "var(--ng-surface)", borderColor: "var(--ng-border)" }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Actions</div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setTiers([]); setRules([]); toast.info("Cleared local pricing"); }}
                  className="px-3 py-2 rounded-2xl border"
                  aria-label="Clear local pricing"
                >
                  Clear
                </button>
                <button onClick={applyPricingToDraft} className="px-3 py-2 rounded-2xl bg-blue-600 text-white" aria-label="Apply to draft">Apply to draft</button>
                <button onClick={persistPricing} className="px-3 py-2 rounded-2xl bg-indigo-600 text-white" disabled={!draft?.id || loading} aria-label="Persist to server">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Persist to server"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
