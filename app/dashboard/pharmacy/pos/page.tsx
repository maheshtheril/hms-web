"use client";

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import PatientDoctorSelector from "@/components/PatientDoctorSelector";
import PrescriptionUploader, { PrescriptionLine, PrescriptionPayload } from "@/components/PrescriptionUploader";

/* ----- Types ----- */
type Product = { id: string; name: string; sku?: string; price?: number; tax_rate?: number; default_batch_id?: string | null; stock?: number | null; has_multiple_batches?: boolean; };
type Batch = { id: string; batch_number: string; expiry?: string | null; available_qty: number; };
type CartLine = { id: string; product_id: string; batch_id?: string | null; quantity: number; unit_price: number; discount_amount?: number; tax_rate?: number; name?: string; sku?: string; reservation_id?: string | null; reservation_expires_at?: string | null; prescription_line_id?: string | null };

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
    case "ADD_LINE": {
      const ex = state.cart.find(
        (l) =>
          l.product_id === action.line.product_id &&
          (l.batch_id ?? null) === (action.line.batch_id ?? null) &&
          l.reservation_id === action.line.reservation_id
      );
      if (ex) {
        return { cart: state.cart.map((l) => (l.id === ex.id ? { ...l, quantity: l.quantity + action.line.quantity } : l)) };
      }
      return { cart: [...state.cart, action.line] };
    }
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

