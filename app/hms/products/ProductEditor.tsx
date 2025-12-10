// web/app/hms/products/ProductEditor.tsx
"use client";

import { useState, useEffect } from "react";
import { readProduct, saveProduct } from "./api";
import Tabs from "./components/Tabs";
import BatchTable from "./components/BatchTable";
import SupplierTable from "./components/SupplierTable";
import TaxSelector from "./components/TaxSelector";
import LedgerPreview from "./components/LedgerPreview";
import VariantsPanel from "./components/VariantsPanel";
import MediaUploader from "./components/MediaUploader";

type ProductValues = {
  id?: string;
  sku?: string;
  name?: string;
  description?: string;
  short_description?: string;
  price?: number;
  default_cost?: number;
  is_stockable?: boolean;
  is_service?: boolean;
  uom?: string;
  barcode?: string;
  barcode_type?: string;
  metadata?: any;
  [k: string]: any;
};

export default function ProductEditor({ id }: { id?: string }) {
  const isNew = !id;

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

  const [loadingChecks, setLoadingChecks] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    readProduct(id).then((res) => {
      setValues(res.product || {});
      setBatches(res.batches || []);
      setSuppliers(res.suppliers || []);
      setTaxRules(res.tax_rules || []);
      setLedger(res.ledger || []);
      setVariants(res.variants || []);
      setMedia(res.media || []);

      // run safety & classification checks automatically (best-effort)
      runAllChecks(res.product).catch(() => {
        /* ignore — user can retry */
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = (k: string, v: any) =>
    setValues((s: any) => ({ ...s, [k]: v }));

  // -----------------------
  // AI / Safety / Tax helpers
  // -----------------------
  async function extractSalts(textOrFile?: { text?: string; file?: File }) {
    try {
      setCheckError(null);
      const form = new FormData();

      if (textOrFile?.file) {
        form.append("file", textOrFile.file);
      } else {
        form.append("text", textOrFile?.text || `${values.name || ""}`);
      }

      const res = await fetch("/api/ai/salt/extract", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      // json: { salts: [...], raw_text }
      const salts = json.salts || [];
      setValues((s: any) => ({
        ...s,
        metadata: { ...(s.metadata || {}), salts, extracted_text: json.raw_text },
      }));
      return salts;
    } catch (e: any) {
      setCheckError("Salt extraction failed: " + (e.message || e));
      return [];
    }
  }

  async function checkInteractions(salts?: string[]) {
    try {
      setCheckError(null);
      const payload = { salts: salts || values.metadata?.salts || [] };
      if (!payload.salts || payload.salts.length === 0) {
        return [];
      }

      const res = await fetch("/api/ai/drug/interactions", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      const interactions = json.interactions || [];
      setValues((s: any) => ({
        ...s,
        metadata: { ...(s.metadata || {}), interactions },
      }));
      return interactions;
    } catch (e: any) {
      setCheckError("Interaction check failed: " + (e.message || e));
      return [];
    }
  }

  async function predictSchedule() {
    try {
      setCheckError(null);
      const res = await fetch("/api/ai/schedule", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          salt: (values.metadata && values.metadata.salts && values.metadata.salts.join(", ")) || "",
          manufacturer: values.metadata?.manufacturer || "",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      // { schedule, confidence, source }
      setValues((s: any) => ({
        ...s,
        metadata: { ...(s.metadata || {}), schedule: json.schedule, schedule_confidence: json.confidence },
      }));
      return json;
    } catch (e: any) {
      setCheckError("Schedule prediction failed: " + (e.message || e));
      return null;
    }
  }

  async function predictHSNAndGST() {
    try {
      setCheckError(null);
      const res = await fetch("/api/ai/hsn", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          salt: (values.metadata && values.metadata.salts && values.metadata.salts.join(", ")) || "",
          category: values.metadata?.category || "",
          mrp: values.price,
          brand: values.metadata?.manufacturer || "",
          packaging: values.metadata?.packaging || "",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      // { hsn, gst, confidence }
      setValues((s: any) => ({
        ...s,
        metadata: { ...(s.metadata || {}), hsn: json.hsn, gst: json.gst, hsn_confidence: json.confidence },
      }));

      // Also update taxRules preview with predicted GST if not already set
      if (json.gst && (!taxRules || taxRules.length === 0)) {
        setTaxRules([{ tax_id: null, tax_name: `GST ${json.gst}%`, rate: json.gst, account_id: null }]);
      }

      return json;
    } catch (e: any) {
      setCheckError("HSN/GST prediction failed: " + (e.message || e));
      return null;
    }
  }

  // run all checks in sequence (atomic-ish, best-effort)
  async function runAllChecks(product?: any) {
    setLoadingChecks(true);
    setCheckError(null);
    try {
      // 1) extract salts
      const salts = await extractSalts({ text: `${(product && product.name) || values.name}` });

      // 2) interactions
      await checkInteractions(salts);

      // 3) schedule
      await predictSchedule();

      // 4) HSN/GST
      await predictHSNAndGST();
    } catch (e: any) {
      setCheckError(e.message || "Unknown error during checks");
    } finally {
      setLoadingChecks(false);
    }
  }

  // -----------------------
  // Save logic: include metadata + related arrays
  // -----------------------
  const onSave = async () => {
    const payload = {
      ...values,
      batches,
      suppliers,
      tax_rules: taxRules,
      variants,
      media,
    };

    try {
      if (isNew) {
        const res = await saveProduct(payload);
        if (res?.id) {
          alert("Created product: " + res.id);
        } else {
          alert("Saved (created)");
        }
      } else {
        await saveProduct(payload, id);
        alert("Saved");
      }
    } catch (e: any) {
      alert("Save failed: " + (e.message || e));
    }
  };

  // small UI helpers
  const hasInteractions = (values.metadata && values.metadata.interactions && values.metadata.interactions.length > 0);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-10 bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/30">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold mb-4">
          {isNew ? "New Product" : values.name || "Edit Product"}
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => runAllChecks()}
            className="px-4 py-2 rounded-xl border bg-white text-sm"
            disabled={loadingChecks}
          >
            {loadingChecks ? "Running checks…" : "Run Safety & Tax Checks"}
          </button>

          <button
            onClick={onSave}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white shadow-lg"
          >
            Save & Publish
          </button>
        </div>
      </div>

      {checkError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border">{checkError}</div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "general", label: "General" },
          { id: "pricing", label: "Pricing & Cost" },
          { id: "inventory", label: "Inventory & Batches" },
          { id: "suppliers", label: "Suppliers" },
          { id: "variants", label: "Variants & Attributes" },
          { id: "tax", label: "Tax & Accounting" },
          { id: "media", label: "Media / Documents" },
          { id: "history", label: "History" },
        ]}
      />

      {/* --- GENERAL TAB --- */}
      {tab === "general" && (
        <div className="space-y-6 mt-6">
          <div>
            <label className="block font-medium text-gray-800">SKU</label>
            <input
              value={values.sku || ""}
              onChange={(e) => update("sku", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/70"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-800">Name</label>
            <input
              value={values.name || ""}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/70"
            />
          </div>

          <div className="flex gap-4 items-center">
            {values.metadata?.schedule && (
              <div className="px-3 py-1 rounded-xl bg-purple-100 text-purple-700 w-fit text-sm font-semibold">
                Schedule {values.metadata.schedule} (confidence:{" "}
                {Math.round((values.metadata.schedule_confidence || 0) * 100)}%)
              </div>
            )}

            {values.metadata?.hsn && (
              <div className="px-3 py-1 rounded-xl bg-slate-50 text-slate-800 w-fit text-sm font-medium border">
                HSN: {values.metadata.hsn} • GST: {values.metadata.gst ?? "—"}%
              </div>
            )}

            {hasInteractions && (
              <div className="px-3 py-1 rounded-xl bg-yellow-100 text-yellow-800 w-fit text-sm font-semibold">
                ⚠ {values.metadata.interactions.length} interaction(s)
              </div>
            )}
          </div>

          <div>
            <label className="block font-medium text-gray-800">
              Short Description
            </label>
            <input
              value={values.short_description || ""}
              onChange={(e) => update("short_description", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/70"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-800">
              Description
            </label>
            <textarea
              rows={5}
              value={values.description || ""}
              onChange={(e) => update("description", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/70"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() =>
                setValues((s: any) => ({
                  ...s,
                  is_stockable: true,
                  is_service: false,
                }))
              }
              className={`px-4 py-2 rounded-xl border ${
                values.is_stockable ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              Stockable
            </button>

            <button
              onClick={() =>
                setValues((s: any) => ({
                  ...s,
                  is_stockable: false,
                  is_service: true,
                }))
              }
              className={`px-4 py-2 rounded-xl border ${
                values.is_service ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              Service
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-800">UoM</label>
              <input
                value={values.uom || ""}
                onChange={(e) => update("uom", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-white/70"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-800">Barcode</label>
              <input
                value={values.barcode || ""}
                onChange={(e) => update("barcode", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border bg-white/70"
              />
            </div>
          </div>

          {/* Salts & Interactions preview */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Active Ingredients (Salts)</h3>

              <div className="flex gap-2">
                <button
                  onClick={() => extractSalts({ text: `${values.name || ""}` })}
                  className="px-3 py-1 rounded-lg border text-sm"
                >
                  Re-extract
                </button>

                <button
                  onClick={() => checkInteractions()}
                  className="px-3 py-1 rounded-lg border text-sm"
                >
                  Check Interactions
                </button>
              </div>
            </div>

            <div className="p-3 bg-white/70 rounded-xl border">
              {values.metadata?.salts && values.metadata.salts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {values.metadata.salts.map((s: string, i: number) => (
                    <div key={i} className="px-3 py-1 bg-white rounded-full border text-sm">
                      {s}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No salts detected yet</div>
              )}
            </div>

            {hasInteractions && (
              <div className="p-3 bg-yellow-50 rounded-xl border">
                <h4 className="font-semibold">Detected Interactions</h4>
                <div className="mt-2 space-y-2">
                  {values.metadata.interactions.map((it: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/80 border">
                      <div className="font-semibold">{it.summary}</div>
                      <div className="text-sm text-gray-700 mt-1">{it.details}</div>
                      <div className="text-xs text-gray-500 mt-1">confidence: {Math.round((it.confidence || 0) * 100)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PRICING TAB --- */}
      {tab === "pricing" && (
        <div className="space-y-6 mt-6">
          <div>
            <label className="block font-medium text-gray-800">
              Price (Selling)
            </label>
            <input
              type="number"
              value={values.price ?? 0}
              onChange={(e) => update("price", parseFloat(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border bg-white/70"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-800">
              Default Cost
            </label>
            <input
              type="number"
              value={values.default_cost ?? 0}
              onChange={(e) =>
                update("default_cost", parseFloat(e.target.value))
              }
              className="w-full px-4 py-3 rounded-xl border bg-white/70"
            />
          </div>
        </div>
      )}

      {/* --- INVENTORY TAB --- */}
      {tab === "inventory" && (
        <BatchTable batches={batches} setBatches={setBatches} />
      )}

      {/* --- SUPPLIERS TAB --- */}
      {tab === "suppliers" && (
        <SupplierTable suppliers={suppliers} setSuppliers={setSuppliers} />
      )}

      {/* --- VARIANTS TAB --- */}
      {tab === "variants" && (
        <VariantsPanel variants={variants} setVariants={setVariants} />
      )}

      {/* --- TAX TAB --- */}
      {tab === "tax" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tax & Accounting</h3>

            <div className="text-sm text-gray-600">
              {values.metadata?.hsn ? (
                <span>HSN: {values.metadata.hsn} • GST: {values.metadata.gst}%</span>
              ) : (
                <span className="italic">HSN not predicted</span>
              )}
            </div>
          </div>

          <TaxSelector taxRules={taxRules} setTaxRules={setTaxRules} />

          <div className="mt-4">
            <button
              onClick={() => predictHSNAndGST()}
              className="px-4 py-2 rounded-xl border"
            >
              Predict HSN / GST (AI)
            </button>
          </div>
        </div>
      )}

      {/* --- MEDIA TAB --- */}
      {tab === "media" && (
        <MediaUploader media={media} setMedia={setMedia} />
      )}

      {/* --- HISTORY TAB --- */}
      {tab === "history" && <LedgerPreview ledger={ledger} />}

      {/* bottom actions */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => runAllChecks()}
          className="px-4 py-2 rounded-xl border bg-white text-sm"
        >
          {loadingChecks ? "Running checks…" : "Run All Checks"}
        </button>

        <button
          onClick={onSave}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white shadow-lg"
        >
          Save & Publish
        </button>
      </div>
    </div>
  );
}
