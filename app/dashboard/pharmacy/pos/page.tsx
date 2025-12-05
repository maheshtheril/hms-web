/// <reference types="styled-jsx" />
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";

type Product = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  tax_rate?: number;
  default_batch_id?: string | null;
  stock?: number | null;
};

type CartLine = {
  product_id: string;
  batch_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
  name?: string;
  sku?: string;
};

export default function PharmacyPOSPage(): JSX.Element {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [locationId, setLocationId] = useState<string | "">("");
  const [tenantId, setTenantId] = useState<string | "">("");
  const [companyId, setCompanyId] = useState<string | "">("");
  const [createdBy, setCreatedBy] = useState<string | "">("");
  const [patientId, setPatientId] = useState<string | "">("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  // product search (debounced)
  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setProducts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hms/products?q=${encodeURIComponent(query)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          console.warn("Product search failed", res.status);
          setProducts([]);
          return;
        }
        const json = await res.json();
        setProducts(json?.data || []);
      } catch (err) {
        console.error("search error", err);
        setProducts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (s, l) => s + (l.unit_price * l.quantity - (l.discount_amount || 0)),
        0
      ),
    [cart]
  );

  const tax = useMemo(
    () =>
      cart.reduce(
        (s, l) =>
          s +
          ((l.tax_rate || 0) / 100) *
            (l.unit_price * l.quantity - (l.discount_amount || 0)),
        0
      ),
    [cart]
  );

  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  function addToCart(product: Product) {
    setMessage(null);
    const existingIndex = cart.findIndex(
      (c) =>
        c.product_id === product.id &&
        (c.batch_id || null) === (product.default_batch_id || null)
    );
    if (existingIndex >= 0) {
      setCart((prev) =>
        prev.map((c, i) =>
          i === existingIndex ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product_id: product.id,
          batch_id: product.default_batch_id || null,
          quantity: 1,
          unit_price: product.price || 0,
          discount_amount: 0,
          tax_rate: product.tax_rate || 0,
          name: product.name,
          sku: product.sku,
        },
      ]);
    }
  }

  function updateLine(idx: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function submitSale() {
    setMessage(null);

    if (!tenantId || !companyId || !createdBy || !locationId) {
      setMessage(
        "Missing tenant/company/user/location — set those values in the top-right"
      );
      return;
    }
    if (cart.length === 0) {
      setMessage("Cart empty");
      return;
    }

    const idempotencyKey = `${companyId}|${locationId}|pos|${uuidv4()}`;
    setLoading(true);
    try {
      const payload = {
        tenant_id: tenantId,
        company_id: companyId,
        created_by: createdBy,
        patient_id: patientId || null,
        location_id: locationId,
        items: cart.map((c) => ({
          product_id: c.product_id,
          batch_id: c.batch_id || null,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount_amount: c.discount_amount || 0,
          tax_rate: c.tax_rate || 0,
        })),
        payment: {
          amount: Number(total.toFixed(2)),
          method: "cash",
          reference: `POS-${Date.now()}`,
        },
      };

      const res = await fetch("/api/hms/pharmacy/billing/fulfill", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({ error: "invalid_json" }));

      if (!res.ok) {
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      setMessage(`Invoice created: ${json.data?.invoice_number || json.invoice_number || "OK"}`);
      setCart([]);
      setShowPayment(false);
    } catch (err: any) {
      console.error("submitSale error", err);
      setMessage(err?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white/60 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl p-3 bg-white/60 backdrop-blur-md shadow-sm border border-white/30">
              <h1 className="text-2xl font-semibold leading-none">Pharmacy POS</h1>
              <div className="text-sm text-slate-500">Neural Glass • Billing</div>
            </div>

            <div className="flex gap-2 items-center">
              <input
                placeholder="Tenant UUID"
                className="input"
                value={tenantId || ""}
                onChange={(e) => setTenantId(e.target.value)}
              />
              <input
                placeholder="Company UUID"
                className="input"
                value={companyId || ""}
                onChange={(e) => setCompanyId(e.target.value)}
              />
              <input
                placeholder="User UUID"
                className="input"
                value={createdBy || ""}
                onChange={(e) => setCreatedBy(e.target.value)}
              />
              <input
                placeholder="Location UUID"
                className="input"
                value={locationId || ""}
                onChange={(e) => setLocationId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">Total</div>
            <div className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold">
              ₹ {total.toFixed(2)}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          {/* left: product search + suggestions */}
          <section className="col-span-7 bg-white/50 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/30">
            <div className="mb-3">
              <label className="block text-sm text-slate-600 mb-1">
                Search product or SKU
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 bg-white/60"
                placeholder="Search e.g. Paracetamol"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 ? (
                <div className="col-span-2 text-slate-400 p-6">
                  No products. Start typing to search.
                </div>
              ) : (
                products.map((p) => (
                  <motion.div
                    whileHover={{ y: -2 }}
                    key={p.id}
                    className="rounded-lg p-3 bg-white/80 border border-white/20 shadow-sm flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.sku} • ₹ {p.price}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => addToCart(p)}
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

          {/* right: cart */}
          <aside className="col-span-5 bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/30 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Cart</h2>
              <div className="text-sm text-slate-500">Lines: {cart.length}</div>
            </div>

            <div className="space-y-2 flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="text-slate-400 p-4">Cart empty — add items from the left.</div>
              ) : (
                cart.map((line, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-3 bg-white border border-white/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{line.name}</div>
                      <div className="text-xs text-slate-500">SKU: {line.sku}</div>
                      <div className="text-xs text-slate-400">Batch: {line.batch_id ?? "auto"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-20 p-2 rounded-md border"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                      />
                      <div className="text-sm">₹ {(line.unit_price * line.quantity).toFixed(2)}</div>
                      <button
                        className="px-2 py-1 text-sm text-red-600"
                        onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="flex justify-between mb-2">
                <div className="text-sm text-slate-500">Subtotal</div>
                <div className="font-medium">₹ {subtotal.toFixed(2)}</div>
              </div>
              <div className="flex justify-between mb-3">
                <div className="text-sm text-slate-500">Tax</div>
                <div className="font-medium">₹ {tax.toFixed(2)}</div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setCart([])} className="flex-1 px-4 py-2 rounded-lg border">
                  Clear
                </button>
                <button
                  onClick={() => {
                    setShowPayment(true);
                    setPaymentAmount(Number(total.toFixed(2)));
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white"
                >
                  Pay ₹ {total.toFixed(2)}
                </button>
              </div>

              {message && <div className="mt-3 text-sm text-red-600">{message}</div>}
            </div>
          </aside>
        </main>

        {/* Payment modal (simple) */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowPayment(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 w-full max-w-md p-6 bg-white/90 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg"
            >
              <h3 className="text-lg font-semibold mb-2">Payment</h3>
              <div className="mb-3 text-sm text-slate-600">Amount due: ₹ {total.toFixed(2)}</div>

              <div className="space-y-2">
                <label className="block text-sm text-slate-500">Amount</label>
                <input
                  type="number"
                  value={paymentAmount ?? total}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 rounded-md border"
                />
                <label className="block text-sm text-slate-500">Method</label>
                <select className="w-full p-3 rounded-md border">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-4 py-2 rounded-lg border" onClick={() => setShowPayment(false)}>
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white"
                  onClick={async () => {
                    await submitSale();
                  }}
                >
                  {loading ? "Processing…" : "Confirm & Pay"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <style jsx>{`
        .input {
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(15, 23, 42, 0.06);
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
}
