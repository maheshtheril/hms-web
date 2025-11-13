// app/hms/products/product-editor/VariantsTab.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import apiClient from "@/lib/api-client";
import { Plus, Trash2, Layers, Zap, RefreshCw } from "lucide-react";
import type { ProductDraft, Variant, ProductAttribute } from "./types";

/**
 * Utilities
 */
function cartesian<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [];
  return arrays.reduce<T[][]>((acc, curr) => {
    if (acc.length === 0) return curr.map((v) => [v]);
    const out: T[][] = [];
    for (const a of acc) for (const b of curr) out.push([...a, b]);
    return out;
  }, []);
}

function slugify(s: string) {
  return (s || "")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

interface Props {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}

export default function VariantsTab({ draft, onChange }: Props) {
  const toast = useToast();
  const [localAttrName, setLocalAttrName] = useState<string>("");
  const [localAttrValue, setLocalAttrValue] = useState<string>("");
  const [selectedAttrIndex, setSelectedAttrIndex] = useState<number | null>(null);
  const [skuPattern, setSkuPattern] = useState<string>("[PARENT]-{ATTRS}-{RAND}");
  const [generating, setGenerating] = useState<boolean>(false);

  // ensure attributes array
  const attributes: ProductAttribute[] = draft?.attributes ?? [];

  useEffect(() => {
    // init empty attributes if product is expected to support variants
    if (!draft.attributes) {
      onChange({ attributes: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helpers
  const previewVariantCount = useMemo(() => {
    if (!attributes.length) return 0;
    const arr = attributes.map((a) => (a.values && a.values.length > 0 ? a.values : [""]));
    const product = cartesian(arr);
    return product.length;
  }, [attributes]);

  // Add attribute
  function addAttribute() {
    const name = localAttrName.trim();
    if (!name) return toast.error("Attribute name required");
    if (attributes.find((a) => a.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Attribute already exists");
    }
    const next = [...attributes, { name, values: [] }];
    onChange({ attributes: next });
    setLocalAttrName("");
    toast.success("Attribute added");
  }

  // Add attribute value
  function addAttributeValue(index: number) {
    const val = localAttrValue.trim();
    if (!val) return toast.error("Value required");
    const attr = attributes[index];
    if (!attr) return;
    if ((attr.values ?? []).includes(val)) return toast.error("Value already exists");
    const next = attributes.map((a, i) => (i === index ? { ...a, values: [...(a.values ?? []), val] } : a));
    onChange({ attributes: next });
    setLocalAttrValue("");
    toast.success("Value added");
  }

  // Remove attribute value
  function removeAttributeValue(attrIndex: number, valueIndex: number) {
    const attr = attributes[attrIndex];
    if (!attr) return;
    const nextVals = (attr.values ?? []).filter((_, i) => i !== valueIndex);
    const next = attributes.map((a, i) => (i === attrIndex ? { ...a, values: nextVals } : a));
    onChange({ attributes: next });
  }

  // Remove attribute completely
  function removeAttribute(attrIndex: number) {
    const next = attributes.filter((_, i) => i !== attrIndex);
    onChange({ attributes: next });
    toast.info("Attribute removed");
  }

  // Generate variants from attributes (cartesian product)
  async function generateVariants() {
    if (!attributes || attributes.length === 0) return toast.error("Add attributes first");
    const valueArrays = attributes.map((a) =>
      a.values && a.values.length > 0 ? a.values.map((v) => ({ attr: a.name, val: v })) : [{ attr: a.name, val: "" }]
    );
    const combos = cartesian(valueArrays);
    const variants: Variant[] = combos.map((combo) => {
      const attrs: Record<string, string> = {};
      combo.forEach((c: any) => {
        attrs[c.attr] = c.val;
      });
      // SKU generation using pattern
      const parent = slugify(draft.name ?? draft.sku ?? "PRD");
      const attrsSlug = Object.entries(attrs)
        .map(([k, v]) => `${slugify(k)}_${slugify(v)}`)
        .join("-");
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const rawSku = skuPattern
        .replace(/\[PARENT\]/g, parent)
        .replace(/\{ATTRS\}/g, attrsSlug || "STD")
        .replace(/\{RAND\}/g, rand);
      return {
        sku: rawSku,
        attributes: attrs,
        price: null,
        active: true,
        inventory: { on_hand: 0 },
      } as Variant;
    });

    // If product not saved yet, keep variants in draft
    if (!draft?.id) {
      onChange({ variants });
      toast.success(`Local: ${variants.length} variants generated`);
      return;
    }

    // If saved product, call backend endpoint to persist
    setGenerating(true);
    try {
      // POST /hms/products/:id/variants/generate { variants }
      const res = await apiClient.post(`/hms/products/${encodeURIComponent(draft.id)}/variants/generate`, { variants });
      const savedVariants = res.data?.variants ?? res.data?.data?.variants ?? variants;
      onChange({ variants: savedVariants });
      toast.success(`${savedVariants.length} variants generated`);
    } catch (err: any) {
      console.error("generateVariants", err);
      toast.error(err?.message ?? "Variant generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // Quick update single variant field locally or by API
  async function updateVariantField(index: number, patch: Partial<Variant>) {
    const vs = draft.variants ?? [];
    // local
    if (!draft?.id) {
      const next = vs.map((v, i) => (i === index ? { ...v, ...patch } : v));
      onChange({ variants: next });
      return;
    }

    // server update
    try {
      const variant = vs[index];
      if (!variant?.id) {
        // fallback: patch locally
        const next = vs.map((v, i) => (i === index ? { ...v, ...patch } : v));
        onChange({ variants: next });
        return;
      }
      // PATCH /hms/products/:id/variants/:variantId
      const res = await apiClient.patch(
        `/hms/products/${encodeURIComponent(draft.id)}/variants/${encodeURIComponent(variant.id)}`,
        patch
      );
      const updated = res.data?.variant ?? res.data?.data?.variant ?? { ...variant, ...patch };
      const next = vs.map((v, i) => (i === index ? updated : v));
      onChange({ variants: next });
      toast.success("Variant updated");
    } catch (err: any) {
      console.error("updateVariantField", err);
      toast.error(err?.message ?? "Update failed");
    }
  }

  // Remove variant (local or server)
  async function removeVariant(index: number) {
    const vs = draft.variants ?? [];
    const variant = vs[index];
    if (!variant) return;
    if (!draft?.id || !variant.id) {
      const next = vs.filter((_, i) => i !== index);
      onChange({ variants: next });
      toast.info("Variant removed locally");
      return;
    }
    try {
      // DELETE /hms/products/:id/variants/:variantId
      await apiClient.delete(`/hms/products/${encodeURIComponent(draft.id)}/variants/${encodeURIComponent(variant.id)}`);
      const next = vs.filter((_, i) => i !== index);
      onChange({ variants: next });
      toast.success("Variant removed");
    } catch (err: any) {
      console.error("removeVariant", err);
      toast.error(err?.message ?? "Remove failed");
    }
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Attributes</h4>
            </div>

            <div className="mt-3 space-y-3">
              {attributes.length === 0 && <div className="text-sm text-slate-500">No attributes yet. Add one to start.</div>}

              {attributes.map((attr, ai) => (
                <div key={attr.name} className="rounded-xl bg-white/50 p-3 border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{attr.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{(attr.values ?? []).length} values</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => removeAttribute(ai)} className="p-2 rounded-md border text-sm" title="Remove attribute">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex gap-2">
                      <input value={localAttrValue} onChange={(e) => setLocalAttrValue(e.target.value)} placeholder="New value" className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
                      <button onClick={() => addAttributeValue(ai)} className="px-3 py-2 rounded-2xl bg-slate-800 text-white">
                        Add
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(attr.values ?? []).map((v, vi) => (
                        <div key={`${attr.name}-${v}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border">
                          <span className="text-xs text-slate-700">{v}</span>
                          <button onClick={() => removeAttributeValue(ai, vi)} className="p-1 rounded-full text-rose-600">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-2 flex gap-2">
                <input value={localAttrName} onChange={(e) => setLocalAttrName(e.target.value)} placeholder="Attribute name (e.g. Size)" className="flex-1 rounded-2xl px-3 py-2 border bg-white/60" />
                <button onClick={addAttribute} className="px-3 py-2 rounded-2xl bg-blue-600 text-white">Add</button>
              </div>
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="text-xs text-slate-500">SKU pattern</div>
              <input value={skuPattern} onChange={(e) => setSkuPattern(e.target.value)} className="w-full rounded-2xl px-3 py-2 border bg-white/60 mt-2" />
              <div className="mt-2 text-xs text-slate-500">Use tokens: <code className="rounded px-1 bg-white/30">[PARENT]</code>, <code className="rounded px-1 bg-white/30">{'{ATTRS}'}</code>, <code className="rounded px-1 bg-white/30">{'{RAND}'}</code></div>

              <div className="mt-3 flex items-center gap-2">
                <button onClick={generateVariants} disabled={generating || previewVariantCount === 0} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2">
                  {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generate {previewVariantCount > 0 ? `(${previewVariantCount})` : ""}
                </button>
                <button onClick={() => { onChange({ variants: [] }); toast.info("Cleared variants"); }} className="px-3 py-2 rounded-2xl border">Clear</button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/30 border p-3">
            <div className="text-sm font-medium">Quick tips</div>
            <ul className="text-xs text-slate-500 mt-2 space-y-1">
              <li>Keep attribute names short (Size, Color).</li>
              <li>Use SKU pattern to keep variants traceable.</li>
              <li>Large attribute sets produce many variants — generate responsibly.</li>
            </ul>
          </div>
        </div>

        <div className="col-span-8">
          <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5" />
                <h4 className="text-sm font-semibold">Variants</h4>
              </div>

              <div className="text-xs text-slate-500">Total: {(draft.variants ?? []).length}</div>
            </div>

            <div className="mt-3 space-y-3 max-h-[560px] overflow-auto">
              {(draft.variants ?? []).length === 0 && <div className="text-sm text-slate-500">No variants yet — generate from attributes.</div>}

              {(draft.variants ?? []).map((v, idx) => (
                <div key={v.id ?? `v-${idx}`} className="rounded-xl bg-white/60 p-3 border flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-900">{v.sku ?? "(no sku)"}</div>
                      <div className="text-xs text-slate-500">· {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(" · ")}</div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div>
                        <div className="text-xs text-slate-500">Price</div>
                        <input type="number" value={v.price ?? ""} onChange={(e) => updateVariantField(idx, { price: e.target.value === "" ? null : Number(e.target.value) })} className="w-28 rounded-2xl px-2 py-1 border bg-white/60" />
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">On hand</div>
                        <input type="number" value={v.inventory?.on_hand ?? 0} onChange={(e) => updateVariantField(idx, { inventory: { on_hand: Number(e.target.value || 0) } })} className="w-24 rounded-2xl px-2 py-1 border bg-white/60" />
                      </div>

                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={v.active ?? true} onChange={(e) => updateVariantField(idx, { active: e.target.checked })} />
                        Active
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => removeVariant(idx)} className="p-2 rounded-md border text-sm" title="Remove variant">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
