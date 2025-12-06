"use client";

// Pharmacy POS with batch selection + auto-reserve
// DARK NEURAL GLASS UI VERSION — fixed white-wash issue

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";

/* ---------- Types ---------- */
type Product = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  tax_rate?: number;
  default_batch_id?: string | null;
  stock?: number | null;
  has_multiple_batches?: boolean;
};

type Batch = {
  id: string;
  batch_number: string;
  expiry?: string | null;
  available_qty: number;
};

type CartLine = {
  id: string;
  product_id: string;
  batch_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
  name?: string;
  sku?: string;
  reservation_id?: string | null;
  reservation_expires_at?: string | null;
};

/* ---------- Reducer ---------- */
type State = { cart: CartLine[] };

type Action =
  | { type: "ADD_LINE"; line: CartLine }
  | { type: "UPDATE_LINE"; lineId: string; patch: Partial<CartLine> }
  | { type: "SET_QUANTITY"; lineId: string; quantity: number }
  | { type: "REMOVE_LINE"; lineId: string }
  | { type: "CLEAR" }
  | { type: "SET_CART"; cart: CartLine[] };

function cartReducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_LINE":
      const ex = state.cart.find(
        (l) =>
          l.product_id === action.line.product_id &&
          (l.batch_id ?? null) === (action.line.batch_id ?? null) &&
          l.reservation_id === action.line.reservation_id
      );
      if (ex) {
        return {
          cart: state.cart.map((l) =>
            l.id === ex.id ? { ...l, quantity: l.quantity + action.line.quantity } : l
          ),
        };
      }
      return { cart: [...state.cart, action.line] };

    case "UPDATE_LINE":
      return {
        cart: state.cart.map((l) =>
          l.id === action.lineId ? { ...l, ...action.patch } : l
        ),
      };

    case "SET_QUANTITY":
      return {
        cart: state.cart.map((l) =>
          l.id === action.lineId ? { ...l, quantity: action.quantity } : l
        ),
      };

    case "REMOVE_LINE":
      return { cart: state.cart.filter((l) => l.id !== action.lineId) };

    case "CLEAR":
      return { cart: [] };

    case "SET_CART":
      return { cart: action.cart };

    default:
      return state;
  }
}

