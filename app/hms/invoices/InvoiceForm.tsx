"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { useCompany } from "@/app/providers/CompanyProvider";
import { motion } from "framer-motion";
import PatientSelector from "./PatientSelector";
import EncounterSelector from "./EncounterSelector";
import InlineProductAutocomplete from "@/components/InlineProductAutocomplete";

/**
 * InvoiceForm — with toggle to auto-apply product tax rates and "apply to all" action
 */
type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  uom?: string | null;
  product_id?: string | null;
};

export default function InvoiceForm({
  initial,
  companyId,
  onClose,
  onSaved,
}: {
  initial?: any;
  companyId?: string | null;
  onClose: () => void;
  onSaved?: (invoice?: any) => void;
}) {
  const toast = useToast();
  const { company } = useCompany();
  const resolvedCompanyId = companyId ?? company?.id ?? null;

  const [patientId, setPatientId] = useState<string | null>(initial?.patient_id ?? null);
  const [encounterId, setEncounterId] = useState<string | null>(initial?.encounter_id ?? null);
  const [dueAt, setDueAt] = useState<string | null>(
    initial?.due_at ? new Date(initial.due_at).toISOString().slice(0, 16) : null
  );
  const [currency, setCurrency] = useState<string>(initial?.currency ?? "INR");

  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.line_items?.length
      ? initial.line_items.map((l: any) => ({
          id: uuidv4(),
          description: l.description ?? l.name ?? "",
          quantity: Number(l.quantity ?? 1),
          unit_price: Number(l.unit_price ?? l.price ?? 0),
          discount_amount: Number(l.discount_amount ?? 0),
          tax_amount: Number(l.tax_amount ?? 0),
          net_amount: Number(
            l.net_amount ??
              (Number(l.quantity ?? 1) * Number(l.unit_price ?? 0) -
                Number(l.discount_amount ?? 0) +
                Number(l.tax_amount ?? 0))
          ),
          uom: l.uom ?? null,
          product_id: l.product_id ?? null,
        }))
      : [
          { id: uuidv4(), description: "", quantity: 1, unit_price: 0, discount_amount: 0, tax_amount: 0, net_amount: 0, uom: null, product_id: null },
        ]
  );

  const [saving, setSaving] = useState(false);

  // Auto-apply product tax toggle (default true for best UX)
  const [autoApplyProductTax, setAutoApplyProductTax] = useState<boolean>(true);
  // UI state while applying to all lines
  const [applyingAll, setApplyingAll] = useState<boolean>(false);

  // refs map to focus inputs for a given line id
  const lineDescRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // track last added line id so we can focus it after render
  const lastAddedLineId = useRef<string | null>(null);
  // track currently focused line id (for duplication)
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);

  // totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((s, li) => s + Number((li.quantity ?? 0) * (li.unit_price ?? 0)), 0);
    const totalDiscount = lineItems.reduce((s, li) => s + Number(li.discount_amount ?? 0), 0);
    const totalTax = lineItems.reduce((s, li) => s + Number(li.tax_amount ?? 0), 0);
    const total = subtotal - totalDiscount + totalTax;
    return { subtotal, totalDiscount, totalTax, total };
  }, [lineItems]);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLineItems(prev =>
      prev.map(li => {
        if (li.id !== id) return li;
        const updated = { ...li, ...patch };
        const net = (updated.quantity ?? 0) * (updated.unit_price ?? 0) - (updated.discount_amount ?? 0) + (updated.tax_amount ?? 0);
        updated.net_amount = Number(net.toFixed(4));
        return updated;
      })
    );
  }

  // Focus helper: attempt to focus desc input for a given line id
  function focusLineDescription(id: string | null) {
    if (!id) return;
    window.setTimeout(() => {
      const el = lineDescRefs.current[id];
      if (el) {
        el.focus();
        const val = el.value || "";
        el.setSelectionRange(val.length, val.length);
      }
    }, 60);
  }

  function addLine(focus = true) {
    const newId = uuidv4();
    setLineItems(s => {
      const next = [...s, { id: newId, description: "", quantity: 1, unit_price: 0, discount_amount: 0, tax_amount: 0, net_amount: 0, uom: null, product_id: null }];
      return next;
    });
    lastAddedLineId.current = newId;
    if (focus) focusLineDescription(newId);
  }

  function removeLine(id: string) {
    delete lineDescRefs.current[id];
    setLineItems(s => s.filter(l => l.id !== id));
    if (focusedLineId === id) setFocusedLineId(null);
  }

  // duplicate focused line — insert after the original and focus the duplicate
  function duplicateFocusedLine() {
    const fid = focusedLineId;
    if (!fid) {
      toast.info("Place focus on a line to duplicate it");
      return;
    }
    const idx = lineItems.findIndex(li => li.id === fid);
    if (idx === -1) {
      toast.info("Focused line not found");
      return;
    }
    const src = lineItems[idx];
    const copyId = uuidv4();
    const copy: LineItem = {
      ...src,
      id: copyId,
    };
    setLineItems(prev => {
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return next;
    });
    lastAddedLineId.current = copyId;
    toast.info("Line duplicated", "Shortcut");
  }

  // parse tax rate robustly -> fractional (0.18) or null
  function parseTaxRate(raw: any): number | null {
    if (raw == null) return null;
    const n = typeof raw === "string" ? Number(String(raw).replace("%", "").trim()) : Number(raw);
    if (!Number.isFinite(n)) return null;
    if (n > 0 && n <= 1) return n;
    if (n > 1 && n <= 100) return n / 100;
    return null;
  }

  // set tax on a single line from a product object (returns updated tax amount)
  function computeTaxAmountFromProduct(product: any, qty: number, unitPrice: number): number | null {
    const rawTax = product?.metadata?.tax_rate ?? product?.tax_rate ?? null;
    const rate = parseTaxRate(rawTax);
    if (rate == null) return null;
    return Number((unitPrice * qty * rate).toFixed(4));
  }

  // when a product is picked for a line, auto-fill description/unit_price/uom and tax_amount if toggle enabled
  async function onProductSelected(lineId: string, product: any | null) {
    if (!product) {
      updateLine(lineId, { product_id: null, uom: null });
      return;
    }

    const li = lineItems.find(l => l.id === lineId);
    const qty = li?.quantity ?? 1;
    const unitPrice = product.price ?? 0;

    let taxAmount = product.tax_amount ?? 0;
    // use metadata tax if toggle enabled and metadata present
    if (autoApplyProductTax) {
      const computed = computeTaxAmountFromProduct(product, qty, unitPrice);
      if (computed != null) taxAmount = computed;
    }

    updateLine(lineId, {
      product_id: product.id,
      description: product.name ?? product.sku ?? product.id,
      unit_price: unitPrice,
      uom: product.uom ?? null,
      tax_amount: taxAmount,
    });

    // after picking product, focus qty input for faster entry
    window.setTimeout(() => {
      const descEl = lineDescRefs.current[lineId];
      if (descEl) {
        const parent = descEl.closest("[data-line-row]");
        if (parent) {
          const qtyInput = parent.querySelector<HTMLInputElement>('input[name="qty"]');
          if (qtyInput) qtyInput.focus();
        }
      }
    }, 80);
  }

  // Apply product tax rates to all lines that have a product_id (fetch product metadata where needed)
  // paste into your InvoiceForm component (replace existing applyProductTaxToAllLines)