function currency(n: number) { return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ----- Main component ----- */
export default function PharmacyPOSWithReserve(): JSX.Element {
  const [tenantId, setTenantId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [locationId, setLocationId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [state, dispatch] = useReducer(cartReducer, { cart: [] });
  const { cart } = state;

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);

  const [loadedPrescription, setLoadedPrescription] = useState<PrescriptionPayload | null>(null);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const key = "pos_cart_with_reservations_v1";
    const raw = localStorage.getItem(key);
    if (raw) { try { const parsed: CartLine[] = JSON.parse(raw); if (Array.isArray(parsed)) dispatch({ type: "SET_CART", cart: parsed }); } catch {} }
  }, []);

  useEffect(() => { localStorage.setItem("pos_cart_with_reservations_v1", JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    if (!query || query.trim() === "") { setProducts([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hms/products?q=${encodeURIComponent(query)}`, { credentials: "include" });
        if (!res.ok) { setProducts([]); return; }
        const json = await res.json();
        setProducts(json?.data || []);
      } catch (err) { console.error(err); setProducts([]); }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  async function reserveBatch(product_id: string, batch_id: string | null, quantity: number, prescription_line_id?: string | null) {
    try {
      const idempotencyKey = `${companyId}|${locationId}|reserve|${uuidv4()}`;
      const body: any = { product_id, batch_id, quantity, location_id: locationId };
      if (patientId) body.patient_id = patientId;
      if (prescription_line_id) body.prescription_line_id = prescription_line_id;
      const res = await fetch(`/api/hms/reserve`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      return { reservation_id: json?.data?.reservation_id || json?.reservation_id, expires_at: json?.data?.expires_at || json?.expires_at };
    } catch (err) { console.error("reserve error", err); throw err; }
  }

  async function releaseReservation(reservation_id: string) {
    try { await fetch(`/api/hms/reserve/${encodeURIComponent(reservation_id)}/release`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } }); } catch (err) { console.warn("failed to release reservation", reservation_id, err); }
  }

  async function updateReservation(reservation_id: string, quantity: number) {
    try {
      const res = await fetch(`/api/hms/reserve/${encodeURIComponent(reservation_id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      return { reservation_id: json?.data?.reservation_id || json?.reservation_id, expires_at: json?.data?.expires_at || json?.expires_at };
    } catch (err) { console.error("update reservation failed", err); throw err; }
  }

  async function handleAddClick(p: Product) {
    setMessage(null);
    if (p.has_multiple_batches) {
      setBatchProduct(p); setBatchModalOpen(true); setSelectedBatchId(null); setBatchQuantity(1);
      try {
        const res = await fetch(`/api/hms/products/${encodeURIComponent(p.id)}/batches`, { credentials: "include" });
        if (!res.ok) { setMessage("Failed to load batches"); setBatches([]); return; }
        const json = await res.json();
        setBatches(json?.data || []);
      } catch (err) { console.error(err); setBatches([]); }
      return;
    }
    try {
      const r = await reserveBatch(p.id, p.default_batch_id ?? null, 1, null);
      dispatch({ type: "ADD_LINE", line: { id: uuidv4(), product_id: p.id, batch_id: p.default_batch_id ?? null, quantity: 1, unit_price: p.price ?? 0, discount_amount: 0, tax_rate: p.tax_rate ?? 0, name: p.name, sku: p.sku, reservation_id: r.reservation_id, reservation_expires_at: r.expires_at } });
    } catch (err: any) { setMessage(err?.message || "Failed to reserve item"); }
  }

  async function confirmAddFromBatch() {
    if (!batchProduct) return;
    const chosen = batches.find((b) => b.id === selectedBatchId) ?? null;
    const avail = chosen?.available_qty ?? 0;
    if (batchQuantity <= 0) { setMessage("Quantity must be at least 1"); return; }
    if (batchQuantity > avail) { setMessage(`Insufficient stock. Available: ${avail}`); return; }
    try {
      const r = await reserveBatch(batchProduct.id, chosen?.id ?? null, batchQuantity, null);
      dispatch({ type: "ADD_LINE", line: { id: uuidv4(), product_id: batchProduct.id, batch_id: chosen?.id ?? null, quantity: batchQuantity, unit_price: batchProduct.price ?? 0, discount_amount: 0, tax_rate: batchProduct.tax_rate ?? 0, name: batchProduct.name, sku: batchProduct.sku, reservation_id: r.reservation_id, reservation_expires_at: r.expires_at } });
      setBatchModalOpen(false);
    } catch (err: any) { setMessage(err?.message || "Failed to reserve batch"); }
  }

  async function setQuantity(lineId: string, q: number) {
    const qty = Math.max(1, Math.floor(q));
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;
    if (line.reservation_id) {
      try { const r = await updateReservation(line.reservation_id, qty); dispatch({ type: "UPDATE_LINE", lineId, patch: { quantity: qty, reservation_expires_at: r.expires_at } }); }
      catch (err: any) { setMessage(err?.message || "Failed to update reservation"); }
    } else {
      try { const r = await reserveBatch(line.product_id, line.batch_id ?? null, qty, line.prescription_line_id ?? null); dispatch({ type: "UPDATE_LINE", lineId, patch: { quantity: qty, reservation_id: r.reservation_id, reservation_expires_at: r.expires_at } }); }
      catch (err: any) { setMessage(err?.message || "Failed to reserve for new quantity"); }
    }
  }

  async function removeLine(lineId: string) {
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;
    if (line.reservation_id) await releaseReservation(line.reservation_id);
    dispatch({ type: "REMOVE_LINE", lineId });
  }

  useEffect(() => {
    async function handleBeforeUnload() {
      for (const l of cart) { if (l.reservation_id) { try { await releaseReservation(l.reservation_id); } catch (e) {} } }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart]);

  async function validateStockBeforeSubmit(): Promise<{ ok: boolean; problems?: string[] }> {
    const unique = cart.reduce((acc: { product_id: string; batch_id?: string | null }[], l) => {
      const key = `${l.product_id}::${l.batch_id ?? "DEFAULT"}`;
      if (!acc.find((x) => `${x.product_id}::${x.batch_id ?? "DEFAULT"}` === key)) acc.push({ product_id: l.product_id, batch_id: l.batch_id });
      return acc;
    }, []);
    const problems: string[] = [];
    for (const u of unique) {
      try {
        const params = new URLSearchParams(); params.set("product_id", u.product_id); if (u.batch_id) params.set("batch_id", u.batch_id);
        const res = await fetch(`/api/hms/stock?${params.toString()}`, { credentials: "include" });
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

  async function submitSale() {
    setMessage(null);
    if (!tenantId || !companyId || !createdBy || !locationId) { setMessage("Missing tenant/company/user/location."); return; }
    if (!patientId) { setMessage("Patient is required for billing. Select or load from a prescription."); return; }
    if (!cart.length) { setMessage("Cart empty"); return; }

    setSubmitting(true);
    const check = await validateStockBeforeSubmit();
    if (!check.ok) { setMessage((check.problems || []).join("; ")); setSubmitting(false); return; }

    const idempotencyKey = `${companyId}|${locationId}|pos|${uuidv4()}`;
    const payload = {
      tenant_id: tenantId, company_id: companyId, created_by: createdBy, patient_id: patientId, doctor_id: doctorId || null, location_id: locationId,
      items: cart.map((c) => ({ product_id: c.product_id, batch_id: c.batch_id || null, quantity: c.quantity, unit_price: c.unit_price, discount_amount: c.discount_amount ?? 0, tax_rate: c.tax_rate ?? 0, reservation_id: c.reservation_id ?? null, prescription_line_id: c.prescription_line_id ?? null })),
      payment: { amount: Number(cart.reduce((s, l) => s + l.unit_price * l.quantity, 0).toFixed(2)), method: "cash", reference: `POS-${Date.now()}` },
    };

    try {
      const res = await fetch("/api/hms/pharmacy/billing/fulfill", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
      const inv = json.data?.invoice_number || json.invoice_number || null;
      setMessage(`Invoice created: ${inv ?? "OK"}`);
      dispatch({ type: "CLEAR" });
      setLoadedPrescription(null);
    } catch (err: any) { console.error(err); setMessage(err?.message || "Failed to create invoice"); } finally { setSubmitting(false); }
  }

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.quantity - (l.discount_amount || 0), 0), [cart]);
  const tax = useMemo(() => cart.reduce((s, l) => s + ((l.tax_rate || 0) / 100) * (l.unit_price * l.quantity - (l.discount_amount || 0)), 0), [cart]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  async function addPrescriptionLines(lines: PrescriptionLine[]) {
    setMessage(null);
    if (!lines.length) { setMessage("No lines selected"); return; }
    for (const ln of lines) {
      try {
        let productId: string | null = null;
        if (ln.suggested_product_ids && ln.suggested_product_ids.length) productId = ln.suggested_product_ids[0];
        if (!productId) {
          const norm = await fetch(`/api/hms/medications/normalize?q=${encodeURIComponent(ln.product_name)}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (norm && Array.isArray(norm?.data) && norm.data.length) productId = norm.data[0].product_id || norm.data[0].id || null;
        }
        if (!productId) {
          const search = await fetch(`/api/hms/products?q=${encodeURIComponent(ln.product_name)}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (search && Array.isArray(search?.data) && search.data.length) productId = search.data[0].id;
        }
        if (!productId) {
          dispatch({ type: "ADD_LINE", line: { id: uuidv4(), product_id: `__unmapped__:${ln.product_name}:${Date.now()}`, batch_id: null, quantity: ln.qty ?? 1, unit_price: 0, discount_amount: 0, tax_rate: 0, name: ln.product_name, sku: undefined, reservation_id: null, reservation_expires_at: null, prescription_line_id: ln.id ?? null } });
          continue;
        }
        const prodResp = await fetch(`/api/hms/products/${encodeURIComponent(productId)}`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
        const prod = prodResp?.data || prodResp || null;
        const defaultBatch = prod?.default_batch_id ?? null;
        const unitPrice = prod?.price ?? 0;
        const reserveResp = await reserveBatch(productId, defaultBatch, ln.qty ?? 1, ln.id ?? null);
        dispatch({ type: "ADD_LINE", line: { id: uuidv4(), product_id: productId, batch_id: defaultBatch, quantity: ln.qty ?? 1, unit_price: unitPrice, discount_amount: 0, tax_rate: prod?.tax_rate ?? 0, name: prod?.name ?? ln.product_name, sku: prod?.sku, reservation_id: reserveResp.reservation_id, reservation_expires_at: reserveResp.expires_at, prescription_line_id: ln.id ?? null } });
      } catch (err: any) { console.warn("failed to add prescription line", ln, err); setMessage((err?.message || "Failed to add some prescription lines") + ""); }
    }
    setPrescriptionModalOpen(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900/20 to-slate-800/30 p-6 text-slate-100">
      <div className="max-w-7xl mx-auto">
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
            <div className="px-4 py-2 rounded-xl bg-slate-900/40 backdrop-blur-md shadow-md font-semibold text-white">₹ {currency(total)}</div>
          </div>
        </header>

        <div className="mb-4 flex items-start justify-between gap-6">
          <div>
            <PatientDoctorSelector patientId={patientId || undefined} doctorId={doctorId || undefined} onPatientChange={(id) => setPatientId(id ?? "")} onDoctorChange={(id) => setDoctorId(id ?? "")} />
            <div className="text-xs text-slate-400 mt-2">Tip: load prescription ID to auto-fill patient & doctor from hospital record.</div>
          </div>

          <div className="flex flex-col gap-2">
            <PrescriptionUploader onPrescriptionLoaded={(p) => {
              if (!p) { setMessage("Prescription not found or failed to parse"); return; }
              if (p.patient_id) setPatientId(p.patient_id);
              if (!p.patient_id && p.patient_name) {
                fetch(`/api/hms/patients?q=${encodeURIComponent(p.patient_name)}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then((j) => { const hit = j?.data?.[0]; if (hit) setPatientId(hit.id); else setMessage("Patient not found — create or select manually."); }).catch(() => {});
              }
              if (p.doctor_id) setDoctorId(p.doctor_id);
              if (!p.doctor_id && p.doctor_name) {
                fetch(`/api/hms/doctors?q=${encodeURIComponent(p.doctor_name)}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then((j) => { const hit = j?.data?.[0]; if (hit) setDoctorId(hit.id); }).catch(() => {});
              }
              setLoadedPrescription(p); setPrescriptionModalOpen(true);
            }} />
          </div>
        </div>

        <main className="grid grid-cols-12 gap-6">
          <section className="col-span-7 bg-slate-900/25 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-700/30">
            <div className="mb-3">
              <label className="block text-sm text-slate-300 mb-1">Search product or SKU — press / to focus</label>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full p-3 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-100" placeholder="Scan or type (Enter to add)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 ? <div className="col-span-2 text-slate-500 p-6">No products. Start typing or scan SKU.</div> : products.map((p) => (
                <motion.div whileHover={{ y: -2 }} key={p.id} className="rounded-lg p-3 bg-slate-900/30 border border-slate-700/20 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.sku || "—"} • ₹ {p.price ?? 0}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => handleAddClick(p)} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-sm">Add</button>
                    <div className="text-xs text-slate-400">Stock: {p.stock ?? "—"}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <aside className="col-span-5 bg-slate-900/25 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-700/30 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Cart</h2>
              <div className="text-sm text-slate-400">Lines: {cart.length}</div>
            </div>

            <div className="space-y-2 flex-1 overflow-auto">
              {cart.length === 0 ? <div className="text-slate-500 p-4">Cart empty — add items from the left.</div> : cart.map((line) => (
                <div key={line.id} className="rounded-lg p-3 bg-slate-900/30 border border-slate-700/20 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{line.name}</div>
                    <div className="text-xs text-slate-400">SKU: {line.sku}</div>
                    <div className="text-xs text-slate-500">Batch: {line.batch_id ?? "auto"}</div>
                    {line.prescription_line_id && <div className="text-xs text-amber-300">From prescription</div>}
                    {line.reservation_id && <div className="text-xs text-emerald-400">Reserved • Expires: {line.reservation_expires_at ? new Date(line.reservation_expires_at).toLocaleTimeString() : "—"}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-700 rounded-md overflow-hidden">
                      <button onClick={() => setQuantity(line.id, Math.max(1, line.quantity - 1))} className="px-3 py-2 text-white">−</button>
                      <input type="number" className="w-20 p-2 text-center bg-slate-800 border-slate-700 text-slate-100" value={line.quantity} onChange={(e) => setQuantity(line.id, Number(e.target.value || 1))} />
                      <button onClick={() => setQuantity(line.id, line.quantity + 1)} className="px-3 py-2 text-white">+</button>
                    </div>

                    <div className="text-sm text-white">₹ {currency(line.unit_price * line.quantity)}</div>
                    <button className="px-2 py-1 text-sm text-red-400" onClick={() => removeLine(line.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-700 pt-3">
              <div className="flex justify-between mb-2"><div className="text-sm text-slate-400">Subtotal</div><div className="font-medium text-slate-100">₹ {currency(subtotal)}</div></div>
              <div className="flex justify-between mb-3"><div className="text-sm text-slate-400">Tax</div><div className="font-medium text-slate-100">₹ {currency(tax)}</div></div>

              <div className="flex gap-2">
                <button onClick={() => dispatch({ type: "CLEAR" })} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-200">Clear</button>
                <button onClick={submitSale} disabled={submitting} className={`flex-1 px-4 py-2 rounded-lg ${submitting ? "bg-green-400/60" : "bg-green-600"} text-white`}>{submitting ? "Processing…" : `Pay ₹ ${currency(total)}`}</button>
              </div>

              {message && <div className="mt-3 text-sm text-red-400">{message}</div>}
            </div>
          </aside>
        </main>

        {batchModalOpen && batchProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBatchModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-lg p-6 bg-slate-900/95 text-slate-100 rounded-2xl backdrop-blur-md border border-slate-700/20 shadow-xl">
              <h3 className="text-lg font-semibold mb-2 text-white">Select batch for {batchProduct.name}</h3>
              <div className="mb-3 text-sm text-slate-300">Choose a batch — expiry & available qty shown.</div>
              <div className="space-y-2 max-h-60 overflow-auto mb-3">
                {batches.length === 0 ? <div className="text-slate-500 p-3">No batches found.</div> : batches.map((b) => (
                  <label key={b.id} className={`flex items-center justify-between p-3 rounded-lg border ${selectedBatchId === b.id ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 bg-slate-800/40"}`}>
                    <div>
                      <div className="font-medium text-white">{b.batch_number}</div>
                      <div className="text-xs text-slate-400">Expiry: {b.expiry ? new Date(b.expiry).toLocaleDateString() : "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-200">Available: {b.available_qty}</div>
                      <input type="radio" name="batch" checked={selectedBatchId === b.id} onChange={() => { setSelectedBatchId(b.id); setBatchQuantity(1); }} />
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-300">Quantity</label>
                  <input type="number" min={1} value={batchQuantity} onChange={(e) => setBatchQuantity(Math.max(1, Number(e.target.value || 1)))} className="w-full p-3 rounded-md border border-slate-700 bg-slate-800 text-slate-100" />
                </div>
                <button onClick={() => setBatchModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 mt-6">Cancel</button>
                <button onClick={confirmAddFromBatch} className="px-4 py-2 rounded-lg bg-indigo-600 text-white mt-6">Reserve & Add</button>
              </div>
            </motion.div>
          </div>
        )}

        {prescriptionModalOpen && loadedPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setPrescriptionModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-2xl p-6 bg-slate-900/95 text-slate-100 rounded-2xl backdrop-blur-md border border-slate-700/20 shadow-xl">
              <h3 className="text-lg font-semibold mb-2">Prescription: {loadedPrescription.id ?? "Uploaded"}</h3>
              <div className="mb-3 text-sm text-slate-300">Confirm lines to add (we will try to auto-map to products and reserve them under the selected patient).</div>
              <div className="max-h-80 overflow-auto mb-4">
                {(loadedPrescription.lines && loadedPrescription.lines.length > 0) ? loadedPrescription.lines.map((ln, idx) => (
                  <div key={idx} className="p-3 rounded-md bg-slate-800/40 mb-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{ln.product_name}</div>
                      <div className="text-xs text-slate-400">Qty: {ln.qty ?? "1"} {ln.note ? `• ${ln.note}` : ""}</div>
                    </div>
                    <div>
                      <button onClick={async () => { await addPrescriptionLines([ln]); }} className="px-3 py-1 rounded-md bg-indigo-600 text-white">Add</button>
                    </div>
                  </div>
                )) : <div className="text-slate-400 p-3">No lines parsed. You can still add items manually.</div>}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setPrescriptionModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-700 text-slate-200">Close</button>
                <button onClick={() => { if (loadedPrescription.lines && loadedPrescription.lines.length) { addPrescriptionLines(loadedPrescription.lines); } else setPrescriptionModalOpen(false); }} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Add All</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <style jsx>{`
        .ng-input { padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(15, 23, 42, 0.4); color: #f1f5f9; }
        .ng-input::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  );
}