function currency(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===============================================================
   MAIN COMPONENT — DARK NEURAL GLASS
   =============================================================== */
export default function PharmacyPOSWithReserve(): JSX.Element {
  /* Metadata */
  const [tenantId, setTenantId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [locationId, setLocationId] = useState("");
  const [patientId, setPatientId] = useState("");

  /* Searching */
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* Cart */
  const [state, dispatch] = useReducer(cartReducer, { cart: [] });
  const { cart } = state;

  /* Batches */
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);

  const searchRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Restore from LocalStorage ---------- */
  useEffect(() => {
    const raw = localStorage.getItem("pos_cart_with_reservations_v1");
    if (raw) {
      try {
        const parsed: CartLine[] = JSON.parse(raw);
        if (Array.isArray(parsed)) dispatch({ type: "SET_CART", cart: parsed });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pos_cart_with_reservations_v1", JSON.stringify(cart));
  }, [cart]);

  /* ---------- Search ---------- */
  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hms/products?q=${encodeURIComponent(query)}`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        setProducts(json?.data || []);
      } catch {
        setProducts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Reservation System ---------- */
  async function reserveBatch(product_id: string, batch_id: string | null, quantity: number) {
    const idempotencyKey = `${companyId}|${locationId}|reserve|${uuidv4()}`;
    const res = await fetch(`/api/hms/reserve`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ product_id, batch_id, quantity, location_id: locationId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Reservation failed");
    return json?.data;
  }

  async function releaseReservation(id: string) {
    try {
      await fetch(`/api/hms/reserve/${id}/release`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
  }

  async function updateReservation(id: string, quantity: number) {
    const res = await fetch(`/api/hms/reserve/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Reservation update failed");
    return json?.data;
  }

  /* ---------- Add Product ---------- */
  async function handleAddClick(p: Product) {
    setMessage(null);

    if (p.has_multiple_batches) {
      setBatchProduct(p);
      setBatchModalOpen(true);
      setSelectedBatchId(null);
      setBatchQuantity(1);

      const res = await fetch(`/api/hms/products/${p.id}/batches`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      setBatches(json?.data || []);
      return;
    }

    try {
      const r = await reserveBatch(p.id, p.default_batch_id ?? null, 1);
      dispatch({
        type: "ADD_LINE",
        line: {
          id: uuidv4(),
          product_id: p.id,
          batch_id: p.default_batch_id ?? null,
          quantity: 1,
          unit_price: p.price ?? 0,
          tax_rate: p.tax_rate ?? 0,
          discount_amount: 0,
          name: p.name,
          sku: p.sku,
          reservation_id: r.reservation_id,
          reservation_expires_at: r.expires_at,
        },
      });
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  /* ---------- Confirm Batch Add ---------- */
  async function confirmAddFromBatch() {
    if (!batchProduct) return;

    const chosen = batches.find((b) => b.id === selectedBatchId);
    const avail = chosen?.available_qty ?? 0;

    if (batchQuantity > avail) {
      setMessage(`Insufficient stock. Available: ${avail}`);
      return;
    }

    try {
      const r = await reserveBatch(batchProduct.id, chosen?.id ?? null, batchQuantity);

      dispatch({
        type: "ADD_LINE",
        line: {
          id: uuidv4(),
          product_id: batchProduct.id,
          batch_id: chosen?.id ?? null,
          quantity: batchQuantity,
          unit_price: batchProduct.price ?? 0,
          tax_rate: batchProduct.tax_rate ?? 0,
          discount_amount: 0,
          name: batchProduct.name,
          sku: batchProduct.sku,
          reservation_id: r.reservation_id,
          reservation_expires_at: r.expires_at,
        },
      });

      setBatchModalOpen(false);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  /* ---------- Quantity Update ---------- */
  async function setQuantity(lineId: string, q: number) {
    const qty = Math.max(1, Math.floor(q));
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;

    if (line.reservation_id) {
      try {
        const r = await updateReservation(line.reservation_id, qty);
        dispatch({
          type: "UPDATE_LINE",
          lineId,
          patch: { quantity: qty, reservation_expires_at: r.expires_at },
        });
      } catch (e: any) {
        setMessage(e.message);
      }
    } else {
      try {
        const r = await reserveBatch(line.product_id, line.batch_id ?? null, qty);
        dispatch({
          type: "UPDATE_LINE",
          lineId,
          patch: {
            quantity: qty,
            reservation_id: r.reservation_id,
            reservation_expires_at: r.expires_at,
          },
        });
      } catch (e: any) {
        setMessage(e.message);
      }
    }
  }

  /* ---------- Remove Line ---------- */
  async function removeLine(lineId: string) {
    const line = cart.find((l) => l.id === lineId);
    if (line?.reservation_id) await releaseReservation(line.reservation_id);
    dispatch({ type: "REMOVE_LINE", lineId });
  }

  /* ---------- Submit Sale ---------- */
  async function submitSale() {
    setMessage(null);
    if (!tenantId || !companyId || !createdBy || !locationId) {
      setMessage("Missing tenant/company/user/location.");
      return;
    }

    if (!cart.length) {
      setMessage("Cart is empty.");
      return;
    }

    setLoading(true);

    const idempotencyKey = `${companyId}|${locationId}|pos|${uuidv4()}`;
    const payload = {
      tenant_id: tenantId,
      company_id: companyId,
      created_by: createdBy,
      patient_id: patientId || null,
      location_id: locationId,
      items: cart.map((c) => ({
        product_id: c.product_id,
        batch_id: c.batch_id ?? null,
        quantity: c.quantity,
        unit_price: c.unit_price,
        discount_amount: c.discount_amount ?? 0,
        tax_rate: c.tax_rate ?? 0,
        reservation_id: c.reservation_id ?? null,
      })),
      payment: {
        amount: Number(cart.reduce((s, l) => s + l.unit_price * l.quantity, 0).toFixed(2)),
        method: "cash",
        reference: `POS-${Date.now()}`,
      },
    };

    try {
      const res = await fetch(`/api/hms/pharmacy/billing/fulfill`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Billing failed");

      dispatch({ type: "CLEAR" });
      setMessage(`Invoice created: ${json?.data?.invoice_number}`);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Totals ---------- */
  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.unit_price * l.quantity, 0),
    [cart]
  );
  const tax = useMemo(
    () =>
      cart.reduce(
        (s, l) => s + ((l.tax_rate ?? 0) / 100) * l.unit_price * l.quantity,
        0
      ),
    [cart]
  );
  const total = subtotal + tax;

  /* ===============================================================
     UI STARTS HERE — DARK NEURAL GLASS FIXED
     =============================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900/20 to-slate-800/30 p-6 text-slate-100">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl p-3 bg-slate-900/30 backdrop-blur-md shadow-lg border border-slate-700/40">
              <h1 className="text-2xl font-semibold leading-none text-white">Pharmacy POS</h1>
              <div className="text-sm text-slate-300">Neural Glass • Billing — Auto-reserve enabled</div>
            </div>

            <div className="flex gap-2 items-center">
              <input placeholder="Tenant UUID" className="ng-input" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
              <input placeholder="Company UUID" className="ng-input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
              <input placeholder="User UUID" className="ng-input" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
              <input placeholder="Location UUID" className="ng-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-300">Total</div>
            <div className="px-4 py-2 rounded-xl bg-slate-900/40 backdrop-blur-md shadow-md font-semibold text-white">
              ₹ {currency(total)}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="grid grid-cols-12 gap-6">

          {/* LEFT PANEL */}
          <section className="col-span-7 bg-slate-900/25 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-700/30">
            <div className="mb-3">
              <label className="block text-sm text-slate-300 mb-1">Search product or SKU — press / to focus</label>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-100"
                placeholder="Scan or type (Enter to add)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 ? (
                <div className="col-span-2 text-slate-500 p-6">No products. Start typing or scan SKU.</div>
              ) : (
                products.map((p) => (
                  <motion.div
                    whileHover={{ y: -2 }}
                    key={p.id}
                    className="rounded-lg p-3 bg-slate-900/30 border border-slate-700/20 shadow-sm flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.sku || "—"} • ₹ {p.price ?? 0}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleAddClick(p)}
                        className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-sm"
                      >
                        Add
                      </button>
                      <div className="text-xs text-slate-400">Stock: {p.stock ?? "—"}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* RIGHT PANEL */}
          <aside className="col-span-5 bg-slate-900/25 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-700/30 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Cart</h2>
              <div className="text-sm text-slate-400">Lines: {cart.length}</div>
            </div>

            <div className="space-y-2 flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="text-slate-500 p-4">Cart empty — add items from the left.</div>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-lg p-3 bg-slate-900/30 border border-slate-700/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-white">{line.name}</div>
                      <div className="text-xs text-slate-400">SKU: {line.sku}</div>
                      <div className="text-xs text-slate-500">Batch: {line.batch_id ?? "auto"}</div>

                      {line.reservation_id && (
                        <div className="text-xs text-emerald-400">
                          Reserved • Expires:{" "}
                          {line.reservation_expires_at
                            ? new Date(line.reservation_expires_at).toLocaleTimeString()
                            : "—"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-700 rounded-md overflow-hidden">
                        <button
                          onClick={() => setQuantity(line.id, Math.max(1, line.quantity - 1))}
                          className="px-3 py-2 text-white"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          className="w-20 p-2 text-center bg-slate-800 border-slate-700 text-slate-100"
                          value={line.quantity}
                          onChange={(e) => setQuantity(line.id, Number(e.target.value || 1))}
                        />

                        <button
                          onClick={() => setQuantity(line.id, line.quantity + 1)}
                          className="px-3 py-2 text-white"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-sm text-white">₹ {currency(line.unit_price * line.quantity)}</div>

                      <button
                        className="px-2 py-1 text-sm text-red-400"
                        onClick={() => removeLine(line.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-700 pt-3">
              <div className="flex justify-between mb-2">
                <div className="text-sm text-slate-400">Subtotal</div>
                <div className="font-medium text-slate-100">₹ {currency(subtotal)}</div>
              </div>

              <div className="flex justify-between mb-3">
                <div className="text-sm text-slate-400">Tax</div>
                <div className="font-medium text-slate-100">₹ {currency(tax)}</div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => dispatch({ type: "CLEAR" })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-200"
                >
                  Clear
                </button>

                <button
                  onClick={submitSale}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white"
                >
                  Pay ₹ {currency(total)}
                </button>
              </div>

              {message && <div className="mt-3 text-sm text-red-400">{message}</div>}
            </div>
          </aside>
        </main>

        {/* BATCH MODAL */}
        {batchModalOpen && batchProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setBatchModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 w-full max-w-lg p-6 bg-slate-900/95 text-slate-100 rounded-2xl backdrop-blur-md border border-slate-700/20 shadow-xl"
            >
              <h3 className="text-lg font-semibold mb-2 text-white">
                Select batch for {batchProduct.name}
              </h3>

              <div className="mb-3 text-sm text-slate-300">
                Choose a batch — expiry & available qty shown.
              </div>

              <div className="space-y-2 max-h-60 overflow-auto mb-3">
                {batches.length === 0 ? (
                  <div className="text-slate-500 p-3">No batches found.</div>
                ) : (
                  batches.map((b) => (
                    <label
                      key={b.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedBatchId === b.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-700 bg-slate-800/40"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-white">{b.batch_number}</div>
                        <div className="text-xs text-slate-400">
                          Expiry: {b.expiry ? new Date(b.expiry).toLocaleDateString() : "—"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-200">Available: {b.available_qty}</div>
                        <input
                          type="radio"
                          name="batch"
                          checked={selectedBatchId === b.id}
                          onChange={() => {
                            setSelectedBatchId(b.id);
                            setBatchQuantity(1);
                          }}
                        />
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-300">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(Math.max(1, Number(e.target.value || 1)))}
                    className="w-full p-3 rounded-md border border-slate-700 bg-slate-800 text-slate-100"
                  />
                </div>

                <button
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 mt-6"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmAddFromBatch}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white mt-6"
                >
                  Reserve & Add
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* GLOBAL INPUT STYLE FIX */}
      <style jsx>{`
        .ng-input {
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.4);
          color: #f1f5f9;
        }
        .ng-input::placeholder {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