async function applyProductTaxToAllLines() {
  if (!resolvedCompanyId) {
    toast.error("Select a company first");
    return;
  }

  setApplyingAll(true);
  try {
    // collect unique product_ids from the lines
    const productIdToLineIds = new Map<string, string[]>();
    for (const li of lineItems) {
      if (li.product_id) {
        const arr = productIdToLineIds.get(li.product_id) ?? [];
        arr.push(li.id);
        productIdToLineIds.set(li.product_id, arr);
      }
    }

    if (productIdToLineIds.size === 0) {
      toast.info("No lines with products to apply tax to");
      return;
    }

    // helper: parse tax rate robustly
    const parseTaxRate = (raw: any): number | null => {
      if (raw == null) return null;
      const n = typeof raw === "string" ? Number(String(raw).replace("%", "").trim()) : Number(raw);
      if (!Number.isFinite(n)) return null;
      if (n > 0 && n <= 1) return n;
      if (n > 1 && n <= 100) return n / 100;
      return null;
    };

    // Fetch product details in parallel (but not more than X at a time to be gentle)
    const ids = Array.from(productIdToLineIds.keys());

    // batch size — tweak if your API rate-limits
    const BATCH = 12;
    const productFetches: Array<Promise<{ id: string; product?: any; err?: any }>> = [];

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      for (const pid of batch) {
        const p = apiClient.get(`/hms/products/${encodeURIComponent(pid)}`)
          .then(res => ({ id: pid, product: res.data?.data ?? res.data }))
          .catch(err => ({ id: pid, err }));
        productFetches.push(p);
      }
      // small pause between batches could be added if desired
    }

    const settled = await Promise.allSettled(productFetches);

    // collect updates: { lineId, taxAmount }
    const updates: { id: string; tax_amount: number }[] = [];

    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      const payload = s.value as { id: string; product?: any; err?: any };
      if (!payload || payload.err || !payload.product) continue;
      const prod = payload.product;
      const rate = parseTaxRate(prod?.metadata?.tax_rate ?? prod?.tax_rate ?? null);
      if (rate == null) continue;

      // apply the computed tax to all lines that reference this product id
      const lineIds = productIdToLineIds.get(payload.id) ?? [];
      for (const lid of lineIds) {
        const li = lineItems.find(x => x.id === lid);
        if (!li) continue;
        const taxAmount = Number((li.quantity * li.unit_price * rate).toFixed(4));
        updates.push({ id: lid, tax_amount: taxAmount });
      }
    }

    if (updates.length === 0) {
      toast.info("No product tax rates found for lines");
      return;
    }

    // apply updates in one state update
    setLineItems(prev =>
      prev.map(li => {
        const u = updates.find(x => x.id === li.id);
        if (!u) return li;
        const updated = { ...li, tax_amount: u.tax_amount };
        const net = (updated.quantity ?? 0) * (updated.unit_price ?? 0) - (updated.discount_amount ?? 0) + (updated.tax_amount ?? 0);
        updated.net_amount = Number(net.toFixed(4));
        return updated;
      })
    );

    toast.success(`Applied product tax to ${updates.length} line(s)`);
  } catch (err) {
    console.error("applyProductTaxToAllLines", err);
    toast.error("Failed to apply product tax to lines");
  } finally {
    setApplyingAll(false);
  }
}


  const handleSave = useCallback(async () => {
    if (!resolvedCompanyId) { toast.error("Select a company first"); return; }
    if (lineItems.length === 0) { toast.error("Add at least one line item"); return; }
    for (const li of lineItems) {
      if (!li.description || String(li.description).trim() === "") { toast.error("Please add a description for all line items"); return; }
    }

    setSaving(true);
    try {
      const payload: any = {
        patient_id: patientId,
        encounter_id: encounterId,
        line_items: lineItems.map(li => ({
          product_id: li.product_id ?? null,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          discount_amount: li.discount_amount,
          tax_amount: li.tax_amount,
          net_amount: li.net_amount,
          uom: li.uom ?? null,
        })),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        currency,
        company_id: resolvedCompanyId,
      };

      let result;
      if (initial?.id) {
        result = await apiClient.patch(`/hms/invoices/${encodeURIComponent(initial.id)}`, payload);
      } else {
        result = await apiClient.post(`/hms/invoices`, payload);
      }

      const invoice = result.data?.data ?? result.data ?? result;
      toast.success("Invoice saved");
      onSaved && onSaved(invoice);
      if (!initial?.id) onClose();
    } catch (err: any) {
      console.error("save invoice", err);
      const msg = err?.response?.data?.error ?? err?.message ?? "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [resolvedCompanyId, lineItems, patientId, encounterId, dueAt, currency, initial, onClose, onSaved, toast]);

  // keyboard shortcuts: Ctrl/Cmd+S = save, Ctrl/Cmd+Enter = add line, Ctrl/Cmd+D = duplicate focused line
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (!saving) handleSave();
        return;
      }

      if (mod && e.key === "Enter") {
        e.preventDefault();
        addLine(true);
        toast.info("New line added (shortcut)", "Quick tip");
        return;
      }

      if (mod && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        duplicateFocusedLine();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, saving, toast]);

  // After render, focus newly added/duplicated line if present
  useEffect(() => {
    const id = lastAddedLineId.current;
    if (id) {
      window.setTimeout(() => {
        focusLineDescription(id);
        lastAddedLineId.current = null;
      }, 50);
    }
  }, [lineItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-[900px] max-w-full bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Invoice</div>
            <div className="text-lg font-semibold">{initial?.invoice_number ?? "New Invoice"}</div>
            <div className="text-xs text-slate-400 mt-1">
              Shortcuts:
              <span className="ml-2 font-mono">{typeof window !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl"}+S</span>
              <span className="mx-2">/</span>
              <span className="font-mono">{typeof window !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl"}+Enter</span>
              <span className="mx-2">/</span>
              <span className="font-mono">{typeof window !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl"}+D</span>
              <span className="text-xs text-slate-400 ml-2"> (Save / Add line / Duplicate line)</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded-xl border">Close</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white">
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>

        {/* Controls row: auto-apply toggle + apply-to-all action */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoApplyProductTax} onChange={(e) => setAutoApplyProductTax(e.target.checked)} className="form-checkbox" />
              <span className="text-sm">Auto-apply product tax rates</span>
            </label>
            <button onClick={applyProductTaxToAllLines} disabled={applyingAll} className="px-3 py-1 rounded-xl border">
              {applyingAll ? "Applying…" : "Apply product tax rates to all lines"}
            </button>
            <div className="text-xs text-slate-400">Toggle sets default behavior when picking products</div>
          </div>

          <div className="text-xs text-slate-400">You can still edit tax amounts per-line manually.</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500">Patient</label>
            <div className="mt-1">
              <PatientSelector value={patientId} onChange={(id) => setPatientId(id)} placeholder="Select patient (optional)" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Encounter</label>
            <div className="mt-1">
              <EncounterSelector value={encounterId} onChange={(id) => setEncounterId(id)} patientId={patientId ?? undefined} placeholder="Select encounter (optional)" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">Due at</label>
            <input type="datetime-local" value={dueAt ?? ""} onChange={(e) => setDueAt(e.target.value || null)} className="w-full mt-1 px-3 py-2 rounded-xl border" />
          </div>

          <div>
            <label className="text-xs text-slate-500">Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl border" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Line items</div>
            <div className="flex items-center gap-2">
              <button onClick={() => addLine(true)} className="px-3 py-1 rounded-xl border">Add line</button>
              <div className="text-xs text-slate-400">Tip: use <span className="font-mono">{typeof window !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl"}+Enter</span> — duplicate with <span className="font-mono">{typeof window !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl"}+D</span></div>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {lineItems.map(li => (
              <div key={li.id} data-line-row className="p-3 rounded-xl border grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <InlineProductAutocomplete
                    value={li.product_id ?? undefined}
                    onSelect={(p) => onProductSelected(li.id, p)}
                    placeholder="Product name or SKU"
                  />
                  <div className="mt-2">
                    <input
                      ref={el => { lineDescRefs.current[li.id] = el; }}
                      value={li.description}
                      onChange={(e) => updateLine(li.id, { description: e.target.value })}
                      onFocus={() => setFocusedLineId(li.id)}
                      placeholder="description"
                      className="w-full px-3 py-2 rounded-xl border"
                    />
                    {li.uom && <div className="text-xs text-slate-400 mt-1">UOM: {li.uom}</div>}
                  </div>
                </div>

                <div className="col-span-1">
                  <input name="qty" type="number" step="0.0001" value={li.quantity} onChange={(e) => updateLine(li.id, { quantity: Number(e.target.value) })} className="w-full px-2 py-2 rounded-xl border" onFocus={() => setFocusedLineId(li.id)} />
                </div>
                <div className="col-span-2">
                  <input type="number" step="0.0001" value={li.unit_price} onChange={(e) => updateLine(li.id, { unit_price: Number(e.target.value) })} className="w-full px-2 py-2 rounded-xl border" placeholder="unit price" onFocus={() => setFocusedLineId(li.id)} />
                </div>
                <div className="col-span-1">
                  <input type="number" step="0.0001" value={li.discount_amount} onChange={(e) => updateLine(li.id, { discount_amount: Number(e.target.value) })} className="w-full px-2 py-2 rounded-xl border" placeholder="disc" onFocus={() => setFocusedLineId(li.id)} />
                </div>
                <div className="col-span-1">
                  <input type="number" step="0.0001" value={li.tax_amount} onChange={(e) => updateLine(li.id, { tax_amount: Number(e.target.value) })} className="w-full px-2 py-2 rounded-xl border" placeholder="tax" onFocus={() => setFocusedLineId(li.id)} />
                </div>

                <div className="col-span-1 text-right font-mono">{li.net_amount?.toFixed(2)}</div>
                <div className="col-span-1">
                  <button onClick={() => removeLine(li.id)} className="px-2 py-1 rounded-xl bg-rose-600 text-white">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-6 items-center">
          <div className="text-right">
            <div className="text-xs text-slate-500">Subtotal</div>
            <div className="font-mono">{totals.subtotal.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Discount</div>
            <div className="font-mono">-{totals.totalDiscount.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Tax</div>
            <div className="font-mono">{totals.totalTax.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-lg font-semibold">{totals.total.toFixed(2)}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
