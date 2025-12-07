// web/app/dashboard/pharmacy/pos/PharmacyPOS.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";

/* Hooks (adjust paths if needed) */
import { usePOSCart } from "./posv2/hooks/usePOSCart";
import { usePOSProducts } from "./posv2/hooks/usePOSProducts";
import { usePOSReservations } from "./posv2/hooks/usePOSReservations";
import { usePOSPrescription } from "./posv2/hooks/usePOSPrescription";

/* UI components (adjust imports to your codebase) */
import PatientDoctorSelector from "@/components/PatientDoctorSelector";
import PrescriptionUploader, {
  PrescriptionLine,
  PrescriptionPayload,
} from "@/components/PrescriptionUploader";

/* Types (single source of truth) */
import type { ProductRecord, BatchRecord } from "./posv2/types"; // adjust path if needed

/* -----------------------------------------------------------------------------
   Helper: currency formatter
-----------------------------------------------------------------------------*/
const currency = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* -----------------------------------------------------------------------------
   Component
-----------------------------------------------------------------------------*/
export default function PharmacyPOS(): JSX.Element {
  /* ---------- session/context (populated by /api/me in your app) ---------- */
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [createdBy, setCreatedBy] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  /* ---------- patient/doctor ---------- */
  const [patientId, setPatientId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");

  /* ---------- search + UI state ---------- */
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const { searchProducts, getBatches: fetchBatches, getProduct } = usePOSProducts();

  /* ---------- cart + reservations + prescription hooks ---------- */
  const {
    cart,
    addLine,
    updateLine,
    setQuantity,
    removeLine,
    clear,
    subtotal,
    tax,
    total,
    loadFromStorage,
  } = usePOSCart();

  const { reserve, updateReservation, releaseReservation, reserving, error: reserveError } = usePOSReservations();
  const { loading: presLoading, error: presError, addPrescriptionLines } = usePOSPrescription();

  /* ---------- batch modal ---------- */
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProduct, setBatchProduct] = useState<ProductRecord | null>(null);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchQty, setBatchQty] = useState<number>(1);

  /* ---------- prescription modal ---------- */
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [loadedPrescription, setLoadedPrescription] = useState<PrescriptionPayload | null>(null);

  /* ---------- load session context (single endpoint) ---------- */
  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      setSessionLoading(true);
      setSessionError(null);
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `HTTP ${res.status}`);
        }
        const j = await res.json();
        if (!mounted) return;

        if (j.tenant_id) setTenantId(j.tenant_id);
        if (j.company_id) setCompanyId(j.company_id);
        if (j.user?.id) setCreatedBy(j.user.id);
        if (j.default_location_id) setLocationId(j.default_location_id);
        setCompanies(j.companies ?? []);
        setLocations(j.locations ?? []);
        setCurrentUserName(j.user?.name ?? null);

        if ((!j.locations || j.locations.length === 0) && j.company_id) {
          try {
            const lr = await fetch(`/api/hms/locations?company_id=${encodeURIComponent(j.company_id)}`, { credentials: "include" });
            if (lr.ok) {
              const lj = await lr.json();
              setLocations(lj?.data || []);
              if (!j.default_location_id && (lj?.data || []).length) setLocationId(lj.data[0].id);
            }
          } catch {}
        }
      } catch (err: any) {
        console.error("loadSession", err);
        setSessionError("Failed to load session. Please login again.");
      } finally {
        if (mounted) setSessionLoading(false);
      }
    }
    loadSession();
    return () => { mounted = false; };
  }, []);

  /* ---------- hydrate cart ---------- */
  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  /* ---------- keyboard shortcut: focus search on '/' ---------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && (document.activeElement as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- debounced search with AbortController ---------- */
  useEffect(() => {
    if (!query || query.trim() === "") {
      setProducts([]);
      return;
    }

    // cancel previous
    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    const t = setTimeout(async () => {
      try {
        const results = await searchProducts(query);
        if (!ac.signal.aborted) setProducts(results);
      } catch (err) {
        if (!ac.signal.aborted) {
          console.warn("product search error", err);
          setProducts([]);
        }
      }
    }, 220);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /* ---------- when product requires batch choose ---------- */
  async function onAddProduct(p: ProductRecord) {
    setMessage(null);
    if (p.has_multiple_batches) {
      setBatchProduct(p);
      setBatchModalOpen(true);
      setSelectedBatchId(null);
      setBatchQty(1);
      try {
        const b = await fetchBatches(p.id);
        setBatches(b);
      } catch (err) {
        console.warn("fetch batches", err);
        setBatches([]);
      }
      return;
    }

    try {
      const r = await reserve(p.id, p.default_batch_id ?? null, 1, { companyId, locationId, patientId });
      addLine({
        id: uuidv4(),
        product_id: p.id,
        batch_id: p.default_batch_id ?? null,
        name: p.name,
        sku: p.sku,
        unit_price: Number(p.price ?? 0),
        quantity: 1,
        discount_amount: 0,
        tax_rate: Number(p.tax_rate ?? 0),
        reservation_id: r.reservation_id ?? null,
        reservation_expires_at: r.expires_at ?? null,
        prescription_line_id: null,
      });
    } catch (err: any) {
      console.error("reserve failed", err);
      setMessage(err?.message || "Failed to reserve product — try again.");
    }
  }

  async function confirmAddFromBatch() {
    if (!batchProduct) return setMessage("No product selected.");
    const chosen = batches.find((b) => b.id === selectedBatchId);
    if (!chosen) return setMessage("Select a batch first.");
    if (batchQty < 1 || batchQty > chosen.available_qty) return setMessage(`Quantity must be between 1 and ${chosen.available_qty}`);

    try {
      const r = await reserve(batchProduct.id, chosen.id, batchQty, { companyId, locationId, patientId });
      addLine({
        id: uuidv4(),
        product_id: batchProduct.id,
        batch_id: chosen.id,
        name: batchProduct.name,
        sku: batchProduct.sku,
        unit_price: Number(batchProduct.price ?? 0),
        quantity: batchQty,
        discount_amount: 0,
        tax_rate: Number(batchProduct.tax_rate ?? 0),
        reservation_id: r.reservation_id ?? null,
        reservation_expires_at: r.expires_at ?? null,
        prescription_line_id: null,
      });
      setBatchModalOpen(false);
    } catch (err: any) {
      console.error("reserve batch failed", err);
      setMessage(err?.message || "Failed to reserve batch");
    }
  }

  /* ---------- cart line operations that sync reservations ---------- */
  async function changeQuantity(id: string, qty: number) {
    qty = Math.max(1, Math.floor(qty || 1));
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    try {
      const r = line.reservation_id
        ? await updateReservation(line.reservation_id, qty)
        : await reserve(line.product_id, line.batch_id ?? null, qty, { companyId, locationId, patientId }, line.prescription_line_id ?? null);
      updateLine(id, { quantity: qty, reservation_expires_at: r.expires_at ?? null, reservation_id: r.reservation_id ?? null });
    } catch (err: any) {
      console.warn("update reservation error", err);
      setMessage(err?.message || "Failed to update reservation");
    }
  }

  async function removeCartLine(id: string) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    if (line.reservation_id) {
      try { await releaseReservation(line.reservation_id); } catch { /* silent */ }
    }
    removeLine(id);
  }

  /* ---------- release all reservations on unload to avoid leaks ---------- */
  useEffect(() => {
    const fn = () => {
      for (const l of cart) {
        if (l.reservation_id) {
          // best-effort fire-and-forget
          navigator.sendBeacon
            ? navigator.sendBeacon(`/api/hms/reserve/${encodeURIComponent(l.reservation_id)}/release`)
            : void fetch(`/api/hms/reserve/${encodeURIComponent(l.reservation_id)}/release`, { method: "POST", keepalive: true }).catch(() => {});
        }
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [cart]);

  /* ---------- billing submit (idempotent) ---------- */
  async function submitSale() {
    setMessage(null);

    if (sessionLoading) return setMessage("Authenticating...");
    if (!tenantId || !companyId || !locationId || !createdBy) return setMessage("Missing org context — reopen session or contact admin.");
    if (!patientId) return setMessage("Select a patient for billing.");
    if (!cart.length) return setMessage("Cart empty.");

    setSubmitting(true);
    try {
      // quick server-side stock validation
      const unique = cart.reduce((acc: { product_id: string; batch_id?: string | null }[], l) => {
        const key = `${l.product_id}::${l.batch_id ?? "DEFAULT"}`;
        if (!acc.find((x) => `${x.product_id}::${x.batch_id ?? "DEFAULT"}` === key)) acc.push({ product_id: l.product_id, batch_id: l.batch_id ?? null });
        return acc;
      }, []);

      for (const u of unique) {
        const params = new URLSearchParams(); params.set("product_id", u.product_id); if (u.batch_id) params.set("batch_id", u.batch_id);
        const r = await fetch(`/api/hms/stock?${params.toString()}`, { credentials: "include" });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          const available = j?.data?.available_qty ?? null;
          const requested = cart.filter((c) => c.product_id === u.product_id && (c.batch_id ?? null) === (u.batch_id ?? null)).reduce((s, x) => s + x.quantity, 0);
          if (available !== null && requested > available) throw new Error(`Insufficient stock for ${u.product_id} (requested ${requested}, available ${available})`);
        }
      }

      const idempotencyKey = `pos|${companyId}|${locationId}|${uuidv4()}`;
      const payload = {
        tenant_id: tenantId,
        company_id: companyId,
        created_by: createdBy,
        patient_id: patientId,
        doctor_id: doctorId || null,
        location_id: locationId,
        items: cart.map((c) => ({
          product_id: c.product_id,
          batch_id: c.batch_id ?? null,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount_amount: c.discount_amount,
          tax_rate: c.tax_rate,
          reservation_id: c.reservation_id ?? null,
          prescription_line_id: c.prescription_line_id ?? null,
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
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);

      const invoiceNo = j.data?.invoice_number ?? j.invoice_number ?? "OK";
      setMessage(`Invoice created: ${invoiceNo}`);
      clear();
      setLoadedPrescription(null);
    } catch (err: any) {
      console.error("submitSale", err);
      setMessage(err?.message || "Billing failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- prescription mapping integration (adapter) ---------- */
  const addToCartAdapter = useCallback((payload: any) => {
    // normalize incoming payload to our cart shape
    addLine({
      id: payload.id,
      product_id: payload.product_id,
      batch_id: payload.batch_id ?? null,
      name: payload.name ?? "Unknown",
      sku: payload.sku,
      unit_price: Number(payload.unit_price ?? 0),
      quantity: Math.max(1, Math.floor(payload.quantity ?? 1)),
      discount_amount: Number(payload.discount_amount ?? 0),
      tax_rate: Number(payload.tax_rate ?? 0),
      reservation_id: payload.reservation_id ?? null,
      reservation_expires_at: payload.reservation_expires_at ?? null,
      prescription_line_id: payload.prescription_line_id ?? null,
    });
    // small UX: focus search after import
    searchRef.current?.focus();
  }, [addLine]);

  async function onPrescriptionLoaded(p: PrescriptionPayload | null) {
    if (!p) return setMessage("No prescription found");
    setLoadedPrescription(p);
    setPrescriptionModalOpen(true);
  }

  async function onPrescriptionConfirmAdd(lines: PrescriptionLine[]) {
    try {
      await addPrescriptionLines(lines, {
        patientId,
        companyId,
        locationId,
        reserve: async (productId, batchId, qty, reserveOpts, prescription_line_id) => {
          // wire into usePOSReservations reserve while preserving idempotency / opts
          return reserve(productId, batchId, qty, { companyId: reserveOpts.companyId, locationId: reserveOpts.locationId, patientId: reserveOpts.patientId ?? undefined }, prescription_line_id ?? null);
        },
      }, addToCartAdapter);
    } catch (err: any) {
      setMessage(err?.message || "Failed to add prescription lines");
    } finally {
      setPrescriptionModalOpen(false);
    }
  }

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900/40 to-slate-800/20 p-6 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl p-3 bg-slate-900/30 backdrop-blur-md border border-slate-700/40">
              <h1 className="text-2xl font-semibold">Pharmacy POS</h1>
              <div className="text-sm text-slate-300">Neural Glass • POS V2</div>
            </div>
            <div className="text-sm text-slate-300">User: <span className="font-medium text-white">{currentUserName ?? "—"}</span></div>
          </div>

          <div className="px-4 py-2 rounded-xl bg-slate-900/40 shadow-md font-semibold text-white">₹ {currency(total)}</div>
        </header>

        {/* top controls */}
        <div className="mb-4 flex items-start justify-between gap-6">
          <div>
            <PatientDoctorSelector
              patientId={patientId || undefined}
              doctorId={doctorId || undefined}
              onPatientChange={(id) => setPatientId(id ?? "")}
              onDoctorChange={(id) => setDoctorId(id ?? "")}
            />
            <div className="text-xs text-slate-400 mt-2">Tip: press / to focus search</div>
          </div>

          <div className="flex items-center gap-3">
            <PrescriptionUploader onPrescriptionLoaded={onPrescriptionLoaded} />
            <div className="text-sm text-slate-400">{sessionError ?? (reserveError ?? presError ?? message) ? <span className="text-red-400">{sessionError ?? reserveError ?? presError ?? message}</span> : null}</div>
          </div>
        </div>

        <main className="grid grid-cols-12 gap-6">
          {/* products */}
          <section className="col-span-7 bg-slate-900/25 rounded-2xl p-4 border border-slate-700/30">
            <label className="block text-sm text-slate-300 mb-1">Search product or SKU — press / to focus</label>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-100"
              placeholder="Scan or type (Enter to add)"
            />

            <div className="grid grid-cols-2 gap-3 mt-3">
              {products.length === 0 ? (
                <div className="col-span-2 text-slate-500 p-6">No products — start typing.</div>
              ) : (
                products.map((p) => (
                  <motion.div key={p.id} whileHover={{ y: -2 }} className="rounded-lg p-3 bg-slate-900/30 border border-slate-700/20 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.sku ?? "—"} • ₹ {p.price ?? 0}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => onAddProduct(p)} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-sm">Add</button>
                      <div className="text-xs text-slate-400">Stock: {p.stock ?? "—"}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* cart */}
          <aside className="col-span-5 bg-slate-900/25 rounded-2xl p-4 border border-slate-700/30 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Cart</h2>
              <div className="text-sm text-slate-400">Lines: {cart.length}</div>
            </div>

            <div className="space-y-2 flex-1 overflow-auto">
              {cart.length === 0 ? <div className="text-slate-500 p-4">Cart empty — add items from the left.</div> : cart.map((line) => (
                <div key={line.id} className="rounded-lg p-3 bg-slate-900/30 border border-slate-700/20 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{line.name}</div>
                    <div className="text-xs text-slate-400">SKU: {line.sku ?? "—"}</div>
                    <div className="text-xs text-slate-500">Batch: {line.batch_id ?? "auto"}</div>
                    {line.prescription_line_id && <div className="text-xs text-amber-300">From prescription</div>}
                    {line.reservation_id && <div className="text-xs text-emerald-400">Reserved • Expires: {line.reservation_expires_at ? new Date(line.reservation_expires_at).toLocaleTimeString() : "—"}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-700 rounded-md overflow-hidden">
                      <button className="px-3 py-2 text-white" onClick={() => changeQuantity(line.id, line.quantity - 1)}>−</button>
                      <input type="number" className="w-20 p-2 text-center bg-slate-800 border-slate-700 text-slate-100" value={line.quantity} onChange={(e) => changeQuantity(line.id, Number(e.target.value || 1))} />
                      <button className="px-3 py-2 text-white" onClick={() => changeQuantity(line.id, line.quantity + 1)}>+</button>
                    </div>

                    <div className="text-sm text-white">₹ {currency(line.unit_price * line.quantity)}</div>
                    <button className="px-2 py-1 text-sm text-red-400" onClick={() => removeCartLine(line.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-700 pt-3">
              <div className="flex justify-between mb-2"><div className="text-sm text-slate-400">Subtotal</div><div className="font-medium text-slate-100">₹ {currency(subtotal)}</div></div>
              <div className="flex justify-between mb-3"><div className="text-sm text-slate-400">Tax</div><div className="font-medium text-slate-100">₹ {currency(tax)}</div></div>

              <div className="flex gap-2">
                <button onClick={() => { clear(); setMessage(null); }} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-200">Clear</button>
                <button onClick={submitSale} disabled={submitting || sessionLoading} className={`flex-1 px-4 py-2 rounded-lg ${submitting ? "bg-green-400/60" : "bg-green-600"} text-white`}>{submitting ? "Processing…" : `Pay ₹ ${currency(total)}`}</button>
              </div>

              {message && <div className="mt-3 text-sm text-red-400">{message}</div>}
            </div>
          </aside>
        </main>

        {/* Batch modal */}
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
                      <input type="radio" name="batch" checked={selectedBatchId === b.id} onChange={() => { setSelectedBatchId(b.id); setBatchQty(1); }} />
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-300">Quantity</label>
                  <input type="number" min={1} value={batchQty} onChange={(e) => setBatchQty(Math.max(1, Number(e.target.value || 1)))} className="w-full p-3 rounded-md border border-slate-700 bg-slate-800 text-slate-100" />
                </div>
                <button onClick={() => setBatchModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 mt-6">Cancel</button>
                <button onClick={confirmAddFromBatch} className="px-4 py-2 rounded-lg bg-indigo-600 text-white mt-6">Reserve & Add</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Prescription modal */}
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
                      <button onClick={async () => { await onPrescriptionConfirmAdd([ln]); }} className="px-3 py-1 rounded-md bg-indigo-600 text-white">Add</button>
                    </div>
                  </div>
                )) : <div className="text-slate-400 p-3">No lines parsed. You can still add items manually.</div>}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setPrescriptionModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-700 text-slate-200">Close</button>
                <button onClick={() => { if (loadedPrescription.lines && loadedPrescription.lines.length) onPrescriptionConfirmAdd(loadedPrescription.lines); else setPrescriptionModalOpen(false); }} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Add All</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
