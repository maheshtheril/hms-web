"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Trash, Edit, Check, X, Search } from "lucide-react";
import apiClient from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import debounce from "debounce-promise";

/* -------------------------------------------------------------------------- */
/*                                Page Types                                   */
/* -------------------------------------------------------------------------- */
type PO = {
  id: string;
  name: string;
  supplier_name?: string;
  supplier_id?: string;
  order_date?: string;
  status?: string;
  total_amount?: number;
  currency?: string;
  created_at?: string;
  isOptimistic?: boolean;
};

type PurchaseLine = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  description?: string | null;
  qty: number;
  uom?: string | null;
  unit_price: number;
  tax_percent?: number;
};

/* -------------------------------------------------------------------------- */
/*                             Main Purchases Page                             */
/* -------------------------------------------------------------------------- */
export default function PurchasesPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [purchases, setPurchases] = useState<PO[]>([]);
  const [page, setPage] = useState<number>(0);
  const [limit] = useState<number>(20);

  // modals
  const [showPOForm, setShowPOForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PO | null>(null);

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchPurchases() {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/hms/purchases", {
        params: { limit, offset: page * limit },
      });
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("fetchPurchases:", err);
      toastError("Failed to load purchase orders.");
    } finally {
      setLoading(false);
    }
  }

  async function createPurchaseOptimistic(payload: any) {
    if (!payload.name || !payload.supplier_id) throw new Error("PO number and supplier are required.");
    if (!payload.lines || !payload.lines.length) throw new Error("Add at least one line to the PO.");

    const tempId = `temp-${uuidv4()}`;

    // compute total_amount safely and with correct operator precedence
    const total_amount = payload.lines.reduce((s: number, l: any) => {
      const computedLineTotal =
  (l.line_total ?? ((l.qty ?? 0) * (l.unit_price ?? 0))) || 0;

      // clear precedence: ?? first, then || fallback
      return s + Number(computedLineTotal || 0);
    }, 0);

    const optimisticPO: PO = {
      id: tempId,
      name: payload.name,
      supplier_name: payload.supplier_name || "—",
      status: "draft",
      total_amount,
      isOptimistic: true,
    };

    setPurchases((prev) => [optimisticPO, ...prev]);
    try {
      const res = await apiClient.post("/hms/purchases", payload);
      const createdPO = res.data?.purchase_order ?? res.data;
      setPurchases((prev) => prev.map((p) => (p.id === tempId ? createdPO : p)));
      toastSuccess("Purchase order created.");
      return createdPO;
    } catch (err: any) {
      console.error("createPurchaseOptimistic:", err);
      setPurchases((prev) => prev.filter((p) => p.id !== tempId));
      const msg = err?.response?.data?.error || err?.message || "Failed to create PO";
      toastError(msg);
      throw err;
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Purchase Orders
        </h1>

        <div className="flex gap-2">
          <button
            className="glass-button flex items-center gap-2"
            onClick={() => {
              setEditingPO(null);
              setShowPOForm(true);
            }}
          >
            <Plus size={16} /> New PO
          </button>
          <button className="glass-button" onClick={fetchPurchases}>
            Refresh
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-2">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-neutral-400">
            <Loader2 className="animate-spin mr-2" /> Loading...
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-neutral-400">No purchase orders yet — create one.</div>
        ) : (
          <div className="divide-y divide-white/6">
            {purchases.map((p) => (
              <POListItem
                key={p.id}
                po={p}
                onEdit={() => {
                  setEditingPO(p);
                  setShowPOForm(true);
                }}
                onReceive={() => {
                  setEditingPO(p);
                  setShowReceiptForm(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-neutral-400">Page {page + 1}</div>
        <div className="flex gap-2">
          <button className="glass-button" onClick={() => setPage(Math.max(0, page - 1))}>
            Prev
          </button>
          <button className="glass-button" onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {showPOForm && (
        <POFormModal
          initial={editingPO}
          onClose={async (shouldRefresh?: boolean) => {
            setShowPOForm(false);
            setEditingPO(null);
            if (shouldRefresh) await fetchPurchases();
          }}
          onCreateOptimistic={createPurchaseOptimistic}
        />
      )}

      {showReceiptForm && editingPO && (
        <ReceiptModal
          po={editingPO}
          onClose={async (shouldRefresh?: boolean) => {
            setShowReceiptForm(false);
            setEditingPO(null);
            if (shouldRefresh) await fetchPurchases();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                PO List Item                                 */
/* -------------------------------------------------------------------------- */
function POListItem({ po, onEdit, onReceive }: { po: PO; onEdit: () => void; onReceive: () => void }) {
  return (
    <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }} className="p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">
          {po.name} <span className="text-sm text-neutral-400">• {po.supplier_name || "Unknown Supplier"}</span>
        </div>
        <div className="text-sm text-neutral-400">
          Status: <span className="inline-block ml-2 px-2 py-0.5 rounded-lg bg-white/3 text-xs">{po.status}</span>
        </div>
        <div className="text-sm text-neutral-400">Ordered: {po.order_date ?? "—"}</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm font-medium">{formatCurrency(po.total_amount, po.currency)}</div>
        <button className="glass-button" onClick={onReceive}>
          Receive
        </button>
        <button className="glass-button" onClick={onEdit}>
          <Edit size={14} />
        </button>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 PO Form Modal                               */
/* -------------------------------------------------------------------------- */
function POFormModal({
  initial,
  onClose,
  onCreateOptimistic,
}: {
  initial: PO | null;
  onClose: (shouldRefresh?: boolean) => void;
  onCreateOptimistic: (payload: any) => Promise<any>;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial?.name ?? `PO/HMS/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000) + 1000}`);
  const [supplierId, setSupplierId] = useState(initial?.supplier_id ?? "");
  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? "");
  const [orderDate, setOrderDate] = useState(initial?.order_date ?? new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");

  // lines state handled by PurchaseItemsTable component
  const initialLines: PurchaseLine[] =
    (initial as any)?.lines?.map
      ? (initial as any).lines.map((l: any) => ({
          id: l.id ?? uuidv4(),
          product_id: l.product_id ?? null,
          product_name: l.product_name ?? null,
          description: l.description ?? null,
          qty: Number(l.qty ?? 1),
          uom: l.uom ?? "each",
          unit_price: Number(l.unit_price ?? 0),
          tax_percent: Number(l.tax_percent ?? 0),
        }))
      : [{ id: uuidv4(), qty: 1, unit_price: 0, tax_percent: 0 }];

  const [lines, setLines] = useState<PurchaseLine[]>(initialLines);

  // supplier search
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (supplierSearch.trim().length < 2) {
        setSupplierOptions([]);
        return;
      }
      (async () => {
        try {
          const { data } = await apiClient.get("/hms/suppliers", { params: { q: supplierSearch, limit: 10 } });
          setSupplierOptions(Array.isArray(data) ? data : []);
        } catch (err) {
          setSupplierOptions([]);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [supplierSearch]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + Number((l.qty || 0) * (l.unit_price || 0)), 0), [lines]);

  async function handleSave() {
    if (!name.trim()) return toastError("PO number required.");
    if (!supplierId) return toastError("Supplier required.");
    if (!lines.length) return toastError("Add at least one line.");
    for (const l of lines) {
      if (!l.product_id) return toastError("Each line requires a product id.");
      if (Number(l.qty) <= 0) return toastError("Quantities must be > 0.");
    }

    const payload = {
      name,
      supplier_id: supplierId,
      supplier_name: supplierName,
      order_date: orderDate,
      currency,
      lines: lines.map((l) => ({
        product_id: l.product_id,
        product_name: l.product_name,
        description: l.description,
        qty: Number(l.qty),
        uom: l.uom,
        unit_price: Number(l.unit_price),
        tax_amount: Number(((l.qty || 0) * (l.unit_price || 0) * (l.tax_percent || 0)) / 100),
        line_total: Number((l.qty || 0) * (l.unit_price || 0)),
      })),
    };

    setSaving(true);
    try {
      if (!initial) {
        await onCreateOptimistic(payload);
        onClose(true);
      } else {
        // update basic fields
        await apiClient.put(`/hms/purchases/${encodeURIComponent(initial.id)}`, { name, supplier_id: supplierId, expected_date: orderDate });
        toastSuccess("Purchase order updated.");
        onClose(true);
      }
    } catch (err) {
      // handled upstream
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={() => onClose(false)} title={initial ? "Edit Purchase Order" : "New Purchase Order"}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col">
            <span className="text-sm text-neutral-400">PO Number</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </label>

          <div className="flex flex-col">
            <span className="text-sm text-neutral-400">Supplier</span>
            <div className="flex gap-2">
              <input
                className="input"
                value={supplierSearch || supplierName}
                placeholder="Search suppliers..."
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setSupplierName("");
                  setSupplierId("");
                }}
              />
              <button
                className="glass-button"
                onClick={async () => {
                  if (!supplierSearch) return toastError("Type supplier name or choose one.");
                  try {
                    const { data } = await apiClient.post("/hms/suppliers", { name: supplierSearch });
                    setSupplierId(data.id);
                    setSupplierName(data.name);
                    setSupplierOptions([]);
                    setSupplierSearch("");
                    toastSuccess("Supplier created & selected.");
                  } catch (err) {
                    console.error(err);
                    toastError("Failed to create supplier.");
                  }
                }}
              >
                Create
              </button>
            </div>

            {supplierOptions.length > 0 && (
              <div className="mt-2 bg-white/3 border border-white/10 rounded-md p-2 max-h-40 overflow-auto">
                {supplierOptions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-1 cursor-pointer hover:bg-white/5 px-2 rounded"
                    onClick={() => {
                      setSupplierId(s.id);
                      setSupplierName(s.name);
                      setSupplierOptions([]);
                      setSupplierSearch("");
                    }}
                  >
                    <div className="text-sm">{s.name}</div>
                    <div className="text-xs text-neutral-400">select</div>
                  </div>
                ))}
              </div>
            )}

            {supplierId && supplierName && <div className="text-sm text-neutral-400 mt-1">Selected: {supplierName}</div>}
          </div>

          <label className="flex flex-col">
            <span className="text-sm text-neutral-400">Order Date</span>
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="input" />
          </label>
        </div>

        {/* Purchase items table */}
        <PurchaseItemsTable lines={lines} onChange={setLines} showProductSearch={true} />

        <div className="flex justify-end gap-2">
          <button className="glass-button" onClick={() => onClose(false)}>
            <X /> Cancel
          </button>
          <button className="glass-button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Receipt Modal                                */
/* -------------------------------------------------------------------------- */
function ReceiptModal({ po, onClose }: { po: PO; onClose: (shouldRefresh?: boolean) => void }) {
  const [lines, setLines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get(`/hms/purchases/${encodeURIComponent(po.id)}`);
        const poLines = data.lines || [];
        setLines(
          poLines.map((l: any) => ({
            po_line_id: l.id,
            product_id: l.product_id,
            product_name: l.product_name,
            qty: Math.max(0, (l.qty || 0) - (l.received_qty || 0)),
            unit_price: l.unit_price || 0,
          }))
        );
      } catch (err) {
        console.error(err);
        toastError("Failed to load PO lines for receipt.");
      }
    })();
  }, [po.id]);

  function updateLine(i: number, patch: Partial<any>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submitReceipt() {
    if (!lines.length) return toastError("No lines to receive.");
    for (const l of lines) {
      if (!l.product_id) return toastError("Product missing for a line.");
      if (!l.qty || Number(l.qty) <= 0) return toastError("All received quantities must be > 0.");
    }

    setSaving(true);
    try {
      const payload = {
        purchase_order_id: po.id,
        name: `GRN/${po.name}`,
        lines: lines.map((l) => ({
          po_line_id: l.po_line_id,
          product_id: l.product_id,
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
        })),
      };

      await apiClient.post("/hms/receipts", payload);
      toastSuccess("Receipt created and stock updated.");
      onClose(true);
    } catch (err) {
      console.error("submitReceipt:", err);
      toastError("Failed to create receipt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={() => onClose(false)} title={`Receive: ${po.name}`}>
      <div className="space-y-4">
        <div className="glass-panel p-3 rounded-xl">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">{l.product_name || l.product_id}</div>
                <div className="col-span-4">{l.product_id}</div>
                <input type="number" className="col-span-2 input" value={l.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} />
                <input type="number" className="col-span-2 input" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="glass-button" onClick={() => onClose(false)}>
            <X /> Cancel
          </button>
          <button className="glass-button" onClick={submitReceipt} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />} Receive
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Modal Shell                                 */
/* -------------------------------------------------------------------------- */
function ModalShell({ children, title, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-[95%] max-w-4xl p-6 bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="glass-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div>{children}</div>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          PurchaseItemsTable component                       */
/*        (reusable - included here to keep file drop-in ready; extract later) */
/* -------------------------------------------------------------------------- */
function PurchaseItemsTable({
  lines,
  onChange,
  readOnly = false,
  showProductSearch = true,
  productSearchMinLength = 2,
}: {
  lines: PurchaseLine[];
  onChange: (lines: PurchaseLine[]) => void;
  readOnly?: boolean;
  showProductSearch?: boolean;
  productSearchMinLength?: number;
}) {
  const [localLines, setLocalLines] = useState<PurchaseLine[]>(lines || []);
  const [searchResults, setSearchResults] = useState<Record<number, Array<any>>>({});
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});

  React.useEffect(() => setLocalLines(lines || []), [lines]);
  React.useEffect(() => onChange(localLines), [localLines, onChange]);

  const subtotal = useMemo(() => localLines.reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0), [localLines]);
  const totalTax = useMemo(() => localLines.reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0) * (Number(l.tax_percent || 0) / 100)), 0), [localLines]);
  const grandTotal = useMemo(() => subtotal + totalTax, [subtotal, totalTax]);

  function patchLine(idx: number, patch: Partial<PurchaseLine>) {
    setLocalLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLocalLines((prev) => [...prev, { id: uuidv4(), product_id: null, product_name: "", description: "", qty: 1, uom: "each", unit_price: 0, tax_percent: 0 } as PurchaseLine]);
  }
  function removeLine(i: number) {
    setLocalLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const debouncedSearch = React.useMemo(
    () =>
      debounce(async (q: string) => {
        const res = await apiClient.get("/hms/products", { params: { q, limit: 10 } });
        return Array.isArray(res.data) ? res.data : [];
      }, 300),
    []
  );

  React.useEffect(() => {
    return () => {
      // cleanup
      try {
        (debouncedSearch as any).cancel?.();
      } catch {}
    };
  }, [debouncedSearch]);

  async function handleProductQuery(idx: number, q: string) {
    setSearchQueries((s) => ({ ...s, [idx]: q }));
    if (!q || q.trim().length < productSearchMinLength) {
      setSearchResults((r) => ({ ...r, [idx]: [] }));
      return;
    }
    try {
      const results = await debouncedSearch(q);
      const mapped = results.map((r: any) => ({ id: r.id, name: r.name || r.sku || r.title, uom: r.uom, default_cost: r.default_cost ?? r.price }));
      setSearchResults((prev) => ({ ...prev, [idx]: mapped }));
    } catch (err) {
      console.error("product search error", err);
      setSearchResults((prev) => ({ ...prev, [idx]: [] }));
    }
  }

  function chooseProduct(idx: number, product: any) {
    patchLine(idx, { product_id: product.id, product_name: product.name, uom: product.uom || localLines[idx]?.uom || "each", unit_price: product.default_cost ?? localLines[idx]?.unit_price ?? 0 });
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
                          />
                          <div className="text-neutral-400 pl-2">
                            <Search size={14} />
                          </div>
                        </div>

                        {Array.isArray(searchResults[i]) && searchResults[i].length > 0 && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-white/6 border border-white/10 rounded shadow max-h-44 overflow-auto">
                            {searchResults[i].map((p) => (
                              <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-white/5" onClick={() => chooseProduct(i, p)}>
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
                    <input value={ln.description ?? ""} onChange={(e) => patchLine(i, { description: e.target.value })} className="input w-full" disabled={readOnly} />
                  </td>

                  <td className="p-2">
                    <input type="number" min={0} value={ln.qty} onChange={(e) => patchLine(i, { qty: Number(e.target.value) })} className="input text-right" disabled={readOnly} />
                  </td>

                  <td className="p-2">
                    <input value={ln.uom ?? "each"} onChange={(e) => patchLine(i, { uom: e.target.value })} className="input text-right" disabled={readOnly} />
                  </td>

                  <td className="p-2">
                    <input type="number" min={0} step="0.01" value={ln.unit_price} onChange={(e) => patchLine(i, { unit_price: Number(e.target.value) })} className="input text-right" disabled={readOnly} />
                  </td>

                  <td className="p-2">
                    <input type="number" min={0} max={100} step="0.01" value={ln.tax_percent ?? 0} onChange={(e) => patchLine(i, { tax_percent: Number(e.target.value) })} className="input text-right" disabled={readOnly} />
                  </td>

                  <td className="p-2 text-right text-neutral-300">{formatCurrency(lineTotal)}</td>

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

      <div className="pt-3 text-right space-y-1">
        <div className="text-sm text-neutral-400">Subtotal: {formatCurrency(subtotal)}</div>
        <div className="text-sm text-neutral-400">Total Tax: {formatCurrency(totalTax)}</div>
        <div className="text-lg font-medium">Total: {formatCurrency(grandTotal)}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                    */
/* -------------------------------------------------------------------------- */
function formatCurrency(value: any, cur = "USD") {
  const v = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(v);
  } catch (e) {
    return `${cur} ${v.toFixed(2)}`;
  }
}

function toastSuccess(msg: string) {
  console.info("SUCCESS:", msg);
  try {
    // @ts-ignore
    window?.toast?.success?.(msg);
  } catch {}
}
function toastError(msg: string) {
  console.error("ERROR:", msg);
  try {
    // @ts-ignore
    window?.toast?.error?.(msg);
  } catch {}
}
