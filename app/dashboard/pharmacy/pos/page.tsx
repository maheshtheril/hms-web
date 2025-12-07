
"use client";

import React, {
  useEffect,
  useMemo,
  useReducer,
  useState,
  useRef,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { motion } from "framer-motion";
import PatientDoctorSelector from "@/components/PatientDoctorSelector";
import PrescriptionUploader, {
  PrescriptionLine,
  PrescriptionPayload,
} from "@/components/PrescriptionUploader";

/* -------------------------------------------------------------
   TYPES
------------------------------------------------------------- */

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
  prescription_line_id?: string | null;
};

type State = { cart: CartLine[] };

type Action =
  | { type: "ADD"; payload: CartLine }
  | { type: "PATCH"; id: string; patch: Partial<CartLine> }
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; payload: CartLine[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
      const match = state.cart.find(
        (l) =>
          l.product_id === action.payload.product_id &&
          (l.batch_id ?? null) === (action.payload.batch_id ?? null) &&
          l.prescription_line_id === action.payload.prescription_line_id
      );
      if (match) {
        return {
          cart: state.cart.map((l) =>
            l.id === match.id
              ? { ...l, quantity: l.quantity + action.payload.quantity }
              : l
          ),
        };
      }
      return { cart: [...state.cart, action.payload] };
    }

    case "PATCH":
      return {
        cart: state.cart.map((l) =>
          l.id === action.id ? { ...l, ...action.patch } : l
        ),
      };

    case "SET_QTY":
      return {
        cart: state.cart.map((l) =>
          l.id === action.id ? { ...l, quantity: action.qty } : l
        ),
      };

    case "REMOVE":
      return { cart: state.cart.filter((l) => l.id !== action.id) };

    case "CLEAR":
      return { cart: [] };

    case "HYDRATE":
      return { cart: action.payload };

    default:
      return state;
  }
}

const currency = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type MeResponse = {
  user?: { id: string; name?: string; email?: string };
  tenant_id?: string;
  company_id?: string;
  default_location_id?: string | null;
  companies?: { id: string; name: string }[];
  locations?: { id: string; name: string }[];
};

/* -------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------- */

