// app/hms/products/product-editor/PricingTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import apiClient from "@/lib/api-client";
import { Loader2, Percent, Tag, Repeat, DollarSign, Settings } from "lucide-react";

type Tier = {
  id?: string;
  min_qty: number;
  price: number;
  currency?: string;
  note?: string;
};

type PriceRule = {
  id?: string;
  name: string;
  active: boolean;
  condition?: string; // small DSL or description
  effect?: string; // description e.g. "-10% for B2B"
};

type ProductDraft = {
  id?: string;
  name?: string;
  sku?: string;
  price?: number | null;
  currency?: string | null;
  variants?: Array<any> | null;
  pricing?: {
    base_price?: number | null;
    currency?: string | null;
    tiers?: Tier[];
    tax_percent?: number | null;
    rules?: PriceRule[];
  } | null;
  metadata?: Record<string, any> | null;
};

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}

const DEFAULT_CURRENCIES = ["USD", "EUR", "INR", "GBP", "AUD"];

export default function PricingTab({ draft, onChange }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(false);

  // Local editing state for tiers & rules
  const pricing = draft.pricing ?? { base_price: draft.price ?? null, currency: draft.currency ?? "USD", tiers: [], tax_percent: 0, rules: [] };

  const [basePrice, setBasePrice] = useState<number | "">(pricing.base_price ?? "");
  const [currency, setCurrency] = useState<string>(pricing.currency ?? "USD");
  const [taxPercent, setTaxPercent] = useState<number | "">(pricing.tax_percent ?? 0);
  const [tiers, setTiers] = useState<Tier[]>(pricing.tiers ?? []);
  const [rules, setRules] = useState<PriceRule[]>(pricing.rules ?? []);

  // selected tier for quick edit
  const [editingTierIndex, setEditingTierIndex] = useState<number | null>(null);
  const [tierMinQty, setTierMinQty] = useState<number>(1);
  const [tierPrice, setTierPrice] = useState<number | "">(0);

  // selected rule edit
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleName, setRuleName] = useState<string>("");
  const [ruleCond, setRuleCond] = useState<string>("");
  const [ruleEffect, setRuleEffect] = useState<string>("");

  // Keep local state in sync when draft changes (loading, or new product)
  useEffect(() => {
    setBasePrice(pricing.base_price ?? "");
    setCurrency(pricing.currency ?? "USD");
    setTaxPercent(pricing.tax_percent ?? 0);
    setTiers(pricing.tiers ?? []);
    setRules(pricing.rules ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  // Derived helper: effective price preview (base + tax)
  const effectivePrice = useMemo(() => {
    const bp = typeof basePrice === "number" ? basePrice : Number(basePrice || 0);
    const tax = typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0);
    const withTax = bp + (bp * (tax / 100 || 0));
    return Number.isFinite(withTax) ? withTax : 0;
  }, [basePrice, taxPercent]);

  // Tier helpers
  function addOrUpdateTier() {
    const qty = Number(tierMinQty || 0);
    const p = Number(tierPrice || 0);
    if (!qty || qty < 1) return toast.error("Provide valid minimum quantity");
    if (!p || p < 0) return toast.error("Provide valid tier price");
    const next: Tier[] = [...tiers];
    if (editingTierIndex === null) {
      next.push({ id: `local-${Date.now()}`, min_qty: qty, price: p, currency });
      toast.success("Tier added");
    } else {
      next[editingTierIndex] = { ...(next[editingTierIndex] ?? {}), min_qty: qty, price: p, currency };
      toast.success("Tier updated");
    }
    setTiers(next.sort((a,b)=>a.min_qty-b.min_qty));
    setEditingTierIndex(null);
    setTierMinQty(1);
    setTierPrice(0);
  }

  function editTier(i: number) {
    const t = tiers[i];
    if (!t) return;
    setEditingTierIndex(i);
    setTierMinQty(t.min_qty);
    setTierPrice(t.price);
  }

  function removeTier(i: number) {
    const next = tiers.filter((_, idx) => idx !== i);
    setTiers(next);
    toast.info("Tier removed");
  }

  // Rule helpers
  function addOrUpdateRule() {
    if (!ruleName.trim()) return toast.error("Rule name required");
    const r: PriceRule = { id: `local-${Date.now()}`, name: ruleName.trim(), active: true, condition: ruleCond, effect: ruleEffect };
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
    onChange({
      pricing: {
        base_price: typeof basePrice === "number" ? basePrice : Number(basePrice || 0),
        currency,
        tax_percent: typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0),
        tiers,
        rules,
      },
      price: typeof basePrice === "number" ? basePrice : Number(basePrice || 0),
      currency,
    });
    toast.success("Pricing applied to draft");
  }

  // Persist to server (if product saved)
  async function persistPricing() {
    if (!draft?.id) return toast.error("Save product first to persist pricing");
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
      // API: PATCH /hms/products/:id/pricing
      const res = await apiClient.patch(`/hms/products/${encodeURIComponent(draft.id)}/pricing`, body);
      const saved = res.data?.pricing ?? res.data?.data?.pricing;
      if (saved) {
        onChange({ pricing: saved, price: saved.base_price ?? body.pricing.base_price, currency: saved.currency ?? currency });
      } else {
        onChange({ pricing: body.pricing, price: body.pricing.base_price, currency: body.pricing.currency });
      }
      toast.success("Pricing persisted");
    } catch (err: any) {
      console.error("persistPricing", err);
      toast.error(err?.message ?? "Persist failed");
    } finally {
      setLoading(false);
    }
  }

  // Compute a sample price for a given quantity factoring in tiers and tax
  function computePriceForQty(qty: number) {
    // find highest applicable tier with min_qty <= qty
    const applicable = [...tiers].sort((a,b)=>b.min_qty-a.min_qty).find(t => qty >= t.min_qty);
    const raw = (applicable ? applicable.price : (typeof basePrice === "number" ? basePrice : Number(basePrice || 0)));
    const tax = raw * ((typeof taxPercent === "number" ? taxPercent : Number(taxPercent || 0))/100 || 0);
    return { raw, withTax: raw + tax, currency };
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Pricing</h4>
            </div>

            <div className="mt-3 space-y-3">
              <label className="text-xs text-slate-600">Base price</label>
              <div className="flex gap-2 items-center">
                <input type="number" step="0.01" value={basePrice as any} onChange={(e) => setBasePrice(e.target.value === "" ? "" : Number(e.target.value))} className="flex-1 rounded-2xl px-3 py-2 border bg-white/60 outline-none" />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-2xl px-3 py-2 border bg-white/60">
                  {DEFAULT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600">Tax %</label>
                <input type="number" step="0.01" value={taxPercent as any} onChange={(e) => setTaxPercent(e.target.value === "" ? "" : Number(e.target.value))} className="w-28 rounded-2xl px-3 py-2 border bg-white/60" />
              </div>

              <div className="mt-2 text-sm text-slate-700">Effective price (incl. tax): <strong>{effectivePrice.toFixed(2)} {currency}</strong></div>

              <div className="mt-4 flex gap-2">
                <button onClick={applyPricingToDraft} className="px-3 py-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center gap-2">
                  <Repeat className="w-4 h-4" /> Apply
                </button>
                <button onClick={persistPricing} className="px-3 py-2 rounded-2xl border inline-flex items-center gap-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />} Persist
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <div className="text-sm font-medium">Tiered pricing</div>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input type="number" min={1} value={tierMinQty} onChange={(e) => setTierMinQty(Number(e.target.value||0))} className="w-24 rounded-2xl px-3 py-2 border bg-white/60" />
                <input type="number" step="0.01" value={tierPrice as any} onChange={(e) => setTierPrice(e.target.value === "" ? "" : Number(e.target.value))} className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
                <button onClick={addOrUpdateTier} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white">{editingTierIndex === null ? "Add" : "Update"}</button>
              </div>

              <div className="mt-2 space-y-2">
                {(tiers ?? []).length === 0 && <div className="text-xs text-slate-500">No tiers configured.</div>}
                {(tiers ?? []).map((t, i) => (
                  <div key={t.id ?? `t-${i}`} className="flex items-center justify-between gap-2 p-2 rounded-md bg-white/60">
                    <div>
                      <div className="text-sm font-medium">{t.min_qty}+ @ {t.price.toFixed(2)} {t.currency ?? currency}</div>
                      {t.note && <div className="text-xs text-slate-500">{t.note}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editTier(i)} className="px-2 py-1 rounded-md border text-sm">Edit</button>
                      <button onClick={() => removeTier(i)} className="px-2 py-1 rounded-md border text-sm">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <div className="text-sm font-medium">Price rules</div>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input value={ruleName} onChange={(e)=>setRuleName(e.target.value)} placeholder="Rule name" className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
              </div>
              <div className="mt-2 flex gap-2">
                <input value={ruleCond} onChange={(e)=>setRuleCond(e.target.value)} placeholder="Condition (human-readable or small DSL)" className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
                <input value={ruleEffect} onChange={(e)=>setRuleEffect(e.target.value)} placeholder="Effect (e.g. -10%)" className="w-48 rounded-2xl px-3 py-2 border bg-white/60" />
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={addOrUpdateRule} className="px-3 py-2 rounded-2xl bg-sky-600 text-white">{editingRuleIndex===null ? "Add rule" : "Update"}</button>
                <button onClick={() => { setRuleName(""); setRuleCond(""); setRuleEffect(""); setEditingRuleIndex(null); }} className="px-3 py-2 rounded-2xl border">Clear</button>
              </div>

              <div className="mt-3 space-y-2">
                {(rules ?? []).length === 0 && <div className="text-xs text-slate-500">No rules defined.</div>}
                {(rules ?? []).map((r, i) => (
                  <div key={r.id ?? `r-${i}`} className="flex items-center justify-between gap-2 p-2 rounded-md bg-white/60">
                    <div>
                      <div className="text-sm font-medium">{r.name} {r.active ? null : <span className="text-xs text-rose-600"> (inactive)</span>}</div>
                      <div className="text-xs text-slate-500">{r.condition}</div>
                      <div className="text-xs text-slate-500">{r.effect}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>editRule(i)} className="px-2 py-1 rounded-md border text-sm">Edit</button>
                      <button onClick={()=>removeRule(i)} className="px-2 py-1 rounded-md border text-sm">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        <div className="col-span-7">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
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
                {[1,5,10,25,100].map((q) => {
                  const p = computePriceForQty(q);
                  return (
                    <div key={q} className="p-3 rounded-md bg-white/60 text-center">
                      <div className="text-sm font-semibold">{q}x</div>
                      <div className="text-xs text-slate-500">{p.withTax.toFixed(2)} {p.currency}</div>
                      <div className="text-xs text-slate-400">({p.raw.toFixed(2)} + tax)</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500">Margin calculator</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500">Cost price</div>
                    <input type="number" step="0.01" placeholder="0.00" className="w-full rounded-2xl px-3 py-2 border bg-white/60" onChange={(e)=>{/* no-op, local calculator only */}} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Suggested margin</div>
                    <div className="rounded-2xl p-3 bg-white/60 text-sm">Set target margin to see suggested price — coming soon</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Tip: Use tiers for volume discounts and rules for customer-specific pricing. Persist pricing to make it active across your sales channels.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Actions</div>
              <div className="flex gap-2">
                <button onClick={() => { setTiers([]); setRules([]); toast.info("Cleared local pricing"); }} className="px-3 py-2 rounded-2xl border">Clear</button>
                <button onClick={applyPricingToDraft} className="px-3 py-2 rounded-2xl bg-blue-600 text-white">Apply to draft</button>
                <button onClick={persistPricing} className="px-3 py-2 rounded-2xl bg-indigo-600 text-white">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Persist to server"}</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
