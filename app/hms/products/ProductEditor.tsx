// web/app/hms/products/ProductEditor.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient, { generateIdempotencyKey, setIdempotencyKey } from "@/lib/api-client";

import Tabs from "./components/Tabs";
import BatchTable from "./components/BatchTable";
import SupplierTable from "./components/SupplierTable";
import TaxSelector from "./components/TaxSelector";
import LedgerPreview from "./components/LedgerPreview";
import VariantsPanel from "./components/VariantsPanel";
import MediaUploader from "./components/MediaUploader";

/**
 * Dark Neural-Glass ProductEditor
 * - High contrast dark theme
 * - Glass cards with backdrop blur
 * - Gradient primary CTAs, strong borders, visible focus rings
 * - Kept original logic and AI check hooks intact
 */

type ProductValues = {
  id?: string;
  sku?: string;
  name?: string;
  description?: string;
  short_description?: string;
  price?: number | null;
  default_cost?: number | null;
  is_stockable?: boolean;
  is_service?: boolean;
  uom?: string;
  barcode?: string;
  barcode_type?: string;
  metadata?: any;
  [k: string]: any;
};

function IconSave() {
  return (
    <svg className="inline-block w-4 h-4 -mt-px" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 4h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 3v5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSpark() {
  return (
    <svg className="inline-block w-4 h-4 -mt-px" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 18v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.9 4.9l2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.3 16.3l2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.9 19.1l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.3 7.7l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ProductEditor({ id }: { id?: string }) {
  const isNew = !id;
  const router = useRouter();

  const [tab, setTab] = useState("general");
  const [values, setValues] = useState<ProductValues>({
    sku: "",
    name: "",
    description: "",
    short_description: "",
    price: 0,
    default_cost: 0,
    is_stockable: true,
    is_service: false,
    uom: "Unit",
    barcode: "",
    barcode_type: "EAN-13",
    metadata: {},
  });

  const [batches, setBatches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const checksControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (checksControllerRef.current) checksControllerRef.current.abort();
    };
  }, []);

  const update = (k: string, v: any) => setValues((s: any) => ({ ...s, [k]: v }));

  function toNumberSafe(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // READ PRODUCT
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await apiClient.get(`/products/${id}`);
        const d = res.data ?? {};
        if (!active || !mountedRef.current) return;

        setValues(d.product ?? {});
        setBatches(d.batches ?? []);
        setSuppliers(d.suppliers ?? []);
        setTaxRules(d.tax_rules ?? []);
        setLedger(d.ledger ?? []);
        setMedia(d.media ?? []);
        setVariants(d.variants ?? []);

        runAllChecks(d.product).catch(() => {});
      } catch (e: any) {
        if (!mountedRef.current) return;
        setError(e?.response?.data?.message ?? e?.message ?? "Failed to load product");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // AI HELPERS
  async function extractSalts(textOrFile?: { text?: string; file?: File }) {
    try {
      setCheckError(null);
      const form = new FormData();

      if (textOrFile?.file) form.append("file", textOrFile.file);
      else form.append("text", textOrFile?.text ?? values.name ?? "");

      const res = await apiClient.post("/ai/salt/extract", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const json = res.data ?? {};
      const salts = Array.isArray(json.salts) ? json.salts : [];

      setValues((s: any) => ({
        ...s,
        metadata: {
          ...(s.metadata || {}),
          salts,
          extracted_text: json.raw_text,
        },
      }));
      return salts;
    } catch (e: any) {
      setCheckError(e?.response?.data?.message ?? e?.message ?? "Salt extraction failed");
      return [];
    }
  }

  async function checkInteractions(salts?: string[]) {
    try {
      setCheckError(null);

      const payload = {
        salts: Array.isArray(salts) ? salts : values.metadata?.salts ?? [],
      };

      if (!payload.salts.length) return [];

      const res = await apiClient.post("/ai/drug/interactions", payload);
      const json = res.data ?? {};

      setValues((s: any) => ({
        ...s,
        metadata: {
          ...(s.metadata || {}),
          interactions: json.interactions ?? [],
        },
      }));
      return json.interactions ?? [];
    } catch (e: any) {
      setCheckError(e?.response?.data?.message ?? e?.message ?? "Interaction check failed");
      return [];
    }
  }

  async function predictSchedule() {
    try {
      setCheckError(null);

      const payload = {
        name: values.name,
        salt: values.metadata?.salts?.join(", ") ?? "",
        manufacturer: values.metadata?.manufacturer ?? "",
      };

      const res = await apiClient.post("/ai/schedule", payload);
      const json = res.data ?? {};

      setValues((s: any) => ({
        ...s,
        metadata: {
          ...(s.metadata || {}),
          schedule: json.schedule,
          schedule_confidence: json.confidence,
        },
      }));

      return json;
    } catch (e: any) {
      setCheckError(e?.response?.data?.message ?? e?.message ?? "Schedule prediction failed");
      return null;
    }
  }

  async function predictHSNAndGST() {
    try {
      setCheckError(null);

      const payload = {
        name: values.name,
        salt: values.metadata?.salts?.join(", ") ?? "",
        category: values.metadata?.category ?? "",
        mrp: values.price,
        brand: values.metadata?.manufacturer ?? "",
        packaging: values.metadata?.packaging ?? "",
      };

      const res = await apiClient.post("/ai/hsn", payload);
      const json = res.data ?? {};

      setValues((s: any) => ({
        ...s,
        metadata: {
          ...(s.metadata || {}),
          hsn: json.hsn,
          gst: json.gst,
          hsn_confidence: json.confidence,
        },
      }));

      if (json.gst && (!taxRules || taxRules.length === 0)) {
        setTaxRules([
          {
            tax_id: null,
            tax_name: `GST ${json.gst}%`,
            rate: json.gst,
            account_id: null,
          },
        ]);
      }

      return json;
    } catch (e: any) {
      setCheckError(e?.response?.data?.message ?? e?.message ?? "HSN/GST prediction failed");
      return null;
    }
  }

  // RUN ALL CHECKS
  async function runAllChecks(product?: any) {
    if (checksControllerRef.current) checksControllerRef.current.abort();

    checksControllerRef.current = new AbortController();
    const signal = checksControllerRef.current.signal;

    setLoadingChecks(true);
    setCheckError(null);

    try {
      const salts = await extractSalts({
        text: `${product?.name || values.name}`,
      });

      if (signal.aborted) return;

      await Promise.all([checkInteractions(salts), predictSchedule(), predictHSNAndGST()]);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setCheckError(e?.message ?? "Unknown error during checks");
    } finally {
      if (!signal.aborted) setLoadingChecks(false);
    }
  }

  // SAVE
  const onSave = async () => {
    if (saving) return;

    // small inline validation
    if (!values.name || values.name.trim().length < 2) {
      setSaveError("Name is required (min 2 chars).");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      ...values,
      price: toNumberSafe(values.price),
      default_cost: toNumberSafe(values.default_cost),
      batches,
      suppliers,
      tax_rules: taxRules,
      variants,
      media,
    };

    try {
      const idemp = generateIdempotencyKey("product_create");
      const cfg = setIdempotencyKey({}, idemp);

      let res;
      if (isNew) res = await apiClient.post("/products", payload, cfg);
      else res = await apiClient.put(`/products/${id}`, payload, cfg);

      const data = res.data ?? {};
      const createdId = data.id ?? data.product?.id ?? id;

      if (createdId) router.push(`/hms/products/${createdId}`);
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? e?.message ?? "Save failed");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const hasInteractions = !!values.metadata?.interactions && values.metadata.interactions.length > 0;

  // -------------------------
  // STYLED RENDER (dark, glass)
  // -------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-neutral-800 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* top header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              {isNew ? "Create Product" : values.name || "Edit Product"}
            </h1>
            <div className="text-sm text-slate-400">Catalog → Products → Editor</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => runAllChecks()}
              disabled={loadingChecks}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-black/20 backdrop-blur-sm hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-sm"
              aria-pressed={loadingChecks}
            >
              <IconSpark />
              <span>{loadingChecks ? "Running checks…" : "Run Checks"}</span>
            </button>

            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 hover:scale-[1.01] transform-gpu transition focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-400/40 text-sm font-semibold text-black"
            >
              <IconSave />
              <span>{saving ? "Saving…" : "Save & Publish"}</span>
            </button>
          </div>
        </div>

        {/* card */}
        <div
          className="rounded-2xl border border-slate-800/60 bg-black/30 backdrop-blur-lg p-6 shadow-2xl"
          aria-live="polite"
        >
          {/* errors */}
          {(error || checkError || saveError) && (
            <div className="mb-6 p-4 rounded-lg border border-red-400/30 bg-red-900/30 text-red-300">
              <div className="flex items-start justify-between">
                <div className="font-semibold">Problems</div>
                <button
                  onClick={() => {
                    setError(null);
                    setCheckError(null);
                    setSaveError(null);
                  }}
                  className="text-xs text-red-200/80 underline"
                >
                  dismiss
                </button>
              </div>
              <div className="mt-2 text-sm">
                {saveError || checkError || error}
              </div>
            </div>
          )}

          <div className="mb-6">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { id: "general", label: "General" },
                { id: "pricing", label: "Pricing" },
                { id: "inventory", label: "Inventory" },
                { id: "suppliers", label: "Suppliers" },
                { id: "variants", label: "Variants" },
                { id: "tax", label: "Tax" },
                { id: "media", label: "Media" },
                { id: "history", label: "History" },
              ]}
            />
          </div>

          {/* panels */}
          <div className="space-y-6">
            {tab === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs uppercase text-slate-400 font-medium">SKU</label>
                    <input
                      value={values.sku || ""}
                      onChange={(e) => update("sku", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-gradient-to-b from-black/25 to-transparent px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      placeholder="SKU1234"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase text-slate-400 font-medium">Name</label>
                    <input
                      value={values.name || ""}
                      onChange={(e) => update("name", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-gradient-to-b from-black/25 to-transparent px-4 py-3 text-white text-lg font-semibold placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      placeholder="Product name"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                    {values.metadata?.schedule && (
                      <div className="px-3 py-1 rounded-full bg-indigo-900/40 text-indigo-200 text-xs font-semibold border border-indigo-700/40">
                        Schedule {values.metadata.schedule} • {Math.round((values.metadata.schedule_confidence || 0) * 100)}%
                      </div>
                    )}

                    {values.metadata?.hsn && (
                      <div className="px-3 py-1 rounded-full bg-slate-900/40 text-slate-200 text-xs font-semibold border border-slate-700/40">
                        HSN {values.metadata.hsn} • GST {values.metadata.gst ?? "—"}%
                      </div>
                    )}

                    {hasInteractions && (
                      <div className="px-3 py-1 rounded-full bg-yellow-900/40 text-yellow-200 text-xs font-semibold border border-yellow-700/30">
                        ⚠ {values.metadata.interactions.length} interactions
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs uppercase text-slate-400 font-medium">Short description</label>
                    <input
                      value={values.short_description || ""}
                      onChange={(e) => update("short_description", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-black/20 px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      placeholder="One-liner for lists"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase text-slate-400 font-medium">Description</label>
                    <textarea
                      rows={4}
                      value={values.description || ""}
                      onChange={(e) => update("description", e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-black/20 px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      placeholder="Long description, usage, notes"
                    />
                  </div>

                  {/* salts */}
                  <div className="p-4 rounded-xl border border-slate-700 bg-black/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold">Active ingredients (salts)</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => extractSalts({ text: `${values.name || ""}` })}
                          className="px-3 py-1 rounded-lg text-sm bg-transparent border border-slate-700 hover:bg-white/3 focus:outline-none"
                        >
                          Re-extract
                        </button>
                        <button
                          onClick={() => checkInteractions()}
                          className="px-3 py-1 rounded-lg text-sm bg-transparent border border-slate-700 hover:bg-white/3 focus:outline-none"
                        >
                          Check interactions
                        </button>
                      </div>
                    </div>

                    <div>
                      {values.metadata?.salts && values.metadata.salts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {values.metadata.salts.map((s: string, i: number) => (
                            <div key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-white/6 border border-white/8">
                              {s}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">No salts detected</div>
                      )}
                    </div>

                    {hasInteractions && (
                      <div className="mt-4 bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/25">
                        <div className="font-semibold text-sm">Detected interactions</div>
                        <div className="mt-2 space-y-2">
                          {values.metadata.interactions.map((it: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-lg bg-black/30 border border-slate-800">
                              <div className="font-semibold text-sm text-white">{it.summary}</div>
                              <div className="text-xs text-slate-400 mt-1">{it.details}</div>
                              <div className="text-xs text-slate-500 mt-1">confidence: {Math.round((it.confidence || 0) * 100)}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* right column */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-700 bg-black/20">
                    <label className="text-xs uppercase text-slate-400 font-medium">Type</label>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setValues((s: any) => ({ ...s, is_stockable: true, is_service: false }))}
                        className={`text-left px-3 py-2 rounded-lg border ${values.is_stockable ? "bg-emerald-500/10 border-emerald-400" : "border-slate-700"} focus:outline-none`}
                      >
                        Stockable
                      </button>
                      <button
                        type="button"
                        onClick={() => setValues((s: any) => ({ ...s, is_stockable: false, is_service: true }))}
                        className={`text-left px-3 py-2 rounded-lg border ${values.is_service ? "bg-indigo-500/10 border-indigo-400" : "border-slate-700"} focus:outline-none`}
                      >
                        Service
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-700 bg-black/20">
                    <label className="text-xs uppercase text-slate-400 font-medium">UoM</label>
                    <input
                      value={values.uom || ""}
                      onChange={(e) => update("uom", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />

                    <label className="text-xs uppercase text-slate-400 font-medium mt-4 block">Barcode</label>
                    <input
                      value={values.barcode || ""}
                      onChange={(e) => update("barcode", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-700 bg-black/20 space-y-2">
                    <div className="text-xs uppercase text-slate-400 font-medium">Pricing</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={values.price ?? 0}
                        onChange={(e) => update("price", toNumberSafe(e.target.value))}
                        className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        placeholder="Price"
                      />
                      <input
                        type="number"
                        value={values.default_cost ?? 0}
                        onChange={(e) => update("default_cost", toNumberSafe(e.target.value))}
                        className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        placeholder="Cost"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "pricing" && (
              <div className="p-4 rounded-xl border border-slate-700 bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Price (Selling)</label>
                    <input
                      type="number"
                      value={values.price ?? 0}
                      onChange={(e) => update("price", toNumberSafe(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Default Cost</label>
                    <input
                      type="number"
                      value={values.default_cost ?? 0}
                      onChange={(e) => update("default_cost", toNumberSafe(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-transparent px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === "inventory" && <BatchTable batches={batches} setBatches={setBatches} />}

            {tab === "suppliers" && <SupplierTable suppliers={suppliers} setSuppliers={setSuppliers} />}

            {tab === "variants" && <VariantsPanel variants={variants} setVariants={setVariants} />}

            {tab === "tax" && (
              <div className="p-4 rounded-xl border border-slate-700 bg-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Tax & Accounting</div>
                    <div className="text-xs text-slate-400">
                      {values.metadata?.hsn ? `HSN ${values.metadata.hsn} • GST ${values.metadata.gst}%` : "HSN not predicted"}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => predictHSNAndGST()}
                      className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-white/3"
                    >
                      Predict HSN / GST
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <TaxSelector taxRules={taxRules} setTaxRules={setTaxRules} />
                </div>
              </div>
            )}

            {tab === "media" && <MediaUploader media={media} setMedia={setMedia} />}

            {tab === "history" && <LedgerPreview ledger={ledger} />}
          </div>

          {/* footer */}
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">Pro Tip: use clear names and SKUs for great search results.</div>
            <div className="flex gap-3">
              <button
                onClick={() => runAllChecks()}
                disabled={loadingChecks}
                className="px-3 py-2 rounded-lg border border-slate-700 bg-black/20 hover:bg-white/4 focus:outline-none"
              >
                {loadingChecks ? "Running…" : "Run All Checks"}
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 text-black font-semibold shadow-lg"
              >
                {saving ? "Saving…" : "Save & Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
