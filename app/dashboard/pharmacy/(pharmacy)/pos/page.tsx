import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";

// Next.js page component — Pharmacy POS
// Neural Glass Design Language applied with Tailwind utility classes.
// Drop into: app/(pharmacy)/pos/page.tsx  OR pages/pharmacy/pos.tsx depending on your Next.js setup.

export default function PharmacyPOSPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  // fetch product suggestions. (simple search endpoint)
  useEffect(() => {
    if (!query) return setProducts([]);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hms/products?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setProducts(json?.data || []);
      } catch (err) {
        console.error(err);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + (l.unit_price * l.quantity - (l.discount_amount || 0)), 0), [cart]);
  const tax = useMemo(() => cart.reduce((s, l) => s + ((l.tax_rate || 0)/100) * (l.unit_price * l.quantity - (l.discount_amount||0)), 0), [cart]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  function addToCart(product: any) {
    const existing = cart.find(c => c.product_id === product.id && (c.batch_id || null) === (product.default_batch_id || null));
    if (existing) {
      setCart(cart.map(c => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        product_id: product.id,
        batch_id: product.default_batch_id || null,
        quantity: 1,
        unit_price: product.price || 0,
        discount_amount: 0,
        tax_rate: product.tax_rate || 0,
        name: product.name,
        sku: product.sku
      }]);
    }
  }

  function updateLine(idx: number, patch: Partial<any>) {
    setCart(cart.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }

  async function submitSale() {
    if (!tenantId || !companyId || !createdBy || !locationId) {
      setMessage('Missing tenant/company/user/location — set those values in the top-right');
      return;
    }
    if (cart.length === 0) return setMessage('Cart empty');

    const idempotencyKey = `${companyId}|${locationId}|pos|${uuidv4()}`;
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        tenant_id: tenantId,
        company_id: companyId,
        created_by: createdBy,
        patient_id: patientId || null,
        location_id: locationId,
        items: cart.map(c => ({ product_id: c.product_id, batch_id: c.batch_id, quantity: c.quantity, unit_price: c.unit_price, discount_amount: c.discount_amount, tax_rate: c.tax_rate })),
        payment: { amount: Number((total).toFixed(2)), method: 'cash', reference: `POS-${Date.now()}` }
      };

      const res = await fetch('/api/hms/pharmacy/billing/fulfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'failed');

      setMessage(`Invoice created: ${json.data.invoice_number}`);
      setCart([]);
      setShowPayment(false);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }

  // small header controls for tenant/company/location (quick dev convenience)
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
              <input placeholder="Tenant UUID" className="input" value={tenantId||''} onChange={e=>setTenantId(e.target.value)} />
              <input placeholder="Company UUID" className="input" value={companyId||''} onChange={e=>setCompanyId(e.target.value)} />
              <input placeholder="User UUID" className="input" value={createdBy||''} onChange={e=>setCreatedBy(e.target.value)} />
              <input placeholder="Location UUID" className="input" value={locationId||''} onChange={e=>setLocationId(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">Total</div>
            <div className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold">₹ {total.toFixed(2)}</div>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-6">
          {/* left: product search + suggestions */}
          <section className="col-span-7 bg-white/50 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/30">
            <div className="mb-3">
              <label className="block text-sm text-slate-600 mb-1">Search product or SKU</label>
              <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 bg-white/60" placeholder="Search e.g. Paracetamol" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {products.length === 0 ? (
                <div className="col-span-2 text-slate-400 p-6">No products. Start typing to search.</div>
              ) : products.map(p => (
                <motion.div whileHover={{ y: -2 }} key={p.id} className="rounded-lg p-3 bg-white/80 border border-white/20 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.sku} • ₹ {p.price}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => addToCart(p)} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-sm">Add</button>
                    <div className="text-xs text-slate-400">Stock: {p.stock ?? '—'}</div>
                  </div>
                </motion.div>
              ))}
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
              ) : cart.map((line, idx) => (
                <div key={idx} className="rounded-lg p-3 bg-white border border-white/20 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{line.name}</div>
                    <div className="text-xs text-slate-500">SKU: {line.sku}</div>
                    <div className="text-xs text-slate-400">Batch: {line.batch_id ?? 'auto'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-20 p-2 rounded-md border" value={line.quantity} onChange={e => updateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })} />
                    <div className="text-sm">₹ {(line.unit_price * line.quantity).toFixed(2)}</div>
                    <button className="px-2 py-1 text-sm text-red-600" onClick={() => setCart(cart.filter((_,i)=>i!==idx))}>Remove</button>
                  </div>
                </div>
              ))}
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
                <button onClick={() => setCart([])} className="flex-1 px-4 py-2 rounded-lg border">Clear</button>
                <button onClick={() => { setShowPayment(true); setPaymentAmount(Number(total.toFixed(2))); }} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white">Pay ₹ {total.toFixed(2)}</button>
              </div>

              {message && (<div className="mt-3 text-sm text-red-600">{message}</div>)}
            </div>
          </aside>
        </main>

        {/* Payment modal (simple) */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowPayment(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-md p-6 bg-white/90 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Payment</h3>
              <div className="mb-3 text-sm text-slate-600">Amount due: ₹ {total.toFixed(2)}</div>

              <div className="space-y-2">
                <label className="block text-sm text-slate-500">Amount</label>
                <input type="number" value={paymentAmount ?? total} onChange={e=>setPaymentAmount(Number(e.target.value))} className="w-full p-3 rounded-md border" />
                <label className="block text-sm text-slate-500">Method</label>
                <select className="w-full p-3 rounded-md border">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-4 py-2 rounded-lg border" onClick={()=>setShowPayment(false)}>Cancel</button>
                <button className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white" onClick={async ()=>{ await submitSale(); }}>Confirm & Pay</button>
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
