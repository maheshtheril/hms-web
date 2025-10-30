"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash, Search } from "lucide-react";
import debounce from "debounce-promise";
import apiClient from "@/lib/api-client";

export type PurchaseLine = {
  id: string; // client-side id (uuid) or DB id
  product_id?: string | null;
  product_name?: string | null;
  description?: string | null;
  qty: number;
  uom?: string | null;
  unit_price: number;
  tax_percent?: number; // e.g., 18 for 18%
  line_total?: number; // qty * unit_price (parent may ignore)
  tax_amount?: number; // computed
  metadata?: any;
};

export type PurchaseItemsTableProps = {
  lines: PurchaseLine[];
  onChange: (lines: PurchaseLine[]) => void;
  readOnly?: boolean;
  showProductSearch?: boolean; // toggles product autocomplete column
  productSearchMinLength?: number;
};

export default function PurchaseItemsTable({
  lines,
  onChange,
  readOnly = false,
  showProductSearch = true,
  productSearchMinLength = 2,
}: PurchaseItemsTableProps) {
  const [localLines, setLocalLines] = useState<PurchaseLine[]>(lines || []);
  const [searchResults, setSearchResults] = useState<Record<number, Array<{ id: string; name: string; uom?: string; default_cost?: number }>>>({});
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});

  // keep localLines in sync when parent updates
  useEffect(() => setLocalLines(lines || []), [lines]);

  // update parent when localLines change
  useEffect(() => onChange(localLines), [localLines, onChange]);

  // derived totals
  const subtotal = useMemo(
    () => localLines.reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0),
    [localLines]
  );
  const totalTax = useMemo(
    () =>
      localLines.reduce(
        (s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0) * (Number(l.tax_percent || 0) / 100)),
        0
      ),
    [localLines]
  );
  const grandTotal = useMemo(() => subtotal + totalTax, [subtotal, totalTax]);

  // helpers
  function patchLine(idx: number, patch: Partial<PurchaseLine>) {
    setLocalLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    const newLine: PurchaseLine = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product_id: null,
      product_name: "",
      description: "",
      qty: 1,
      uom: "each",
      unit_price: 0,
      tax_percent: 0,
    };
    setLocalLines((prev) => [...prev, newLine]);
  }
  function removeLine(i: number) {
    setLocalLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  // product search (debounced) per-row
  const debouncedSearch = useMemo(() => debounce(async (q: string) => {
    const res = await apiClient.get("/hms/products", { params: { q, limit: 10 } });
    return Array.isArray(res.data) ? res.data : [];
  }, 350), []);

  useEffect(() => {
    // cleanup on unmount
    return () => debouncedSearch.clear && debouncedSearch.clear();
  }, [debouncedSearch]);

  async function handleProductQuery(idx: number, q: string) {
    setSearchQueries((s) => ({ ...s, [idx]: q }));
    if (!q || q.trim().length < productSearchMinLength) {
      setSearchResults((r) => ({ ...r, [idx]: [] }));
      return;
    }
    try {
      const results = await debouncedSearch(q);
      // normalize expected shape
      const mapped = results.map((r: any) => ({ id: r.id, name: r.name || r.sku || r.title, uom: r.uom || r.uom, default_cost: r.default_cost ?? r.price }));
      setSearchResults((prev) => ({ ...prev, [idx]: mapped }));
    } catch (err) {
      console.error("product search error", err);
      setSearchResults((prev) => ({ ...prev, [idx]: [] }));
    }
  }

  function chooseProduct(idx: number, product: { id: string; name: string; uom?: string; default_cost?: number }) {
    patchLine(idx, {
      product_id: product.id,
      product_name: product.name,
      uom: product.uom || localLines[idx].uom || "each",
      unit_price: product.default_cost ?? localLines[idx].unit_price,
    });
    // clear results
    setSearchResults((r) => ({ ...r, [idx]: [] }));
    setSearchQueries((s) => ({ ...s, [idx]: "" }));
  }

  return (
    <div className="glass-panel p-3 rounded-xl">
      <div className="flex justify-between items-center mb-3">
        <div className="font-medium">Items</div>
        {!readOnly && (
          <button aria-label="Add line" className="glass-button text-sm flex items-center gap-2" onClick={addLine}>
            <Plus size={14} /> Add line
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-400 border-b border-white/10">
              <th className="p-2 text-left w-8">#</th>
              {showProductSearch && <th className="p-2 text-left w-56">Product</th>}
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right w-24">Qty</th>
              <th className="p-2 text-right w-28">UoM</th>
              <th className="p-2 text-right w-32">Unit Price</th>
              <th className="p-2 text-right w-24">Tax %</th>
              <th className="p-2 text-right w-32">Line Total</th>
              <th className="p-2 w-12" />
            </tr>
          </thead>

          <tbody>
            {localLines.map((ln, i) => {
              const lineSubtotal = Number(ln.qty || 0) * Number(ln.unit_price || 0);
              const taxAmount = lineSubtotal * (Number(ln.tax_percent || 0) / 100);
              const lineTotal = lineSubtotal + taxAmount;

              return (
                <tr key={ln.id} className="border-b border-white/5">
                  <td className="p-2 text-neutral-400">{i + 1}</td>

                  {showProductSearch && (
                    <td className="p-2">
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <input
                            value={searchQueries[i] ?? ln.product_name ?? ""}
                            onChange={(e) => handleProductQuery(i, e.target.value)}
                            placeholder="Search product..."
                            disabled={readOnly}
                            className="input w-full"
                            aria-label={`Product search row ${i + 1}`}
                          />
                          <div className="text-neutral-400 pl-2"><Search size={14} /></div>
                        </div>

                        {/* dropdown */}
                        {Array.isArray(searchResults[i]) && searchResults[i].length > 0 && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-white/6 border border-white/10 rounded shadow max-h-44 overflow-auto">
                            {searchResults[i].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-white/5"
                                onClick={() => chooseProduct(i, p)}
                              >
                                <div className="text-sm font-medium">{p.name}</div>
                                <div className="text-xs text-neutral-400">{p.uom ?? ""}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="p-2">
                    <input
                      value={ln.description ?? ""}
                      onChange={(e) => patchLine(i, { description: e.target.value })}
                      className="input w-full"
                      disabled={readOnly}
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={ln.qty}
                      onChange={(e) => patchLine(i, { qty: Number(e.target.value) })}
                      className="input text-right"
                      disabled={readOnly}
                      aria-label={`Quantity row ${i + 1}`}
                    />
                  </td>

                  <td className="p-2">
                    <input
                      value={ln.uom ?? "each"}
                      onChange={(e) => patchLine(i, { uom: e.target.value })}
                      className="input text-right"
                      disabled={readOnly}
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={ln.unit_price}
                      onChange={(e) => patchLine(i, { unit_price: Number(e.target.value) })}
                      className="input text-right"
                      disabled={readOnly}
                    />
                  </td>

                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={ln.tax_percent ?? 0}
                      onChange={(e) => patchLine(i, { tax_percent: Number(e.target.value) })}
                      className="input text-right"
                      disabled={readOnly}
                    />
                  </td>

                  <td className="p-2 text-right text-neutral-300">
                    {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(lineTotal)}
                  </td>

                  <td className="p-2 text-center">
                    {!readOnly && (
                      <button aria-label={`Remove line ${i + 1}`} className="glass-button" onClick={() => removeLine(i)}>
                        <Trash size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* totals */}
      <div className="pt-3 text-right space-y-1">
        <div className="text-sm text-neutral-400">Subtotal: {formatCurrency(subtotal)}</div>
        <div className="text-sm text-neutral-400">Total Tax: {formatCurrency(totalTax)}</div>
        <div className="text-lg font-medium">Total: {formatCurrency(grandTotal)}</div>
      </div>
    </div>
  );
}

/* Small helper for consistent formatting; parent may localize/currency */
function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `USD ${Number(value || 0).toFixed(2)}`;
  }
}
