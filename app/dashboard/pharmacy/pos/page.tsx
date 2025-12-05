// PharmacyPOS_with_batch_selection_and_reserve.tsx
// React + TypeScript POS page with batch selection, stock validation, AND auto-reserve (pre-reserve) of batches.
// Uses Neural Glass design patterns and focuses on avoiding race conditions for hot-selling pharmacy items.
// Back-end endpoints expected:
//  - GET /api/hms/products?q=...            -> product search
//  - GET /api/hms/products/:id/batches      -> { data: Batch[] }
//  - GET /api/hms/stock?product_id=...&batch_id=... -> { data: { available_qty } }
//  - POST /api/hms/reserve                  -> { product_id, batch_id, quantity, location_id, idempotency_key } returns { reservation_id, expires_at }
//  - POST /api/hms/reserve/:id/release      -> releases reservation
//  - PATCH /api/hms/reserve/:id             -> { quantity } updates reservation
//  - POST /api/hms/pharmacy/billing/fulfill -> create invoice (finalize reserved quantities)

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
  expiry?: string | null; // ISO date
  available_qty: number;
};

type CartLine = {
  id: string; // local line id
  product_id: string;
  batch_id?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
  name?: string;
  sku?: string;
  reservation_id?: string | null; // reservation returned by backend
  reservation_expires_at?: string | null;
};

/* ---------- Reducer & helpers ---------- */
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
      // merge if same product+batch (no reservation merge logic because reservation_id differs)
      const existing = state.cart.find(
        (l) => l.product_id === action.line.product_id && (l.batch_id ?? null) === (action.line.batch_id ?? null) && l.reservation_id === action.line.reservation_id
      );
      if (existing) {
        return { cart: state.cart.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + action.line.quantity } : l)) };
      }
      return { cart: [...state.cart, action.line] };

    case "UPDATE_LINE":
      return { cart: state.cart.map((l) => (l.id === action.lineId ? { ...l, ...action.patch } : l)) };

    case "SET_QUANTITY":
      return { cart: state.cart.map((l) => (l.id === action.lineId ? { ...l, quantity: action.quantity } : l)) };

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