export default function PharmacyPOS() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [tenantId, setTenant] = useState("");
  const [companyId, setCompany] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [locationId, setLocation] = useState("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [currentUserName, setUserName] = useState<string | null>(null);

  const [patientId, setPatient] = useState("");
  const [doctorId, setDoctor] = useState("");

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(reducer, { cart: [] });
  const { cart } = state;

  const [batchModalOpen, setBatchModal] = useState(false);
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setBatch] = useState<string | null>(null);
  const [batchQty, setBatchQty] = useState<number>(1);

  const [prescriptionModalOpen, setPrescriptionModal] = useState(false);
  const [loadedPrescription, setLoadedPrescription] =
    useState<PrescriptionPayload | null>(null);

  /* ---------------------------------------------------------
     LOAD SESSION (/api/me)
  ---------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function load() {
      setSessionLoading(true);
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || "session_fail");
        }
        const j: MeResponse = await r.json();
        if (!mounted) return;

        if (j.tenant_id) setTenant(j.tenant_id);
        if (j.company_id) setCompany(j.company_id);
        if (j.user?.id) setCreatedBy(j.user.id);
        if (j.default_location_id) setLocation(j.default_location_id);
        setCompanies(j.companies ?? []);
        setLocations(j.locations ?? []);
        setUserName(j.user?.name ?? null);

        if ((!j.locations || j.locations.length === 0) && j.company_id) {
          const loc = await fetch(
            `/api/hms/locations?company_id=${encodeURIComponent(j.company_id)}`
          );
          if (loc.ok) {
            const lj = await loc.json();
            setLocations(lj?.data || []);
          }
        }
      } catch (err) {
        console.error(err);
        setSessionError("Failed to load session.");
      } finally {
        if (mounted) setSessionLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------------------------------------
     HYDRATE CART FROM LOCALSTORAGE
  ---------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_cart_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch({ type: "HYDRATE", payload: parsed });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("pos_cart_v1", JSON.stringify(cart));
  }, [cart]);

  /* ---------------------------------------------------------
     SEARCH PRODUCTS
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/hms/products?q=${encodeURIComponent(query)}`
        );
        if (r.ok) {
          const j = await r.json();
          setProducts(j?.data || []);
        }
      } catch {
        setProducts([]);
      }
    }, 230);
    return () => clearTimeout(t);
  }, [query]);

  /* ---------------------------------------------------------
     RESERVATION HELPERS
  ---------------------------------------------------------- */

  const reserve = useCallback(
    async (
      product_id: string,
      batch_id: string | null,
      qty: number,
      pres?: string | null
    ) => {
      if (!companyId || !locationId) throw new Error("missing_context");

      const body: any = {
        product_id,
        batch_id,
        quantity: qty,
        company_id: companyId,
        location_id: locationId,
      };
      if (patientId) body.patient_id = patientId;
      if (pres) body.prescription_line_id = pres;

      const r = await fetch("/api/hms/reserve", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `reserve|${uuidv4()}`,
        },
        body: JSON.stringify(body),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "reserve_fail");

      return {
        reservation_id: j.data?.reservation_id,
        expires_at: j.data?.expires_at,
      };
    },
    [companyId, locationId, patientId]
  );

  const updateReserve = useCallback(async (id: string, qty: number) => {
    const r = await fetch(`/api/hms/reserve/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.message || "update_fail");
    return {
      reservation_id: j.data?.reservation_id,
      expires_at: j.data?.expires_at,
    };
  }, []);

  const release = useCallback(async (id: string) => {
    try {
      await fetch(`/api/hms/reserve/${id}/release`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
  }, []);

  /* ---------------------------------------------------------
     ADD PRODUCT
  ---------------------------------------------------------- */
  async function addProduct(p: Product) {
    setMessage(null);

    if (p.has_multiple_batches) {
      setBatchProduct(p);
      setBatchModal(true);
      try {
        const r = await fetch(
          `/api/hms/products/${p.id}/batches`,
          { credentials: "include" }
        );
        if (!r.ok) throw new Error();
        const j = await r.json();
        setBatches(j?.data || []);
      } catch {
        setBatches([]);
      }
      return;
    }

    try {
      const r = await reserve(p.id, p.default_batch_id ?? null, 1);
      dispatch({
        type: "ADD",
        payload: {
          id: uuidv4(),
          product_id: p.id,
          batch_id: p.default_batch_id ?? null,
          quantity: 1,
          unit_price: p.price ?? 0,
          tax_rate: p.tax_rate ?? 0,
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

  async function confirmBatch() {
    if (!batchProduct) return;
    const b = batches.find((x) => x.id === selectedBatchId);
    if (!b) return;

    if (batchQty < 1 || batchQty > b.available_qty) {
      setMessage("Invalid quantity.");
      return;
    }

    try {
      const r = await reserve(batchProduct.id, b.id, batchQty);
      dispatch({
        type: "ADD",
        payload: {
          id: uuidv4(),
          product_id: batchProduct.id,
          batch_id: b.id,
          quantity: batchQty,
          unit_price: batchProduct.price ?? 0,
          tax_rate: batchProduct.tax_rate ?? 0,
          name: batchProduct.name,
          sku: batchProduct.sku,
          reservation_id: r.reservation_id,
          reservation_expires_at: r.expires_at,
        },
      });
      setBatchModal(false);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  /* ---------------------------------------------------------
     UPDATE / REMOVE CART LINE
  ---------------------------------------------------------- */
  async function setQty(id: string, qty: number) {
    qty = Math.max(1, qty);
    const line = cart.find((l) => l.id === id);
    if (!line) return;

    try {
      const r = line.reservation_id
        ? await updateReserve(line.reservation_id, qty)
        : await reserve(line.product_id, line.batch_id ?? null, qty);
      dispatch({ type: "PATCH", id, patch: { quantity: qty, reservation_expires_at: r.expires_at } });
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function removeLine(id: string) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    if (line.reservation_id) await release(line.reservation_id);
    dispatch({ type: "REMOVE", id });
  }

  /* ---------------------------------------------------------
     BEFORE UNLOAD → release reservations
  ---------------------------------------------------------- */
  useEffect(() => {
    const fn = () => {
      cart.forEach((l) => l.reservation_id && release(l.reservation_id!));
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [cart, release]);

  /* ---------------------------------------------------------
     VALIDATE STOCK BEFORE BILLING
  ---------------------------------------------------------- */
  async function validateStock() {
    const unique = cart.map((l) => ({
      product_id: l.product_id,
      batch_id: l.batch_id ?? null,
    }));

    const probs: string[] = [];

    for (const u of unique) {
      const params = new URLSearchParams();
      params.set("product_id", u.product_id);
      if (u.batch_id) params.set("batch_id", u.batch_id);

      const r = await fetch(`/api/hms/stock?${params.toString()}`);
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const available = j?.data?.available_qty ?? null;
      const needed = cart
        .filter(
          (l) =>
            l.product_id === u.product_id &&
            (l.batch_id ?? null) === (u.batch_id ?? null)
        )
        .reduce((s, x) => s + x.quantity, 0);

      if (available !== null && needed > available) {
        probs.push(`Insufficient stock: ${u.product_id}`);
      }
    }

    return { ok: probs.length === 0, problems: probs };
  }

  /* ---------------------------------------------------------
     SUBMIT SALE
  ---------------------------------------------------------- */
  async function submitSale() {
    setMessage(null);

    if (!tenantId || !companyId || !createdBy || !locationId) {
      setMessage("Missing session context.");
      return;
    }
    if (!patientId) {
      setMessage("Patient required.");
      return;
    }
    if (!cart.length) {
      setMessage("Cart empty.");
      return;
    }

    setSubmitting(true);

    const check = await validateStock();
    if (!check.ok) {
      setMessage(check.problems.join("; "));
      setSubmitting(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      company_id: companyId,
      created_by: createdBy,
      patient_id: patientId,
      doctor_id: doctorId || null,
      location_id: locationId,
      items: cart.map((c) => ({
        product_id: c.product_id,
        batch_id: c.batch_id,
        quantity: c.quantity,
        unit_price: c.unit_price,
        tax_rate: c.tax_rate,
        reservation_id: c.reservation_id,
        prescription_line_id: c.prescription_line_id,
      })),
      payment: {
        amount: Number(
          cart.reduce((s, l) => s + l.unit_price * l.quantity, 0)
        ),
        method: "cash",
        reference: `POS-${Date.now()}`,
      },
    };

    try {
      const r = await fetch("/api/hms/pharmacy/billing/fulfill", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `bill|${uuidv4()}`,
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "billing_fail");

      const invoiceNo = j.data?.invoice_number ?? "SUCCESS";
      setMessage(`Invoice Created: ${invoiceNo}`);
      dispatch({ type: "CLEAR" });
      setLoadedPrescription(null);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------
     TOTALS
  ---------------------------------------------------------- */
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (s, l) =>
          s + (l.unit_price * l.quantity - (l.discount_amount ?? 0)),
        0
      ),
    [cart]
  );
  const tax = useMemo(
    () =>
      cart.reduce(
        (s, l) =>
          s +
          (((l.tax_rate ?? 0) / 100) *
            (l.unit_price * l.quantity - (l.discount_amount ?? 0))),
        0
      ),
    [cart]
  );
  const total = subtotal + tax;

  /* ---------------------------------------------------------
     PRESCRIPTION MAPPING
  ---------------------------------------------------------- */
  async function addPrescriptionLines(lines: PrescriptionLine[]) {
    setMessage(null);
    for (const ln of lines) {
      try {
        let productId: string | null = null;

        if (ln.suggested_product_ids?.length)
          productId = ln.suggested_product_ids[0];

        if (!productId) {
          const norm = await fetch(
            `/api/hms/medications/normalize?q=${encodeURIComponent(
              ln.product_name
            )}`
          );
          if (norm.ok) {
            const j = await norm.json();
            if (j?.data?.length) {
              productId = j.data[0].product_id ?? j.data[0].id;
            }
          }
        }

        if (!productId) {
          const search = await fetch(
            `/api/hms/products?q=${encodeURIComponent(ln.product_name)}`
          );
          if (search.ok) {
            const j = await search.json();
            if (j?.data?.length) productId = j.data[0].id;
          }
        }

        if (!productId) {
          dispatch({
            type: "ADD",
            payload: {
              id: uuidv4(),
              product_id: `__unmapped__${ln.product_name}`,
              quantity: ln.qty ?? 1,
              unit_price: 0,
              tax_rate: 0,
              name: ln.product_name,
              reservation_id: null,
            },
          });
          continue;
        }

        const pr = await fetch(`/api/hms/products/${productId}`);
        const pj = pr.ok ? await pr.json() : null;
        const prod = pj?.data ?? pj;
        if (!prod) continue;

        const r = await reserve(
          productId,
          prod.default_batch_id ?? null,
          ln.qty ?? 1,
          ln.id ?? null
        );

        dispatch({
          type: "ADD",
          payload: {
            id: uuidv4(),
            product_id: productId,
            batch_id: prod.default_batch_id,
            quantity: ln.qty ?? 1,
            unit_price: prod.price ?? 0,
            tax_rate: prod.tax_rate ?? 0,
            name: prod.name,
            sku: prod.sku,
            reservation_id: r.reservation_id,
            reservation_expires_at: r.expires_at,
            prescription_line_id: ln.id ?? null,
          },
        });
      } catch (e: any) {
        setMessage("Prescription map error: " + e.message);
      }
    }
    setPrescriptionModal(false);
  }

  /* ---------------------------------------------------------
     RENDER UI — Neural Glass Polished
  ---------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900/40 to-slate-800/20 p-6 text-slate-100">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl p-3 glass border border-slate-700/40">
              <h1 className="text-2xl font-semibold text-white">Pharmacy POS</h1>
              <div className="text-sm text-slate-300">Neural Glass • Production Ready</div>
            </div>
          </div>

          <div className="px-4 py-2 rounded-xl bg-slate-900/40 shadow-md font-semibold text-white">
            ₹ {currency(total)}
          </div>
        </header>

        {/* PATIENT + DOCTOR */}
        <div className="mb-4 flex justify-between gap-6">
          <PatientDoctorSelector
            patientId={patientId || undefined}
            doctorId={doctorId || undefined}
            onPatientChange={(id) => setPatient(id ?? "")}
            onDoctorChange={(id) => setDoctor(id ?? "")}
          />

          <PrescriptionUploader
            onPrescriptionLoaded={(p) => {
              if (!p) return setMessage("Prescription load error.");
              if (p.patient_id) setPatient(p.patient_id);
              setLoadedPrescription(p);
              setPrescriptionModal(true);
            }}
          />
        </div>

        <main className="grid grid-cols-12 gap-6">
          {/* PRODUCTS */}
          <section className="col-span-7 glass rounded-2xl p-4 border border-slate-700/30">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="w-full p-3 rounded-lg bg-slate-800/40 border border-slate-700 text-slate-100"
            />

            <div className="grid grid-cols-2 gap-3 mt-3">
              {products.map((p) => (
                <motion.div
                  whileHover={{ y: -2 }}
                  key={p.id}
                  className="glass rounded-lg p-3 border border-slate-700/20 flex justify-between"
                >
                  <div>
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      {p.sku || "—"} • ₹ {p.price ?? 0}
                    </div>
                  </div>
                  <button
                    onClick={() => addProduct(p)}
                    className="px-3 py-1 rounded-lg bg-indigo-600 text-white"
                  >
                    Add
                  </button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* CART */}
          <aside className="col-span-5 glass rounded-2xl p-4 border border-slate-700/30 flex flex-col">
            <h2 className="text-lg font-semibold mb-3 text-white">Cart</h2>

            <div className="flex-1 space-y-2 overflow-auto">
              {cart.map((l) => (
                <div
                  key={l.id}
                  className="rounded-lg glass p-3 border border-slate-700/20 flex justify-between"
                >
                  <div>
                    <div className="font-medium text-white">{l.name}</div>
                    <div className="text-xs text-slate-400">SKU: {l.sku}</div>
                    <div className="text-xs text-slate-500">
                      Batch: {l.batch_id ?? "auto"}
                    </div>
                  </div>

                  {/* QTY */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-700 rounded-md overflow-hidden">
                      <button
                        className="px-3 py-2 text-white"
                        onClick={() => setQty(l.id, l.quantity - 1)}
                      >
                        −
                      </button>
                      <input
                        className="w-16 text-center bg-slate-900 p-2"
                        value={l.quantity}
                        onChange={(e) => setQty(l.id, Number(e.target.value))}
                      />
                      <button
                        className="px-3 py-2 text-white"
                        onClick={() => setQty(l.id, l.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-white">
                      ₹ {currency(l.unit_price * l.quantity)}
                    </div>
                    <button
                      className="text-red-400 text-sm"
                      onClick={() => removeLine(l.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-3 mt-4">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>₹ {currency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tax</span>
                <span>₹ {currency(tax)}</span>
              </div>

              <button
                disabled={submitting}
                className="w-full mt-3 p-3 rounded-lg bg-green-600 text-white font-semibold"
                onClick={submitSale}
              >
                {submitting ? "Processing..." : `Pay ₹ ${currency(total)}`}
              </button>

              {message && (
                <div className="text-red-400 text-sm mt-2">{message}</div>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   END FILE
---------------------------------------------------------- */
