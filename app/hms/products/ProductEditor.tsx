// web/app/hms/products/ProductEditor.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient, { generateIdempotencyKey, setIdempotencyKey } from "@/lib/api-client";

import Tabs from "./components/Tabs";
import BatchTable from "./components/BatchTable";
import SupplierTable from "./components/SupplierTable";
import TaxSelector from "./components/TaxSelector";
import LedgerPreview from "./components/LedgerPreview";
import VariantsPanel from "./components/VariantsPanel";
import MediaUploader from "./components/MediaUploader";

import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  Card,
  Segmented,
} from "./components/ui/NeuralGlassProUI";

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

  const update = (k: string, v: any) =>
    setValues((s: any) => ({ ...s, [k]: v }));

  function toNumberSafe(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // -------------------------
  // READ PRODUCT
  // -------------------------
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

  // -------------------------
  // AI HELPERS
  // -------------------------
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
      setCheckError(
        e?.response?.data?.message ?? e?.message ?? "Salt extraction failed"
      );
      return [];
    }
  }

  async function checkInteractions(salts?: string[]) {
    try {
      setCheckError(null);

      const payload = {
        salts: Array.isArray(salts)
          ? salts
          : values.metadata?.salts ?? [],
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
      setCheckError(
        e?.response?.data?.message ??
          e?.message ??
          "Interaction check failed"
      );
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
      setCheckError(
        e?.response?.data?.message ??
          e?.message ??
          "Schedule prediction failed"
      );
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
      setCheckError(
        e?.response?.data?.message ??
          e?.message ??
          "HSN/GST prediction failed"
      );
      return null;
    }
  }

  // -------------------------
  // RUN ALL CHECKS
  // -------------------------
  async function runAllChecks(product?: any) {
    if (checksControllerRef.current)
      checksControllerRef.current.abort();

    checksControllerRef.current = new AbortController();
    const signal = checksControllerRef.current.signal;

    setLoadingChecks(true);
    setCheckError(null);

    try {
      const salts = await extractSalts({
        text: `${product?.name || values.name}`,
      });

      if (signal.aborted) return;

      await Promise.all([
        checkInteractions(salts),
        predictSchedule(),
        predictHSNAndGST(),
      ]);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setCheckError(e?.message ?? "Unknown error during checks");
    } finally {
      if (!signal.aborted) setLoadingChecks(false);
    }
  }

  // -------------------------
  // SAVE
  // -------------------------
  const onSave = async () => {
    if (saving) return;

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
      setSaveError(
        e?.response?.data?.message ??
          e?.message ??
          "Save failed"
      );
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const hasInteractions =
    !!values.metadata?.interactions &&
    values.metadata.interactions.length > 0;

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <Card className="max-w-6xl mx-auto mt-10" style={{ padding: 28 }}>
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isNew ? "New Product" : values.name || "Edit Product"}
          </h1>
          <div className="text-sm text-slate-600">
            Products / Catalog / Editor
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SecondaryButton
            onClick={() => runAllChecks()}
            disabled={loadingChecks}
          >
            {loadingChecks
              ? "Running checks…"
              : "Run Safety & Tax Checks"}
          </SecondaryButton>

          <PrimaryButton onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save & Publish"}
          </PrimaryButton>
        </div>
      </div>

      {(error || checkError || saveError) && (
        <div
          role="alert"
          className="mt-6 mb-4 p-3 rounded-xl border border-red-100 bg-red-50 text-red-700"
        >
          {saveError || checkError || error}
        </div>
      )}

      <div className="mt-6">
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
      </div>

      {/* GENERAL TAB */}
      {tab === "general" && (
        <div className="space-y-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              SKU
            </label>
            <input
              value={values.sku || ""}
              onChange={(e) => update("sku", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name
            </label>
            <input
              value={values.name || ""}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex gap-4 items-center">
            {values.metadata?.schedule && (
              <div className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 w-fit text-sm font-semibold border border-indigo-100">
                Schedule {values.metadata.schedule} (confidence:{" "}
                {Math.round(
                  (values.metadata.schedule_confidence || 0) * 100
                )}
                %)
              </div>
            )}

            {values.metadata?.hsn && (
              <div className="px-3 py-1 rounded-xl bg-slate-50 text-slate-800 w-fit text-sm font-medium border">
                HSN: {values.metadata.hsn} • GST:{" "}
                {values.metadata.gst ?? "—"}%
              </div>
            )}

            {hasInteractions && (
              <div className="px-3 py-1 rounded-xl bg-yellow-100 text-yellow-800 w-fit text-sm font-semibold border">
                ⚠ {values.metadata.interactions.length} interaction(s)
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Short Description
            </label>
            <input
              value={values.short_description || ""}
              onChange={(e) =>
                update("short_description", e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              rows={5}
              value={values.description || ""}
              onChange={(e) => update("description", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Segmented
              leftLabel="Stockable"
              rightLabel="Service"
              leftActive={!!values.is_stockable}
              onLeft={() =>
                setValues((s: any) => ({
                  ...s,
                  is_stockable: true,
                  is_service: false,
                }))
              }
              onRight={() =>
                setValues((s: any) => ({
                  ...s,
                  is_stockable: false,
                  is_service: true,
                }))
              }
            />

            <div className="grid grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  UoM
                </label>
                <input
                  value={values.uom || ""}
                  onChange={(e) => update("uom", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Barcode
                </label>
                <input
                  value={values.barcode || ""}
                  onChange={(e) =>
                    update("barcode", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SALTS */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Active Ingredients (Salts)
              </h3>

              <div className="flex gap-2">
                <GhostButton
                  onClick={() =>
                    extractSalts({ text: `${values.name || ""}` })
                  }
                >
                  Re-extract
                </GhostButton>

                <GhostButton onClick={() => checkInteractions()}>
                  Check Interactions
                </GhostButton>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              {values.metadata?.salts &&
              values.metadata.salts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {values.metadata.salts.map(
                    (s: string, i: number) => (
                      <div
                        key={i}
                        className="px-3 py-1 rounded-full text-sm bg-slate-100 border border-slate-200 text-slate-800"
                      >
                        {s}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No salts detected yet
                </div>
              )}
            </div>

            {hasInteractions && (
              <div className="p-3 rounded-xl border bg-yellow-50">
                <h4 className="font-semibold">Detected Interactions</h4>
                <div className="mt-2 space-y-2">
                  {values.metadata.interactions.map(
                    (it: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white border"
                      >
                        <div className="font-semibold text-slate-800">
                          {it.summary}
                        </div>
                        <div className="text-sm text-slate-700 mt-1">
                          {it.details}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          confidence:{" "}
                          {Math.round(
                            (it.confidence || 0) * 100
                          )}
                          %
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRICING */}
      {tab === "pricing" && (
        <div className="space-y-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Price (Selling)
            </label>
            <input
              type="number"
              value={values.price ?? 0}
              onChange={(e) =>
                update("price", toNumberSafe(e.target.value))
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Default Cost
            </label>
            <input
              type="number"
              value={values.default_cost ?? 0}
              onChange={(e) =>
                update(
                  "default_cost",
                  toNumberSafe(e.target.value)
                )
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <BatchTable batches={batches} setBatches={setBatches} />
      )}

      {tab === "suppliers" && (
        <SupplierTable
          suppliers={suppliers}
          setSuppliers={setSuppliers}
        />
      )}

      {tab === "variants" && (
        <VariantsPanel
          variants={variants}
          setVariants={setVariants}
        />
      )}

      {tab === "tax" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Tax & Accounting
            </h3>
            <div className="text-sm text-slate-600">
              {values.metadata?.hsn ? (
                <span>
                  HSN: {values.metadata.hsn} • GST:{" "}
                  {values.metadata.gst}%
                </span>
              ) : (
                <span className="italic">HSN not predicted</span>
              )}
            </div>
          </div>

          <TaxSelector
            taxRules={taxRules}
            setTaxRules={setTaxRules}
          />

          <div className="mt-4">
            <SecondaryButton
              onClick={() => predictHSNAndGST()}
            >
              Predict HSN / GST (AI)
            </SecondaryButton>
          </div>
        </div>
      )}

      {tab === "media" && (
        <MediaUploader
          media={media}
          setMedia={setMedia}
        />
      )}

      {tab === "history" && (
        <LedgerPreview ledger={ledger} />
      )}

      <div className="mt-8 flex gap-4">
        <SecondaryButton
          onClick={() => runAllChecks()}
          disabled={loadingChecks}
        >
          {loadingChecks ? "Running checks…" : "Run All Checks"}
        </SecondaryButton>

        <PrimaryButton onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save & Publish"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