/* ---------- Main Component ---------- */
export default function PharmacyPOSWithReserve(): JSX.Element {
  // metadata
  const [tenantId, setTenantId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [locationId, setLocationId] = useState("");
  const [patientId, setPatientId] = useState("");

  // search + products
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // cart reducer
  const [state, dispatch] = useReducer(cartReducer, { cart: [] });
  const { cart } = state;

  // batch modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);

  const searchRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Persist cart + reservations to localStorage ---------- */
  useEffect(() => {
    const key = "pos_cart_with_reservations_v1";
    const raw = localStorage.getItem(key);
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

  /* ---------- Debounced search ---------- */
  useEffect(() => {
    if (!query || query.trim() === "") {
      setProducts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hms/products?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        if (!res.ok) { setProducts([]); return; }
        const json = await res.json();
        setProducts(json?.data || []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------- Reservation helpers ---------- */
  async function reserveBatch(product_id: string, batch_id: string | null, quantity: number) {
    // POST /api/hms/reserve -> { reservation_id, expires_at }
    try {
      const idempotencyKey = `${companyId}|${locationId}|reserve|${uuidv4()}`;
      const res = await fetch(`/api/hms/reserve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ product_id, batch_id, quantity, location_id: locationId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return { reservation_id: json?.data?.reservation_id || json?.reservation_id, expires_at: json?.data?.expires_at || json?.expires_at };
    } catch (err) {
      console.error('reserve error', err);
      throw err;
    }
  }

  async function releaseReservation(reservation_id: string) {
    try {
      const res = await fetch(`/api/hms/reserve/${encodeURIComponent(reservation_id)}/release`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        console.warn('failed to release reservation', reservation_id);
      }
    } catch (err) {
      console.warn('release reservation failed', err);
    }
  }

  async function updateReservation(reservation_id: string, quantity: number) {
    try {
      const res = await fetch(`/api/hms/reserve/${encodeURIComponent(reservation_id)}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return { reservation_id: json?.data?.reservation_id || json?.reservation_id, expires_at: json?.data?.expires_at || json?.expires_at };
    } catch (err) {
      console.error('update reservation failed', err);
      throw err;
    }
  }

  /* ---------- Open batch modal when product has multiple batches; reserve on confirm ---------- */
  async function handleAddClick(p: Product) {
    setMessage(null);
    if (p.has_multiple_batches) {
      setBatchProduct(p);
      setBatchModalOpen(true);
      setSelectedBatchId(null);
      setBatchQuantity(1);
      try {
        const res = await fetch(`/api/hms/products/${encodeURIComponent(p.id)}/batches`, { credentials: 'include' });
        if (!res.ok) { setMessage('Failed to load batches'); setBatches([]); return; }
        const json = await res.json();
        setBatches(json?.data || []);
      } catch (err) {
        console.error(err);
        setBatches([]);
      }
    } else {
      // single-batch path: try to reserve default batch before adding
      try {
        const r = await reserveBatch(p.id, p.default_batch_id ?? null, 1);
        dispatch({ type: 'ADD_LINE', line: {
          id: uuidv4(), product_id: p.id, batch_id: p.default_batch_id ?? null, quantity: 1, unit_price: p.price ?? 0, discount_amount: 0, tax_rate: p.tax_rate ?? 0, name: p.name, sku: p.sku, reservation_id: r.reservation_id, reservation_expires_at: r.expires_at
        }});
      } catch (err: any) {
        setMessage(err?.message || 'Failed to reserve item');
      }
    }
  }

  async function confirmAddFromBatch() {
    if (!batchProduct) return;
    const chosen = batches.find((b) => b.id === selectedBatchId) ?? null;
    const avail = chosen?.available_qty ?? 0;
    if (batchQuantity <= 0) { setMessage('Quantity must be at least 1'); return; }
    if (batchQuantity > avail) { setMessage(`Insufficient stock in selected batch (available ${avail})`); return; }

    try {
      const r = await reserveBatch(batchProduct.id, chosen?.id ?? batchProduct.default_batch_id ?? null, batchQuantity);
      dispatch({ type: 'ADD_LINE', line: {
        id: uuidv4(), product_id: batchProduct.id, batch_id: chosen?.id ?? batchProduct.default_batch_id ?? null, quantity: batchQuantity, unit_price: batchProduct.price ?? 0, discount_amount: 0, tax_rate: batchProduct.tax_rate ?? 0, name: batchProduct.name, sku: batchProduct.sku, reservation_id: r.reservation_id, reservation_expires_at: r.expires_at
      }});
      setBatchModalOpen(false); setBatchProduct(null); setBatches([]); setSelectedBatchId(null); setBatchQuantity(1);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to reserve batch');
    }
  }

  /* ---------- Quantity change: update reservation if present ---------- */
  async function setQuantity(lineId: string, q: number) {
    const qty = Math.max(1, Math.floor(q));
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;
    // if line has reservation_id, update reservation on server
    if (line.reservation_id) {
      try {
        const r = await updateReservation(line.reservation_id, qty);
        dispatch({ type: 'UPDATE_LINE', lineId, patch: { quantity: qty, reservation_expires_at: r.expires_at } });
      } catch (err: any) {
        setMessage(err?.message || 'Failed to update reservation');
        return;
      }
    } else {
      // no reservation: try to reserve now for new qty
      try {
        const r = await reserveBatch(line.product_id, line.batch_id ?? null, qty);
        dispatch({ type: 'UPDATE_LINE', lineId, patch: { quantity: qty, reservation_id: r.reservation_id, reservation_expires_at: r.expires_at } });
      } catch (err: any) {
        setMessage(err?.message || 'Failed to reserve for new quantity');
        return;
      }
    }
  }

  /* ---------- Remove line: release reservation if present ---------- */
  async function removeLine(lineId: string) {
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;
    if (line.reservation_id) {
      await releaseReservation(line.reservation_id);
    }
    dispatch({ type: 'REMOVE_LINE', lineId });
  }

  /* ---------- Auto-release all reservations on unload (best-effort) ---------- */
  useEffect(() => {
    async function handleBeforeUnload() {
      for (const l of cart) {
        if (l.reservation_id) {
          try { await releaseReservation(l.reservation_id); } catch (e) { /* ignore */ }
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart]);

  /* ---------- Stock pre-check remains as guard before final submit ---------- */
  async function validateStockBeforeSubmit(): Promise<{ ok: boolean; problems?: string[] }> {
    const unique = cart.reduce((acc: { product_id: string; batch_id?: string | null }[], l) => {
      const key = `${l.product_id}::${l.batch_id ?? 'DEFAULT'}`;
      if (!acc.find((x) => `${x.product_id}::${x.batch_id ?? 'DEFAULT'}` === key)) acc.push({ product_id: l.product_id, batch_id: l.batch_id });
      return acc;
    }, []);

    const problems: string[] = [];
    for (const u of unique) {
      try {
        const params = new URLSearchParams(); params.set('product_id', u.product_id); if (u.batch_id) params.set('batch_id', u.batch_id);
        const res = await fetch(`/api/hms/stock?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) { problems.push(`Failed to verify stock for product ${u.product_id}`); continue; }
        const json = await res.json();
        const available = json?.data?.available_qty ?? json?.available_qty ?? null;
        const requested = cart.filter((l) => l.product_id === u.product_id && (l.batch_id ?? null) === (u.batch_id ?? null)).reduce((s, x) => s + x.quantity, 0);
        if (available === null) continue;
        if (requested > available) problems.push(`Not enough stock for product ${u.product_id} (requested ${requested}, available ${available})`);
      } catch (err) { console.error(err); problems.push(`Error checking stock for product ${u.product_id}`); }
    }
    return { ok: problems.length === 0, problems: problems.length ? problems : undefined };
  }

  /* ---------- Submit sale: finalize reserved lines. On success reservations should be consumed by backend. On failure, reservations remain but we leave them (or optionally release) ---------- */
  async function submitSale() {
    setMessage(null);
    if (!tenantId || !companyId || !createdBy || !locationId) { setMessage('Missing tenant/company/user/location. Set them in header.'); return; }
    if (!cart.length) { setMessage('Cart empty'); return; }

    setLoading(true);

    const check = await validateStockBeforeSubmit();
    if (!check.ok) { setMessage((check.problems || []).join('; ')); setLoading(false); return; }

    const idempotencyKey = `${companyId}|${locationId}|pos|${uuidv4()}`;
    const payload = {
      tenant_id: tenantId, company_id: companyId, created_by: createdBy, patient_id: patientId || null, location_id: locationId,
      items: cart.map((c) => ({ product_id: c.product_id, batch_id: c.batch_id || null, quantity: c.quantity, unit_price: c.unit_price, discount_amount: c.discount_amount || 0, tax_rate: c.tax_rate || 0, reservation_id: c.reservation_id || null })),
      payment: { amount: Number(cart.reduce((s, l) => s + l.unit_price * l.quantity, 0).toFixed(2)), method: 'cash', reference: `POS-${Date.now()}` },
    };

    try {
      const res = await fetch('/api/hms/pharmacy/billing/fulfill', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({ error: 'invalid_json' }));
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      const inv = json.data?.invoice_number || json.invoice_number || null;
      setMessage(`Invoice created: ${inv ?? 'OK'}`);
      // Clear cart on success
      dispatch({ type: 'CLEAR' });
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }

  /* ---------- UI Rendering (Neural Glass) ---------- */
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.quantity - (l.discount_amount || 0), 0), [cart]);
  const tax = useMemo(() => cart.reduce((s, l) => s + ((l.tax_rate || 0) / 100) * (l.unit_price * l.quantity - (l.discount_amount || 0)), 0), [cart]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white/60 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl p-3 bg-white/60 backdrop-blur-md shadow-sm border border-white/30">
              <h1 className="text-2xl font-semibold leading-none">Pharmacy POS</h1>
              <div className="text-sm text-slate-500">Neural Glass • Billing — Auto-reserve enabled</div>
            </div>

            <div className="flex gap-2 items-center">
              <input placeholder="Tenant UUID" className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
              <input placeholder="Company UUID" className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
              <input placeholder="User UUID" className="input" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
              <input placeholder="Location UUID" className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">Total</div>
            <div className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold">₹ {currency(total)}</div>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          <section className="col-span-7 bg-white/50 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/30">
            <div className="mb-3">
              <label className="block text-sm text-slate-600 mb-1">Search product or SKU — press / to focus</label>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 bg-white/60" placeholder="Scan or type (Enter to add)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 ? (
                <div className="col-span-2 text-slate-400 p-6">No products. Start typing or scan SKU.</div>
              ) : (
                products.map((p) => (
                  <motion.div whileHover={{ y: -2 }} key={p.id} className="rounded-lg p-3 bg-white/80 border border-white/20 shadow-sm flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.sku || '—'} • ₹ {p.price ?? 0}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => handleAddClick(p)} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-sm">Add</button>
                      <div className="text-xs text-slate-400">Stock: {p.stock ?? '—'}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          <aside className="col-span-5 bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/30 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Cart</h2>
              <div className="text-sm text-slate-500">Lines: {cart.length}</div>
            </div>

            <div className="space-y-2 flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="text-slate-400 p-4">Cart empty — add items from the left.</div>
              ) : (
                cart.map((line) => (
                  <div key={line.id} className="rounded-lg p-3 bg-white border border-white/20 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{line.name}</div>
                      <div className="text-xs text-slate-500">SKU: {line.sku}</div>
                      <div className="text-xs text-slate-400">Batch: {line.batch_id ?? 'auto'}</div>
                      {line.reservation_id && <div className="text-xs text-emerald-600">Reserved • Expires: {line.reservation_expires_at ? new Date(line.reservation_expires_at).toLocaleTimeString() : '—'}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <button onClick={() => setQuantity(line.id, Math.max(1, line.quantity - 1))} className="px-3 py-2">−</button>
                        <input type="number" className="w-20 p-2 text-center" value={line.quantity} onChange={(e) => setQuantity(line.id, Number(e.target.value || 1))} />
                        <button onClick={() => setQuantity(line.id, line.quantity + 1)} className="px-3 py-2">+</button>
                      </div>

                      <div className="text-sm">₹ {currency(line.unit_price * line.quantity)}</div>
                      <button className="px-2 py-1 text-sm text-red-600" onClick={() => removeLine(line.id)}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="flex justify-between mb-2"><div className="text-sm text-slate-500">Subtotal</div><div className="font-medium">₹ {currency(subtotal)}</div></div>
              <div className="flex justify-between mb-3"><div className="text-sm text-slate-500">Tax</div><div className="font-medium">₹ {currency(tax)}</div></div>

              <div className="flex gap-2">
                <button onClick={() => dispatch({ type: 'CLEAR' })} className="flex-1 px-4 py-2 rounded-lg border">Clear</button>
                <button onClick={() => submitSale()} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white">Pay ₹ {currency(total)}</button>
              </div>

              {message && <div className="mt-3 text-sm text-red-600">{message}</div>}
            </div>
          </aside>
        </main>

        {/* Batch selection modal */}
        {batchModalOpen && batchProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setBatchModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-lg p-6 bg-white/95 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Select batch for {batchProduct.name}</h3>
              <div className="mb-3 text-sm text-slate-600">Choose a batch — expiry & available qty shown.</div>

              <div className="space-y-2 max-h-60 overflow-auto mb-3">
                {batches.length === 0 ? (
                  <div className="text-slate-400 p-3">No batches found for this product.</div>
                ) : (
                  batches.map((b) => (
                    <label key={b.id} className={`flex items-center justify-between p-3 rounded-lg border ${selectedBatchId === b.id ? 'border-indigo-500 bg-indigo-50' : 'bg-white'}`}>
                      <div>
                        <div className="font-medium">{b.batch_number}</div>
                        <div className="text-xs text-slate-500">Expiry: {b.expiry ? new Date(b.expiry).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">Available: {b.available_qty}</div>
                        <input type="radio" name="batch" checked={selectedBatchId === b.id} onChange={() => { setSelectedBatchId(b.id); setBatchQuantity(1); }} />
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-500">Quantity</label>
                  <input type="number" min={1} value={batchQuantity} onChange={(e) => setBatchQuantity(Math.max(1, Number(e.target.value || 1)))} className="w-full p-3 rounded-md border" />
                </div>
                <div className="flex-none mt-6">
                  <button onClick={() => { setBatchModalOpen(false); }} className="px-4 py-2 rounded-lg border">Cancel</button>
                </div>
                <div className="flex-none mt-6">
                  <button onClick={() => confirmAddFromBatch()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Reserve & Add</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>

      <style jsx>{`
        .input { padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(15,23,42,0.06); background: rgba(255,255,255,0.7); }
      `}</style>
    </div>
  );
}
