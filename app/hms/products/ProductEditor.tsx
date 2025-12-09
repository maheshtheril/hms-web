// app/hms/products/ProductEditor.tsx
"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tab } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { useToast } from "@/components/toast/ToastProvider";
import { ArrowLeft, Save, Zap, Layers, Truck, DollarSign } from "lucide-react";
import apiClient from "@/lib/api-client";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";
import type { ProductDraft } from "./types"; // centralized shared type
import ConfirmModal from "@/components/ConfirmModal";
import { v4 as uuidv4 } from "uuid";

/* -------------------------
 * normalize helper
 * ------------------------ */
function normalizeDraftForEditor(raw: Record<string, any> | undefined | null): ProductDraft {
  const out: any = {};
  if (!raw || typeof raw !== "object") return out;

  Object.assign(out, raw);

  const stringKeys: (keyof ProductDraft)[] = ["name", "sku", "description", "currency"];
  for (const k of stringKeys) {
    if (out[k] === null) out[k] = undefined;
  }

  if (out.price === null) out.price = undefined;
  if (out.is_stockable === null) out.is_stockable = undefined;

  return out as ProductDraft;
}

/* --- Lazy tabs --- */
const GeneralTab = React.lazy(() => import("./GeneralTab"));
const InventoryTab = React.lazy(() => import("./InventoryTab"));
const VariantsTab = React.lazy(() => import("./VariantsTab"));
const PricingTab = React.lazy(() => import("./PricingTab"));
const AIAssistTab = React.lazy(() => import("./AIAssistTab"));

interface ProductEditorProps {
  productId?: string | null;
  initial?: Record<string, any> | ProductDraft | null; // <-- ADDED optional initial prop for prefilled drafts
  onClose?: () => void;
  onSaved?: (p: ProductDraft) => void;
}

export default function ProductEditor({ productId = null, initial = null, onClose, onSaved }: ProductEditorProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [draft, setDraft] = useState<ProductDraft>({});
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // save lock + abort for save operations (prevents concurrent POST/PUT)
  const saveLockRef = useRef(false);
  const saveAbortRef = useRef<AbortController | null>(null);

  // idempotency key for new product creates (stable during the modal lifetime)
  const idempotencyKeyRef = useRef<string | null>(null);

  // structured validation errors returned from server (field -> message)
  const [validationErrors, setValidationErrors] = useState<Record<string, string> | null>(null);

  // Confirm modal for unsaved changes
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const pendingCloseRef = useRef<(() => void) | null>(null);

  // defaults derived from company settings
  const defaults = useMemo(() => {
    const compAny = company as any;
    return {
      currency: compAny?.settings?.default_currency ?? "USD",
      tax_inclusive: compAny?.settings?.tax_inclusive_by_default ?? false,
    };
  }, [company]);

  /* -------------- idempotency init -------------- */
  useEffect(() => {
    idempotencyKeyRef.current = idempotencyKeyRef.current ?? uuidv4(); // ensure key exists for the lifetime
  }, []);

  /* -------------- Load product (edit) or initialize new draft -------------- */
  useEffect(() => {
    let mounted = true;

    // If an `initial` draft was provided for a new product scenario, use it.
    if (!productId && initial) {
      try {
        setDraft(normalizeDraftForEditor(initial as Record<string, any>));
        setDirty(false);
        setValidationErrors(null);
        return;
      } catch (e) {
        // fall through to normal init if normalize fails
      }
    }

    (async () => {
      // new product (no productId)
      if (!productId) {
        setDraft({ currency: defaults.currency, is_stockable: true });
        setDirty(false);
        setValidationErrors(null);
        return;
      }

      setLoading(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await apiClient.get(`/hms/products/${encodeURIComponent(productId)}`, { signal: abortRef.current.signal });
        if (!mounted) return;
        setDraft(normalizeDraftForEditor(res.data?.data ?? {}));
        setDirty(false);
        setValidationErrors(null);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        toast.error(err?.message ?? "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [productId, initial, defaults.currency, toast]);

  /* ---------------- Save (create or update) ---------------- */
  const saveDraft = useCallback(
    async (payload: ProductDraft, opts: { force?: boolean; closeAfter?: boolean } = {}) => {
      if (!company) {
        setValidationErrors({ company_id: "Select a company first" });
        toast.error("Select company first");
        throw new Error("No company selected");
      }

      // prevent concurrent saves
      if (saveLockRef.current && !opts.force) {
        // if a save is in progress, allow a forced save to wait for it
        toast.info("Save in progress, waiting...");
        return;
      }

      saveLockRef.current = true;
      setValidationErrors(null);

      // abort previous save if any
      saveAbortRef.current?.abort();
      saveAbortRef.current = new AbortController();
      const signal = saveAbortRef.current.signal;

      try {
        const body: any = { ...payload, company_id: company.id };

        // include any initial inventory batches (if present on draft.inventory.batches)
        // this is optional - backend will persist them into metadata.initial_batches atomically
        if (payload.inventory?.batches && Array.isArray(payload.inventory.batches) && payload.inventory.batches.length) {
          body.inventory = { batches: payload.inventory.batches };
        }

        // include idempotency key for create requests
        const headers: Record<string, string> = {};
        const isCreate = !payload.id;
        if (isCreate && idempotencyKeyRef.current) {
          headers["Idempotency-Key"] = idempotencyKeyRef.current;
        }

        // NOTE: axios supports AbortSignal in recent versions; ensure your axios supports `signal`.
        let res;
        if (payload.id) {
          res = await apiClient.put(`/hms/products/${encodeURIComponent(payload.id)}`, body, { signal, headers });
        } else {
          res = await apiClient.post(`/hms/products`, body, { signal, headers });
        }

        const savedRaw = res?.data?.data ?? null;
        const canonical = savedRaw ? { ...payload, ...savedRaw } : { ...payload };
        const saved = normalizeDraftForEditor(canonical);

        setDraft(saved);
        setDirty(false);
        setValidationErrors(null);

        if (company?.id) queryClient.invalidateQueries({ queryKey: ["products", company.id] });
        onSaved?.(saved);
        toast.success("Saved");

        if (opts.closeAfter) {
          onClose?.();
        }
        return saved;
      } catch (err: any) {
        // handle structured validation errors from server
        const serverErrors = err?.response?.data?.errors ?? null;
        if (Array.isArray(serverErrors)) {
          const map: Record<string, string> = {};
          for (const e of serverErrors) {
            if (e?.field && e?.message) map[e.field] = e.message;
          }
          setValidationErrors(map);
          // show a compact summary toast
          const firstMsg = serverErrors[0]?.message ?? "Validation failed";
          toast.error(firstMsg);
        } else {
          const message = err?.response?.data?.error ?? err?.message ?? "Save failed";
          toast.error(String(message));
        }
        throw err;
      } finally {
        saveLockRef.current = false;
      }
    },
    [company, onSaved, queryClient, toast, onClose]
  );

  /* ---------------- Autosave (debounced) ---------------- */
  const debouncedSave = useDebouncedCallback(async (nextDraft: ProductDraft) => {
    try {
      await saveDraft(nextDraft);
    } catch {
      /* handled by saveDraft toasts/errors */
    }
  }, 1800);

  useEffect(() => {
    if (!dirty) return;
    // don't call if save is locked (to avoid piling up requests) — but still schedule
    debouncedSave(draft);
    return () => {
      const maybeCancel = (debouncedSave as any)?.cancel;
      if (typeof maybeCancel === "function") maybeCancel();
    };
  }, [draft, dirty, debouncedSave]);

  /* ---------------- helpers ---------------- */
  const updateDraft = (patch: Partial<ProductDraft>) => {
    setDraft((d) => {
      const merged = { ...d, ...patch };
      const normalized = normalizeDraftForEditor(merged as Record<string, any>);
      return normalized;
    });
    setDirty(true);
  };

  const onManualSave = async () => {
    setLoading(true);
    try {
      await saveDraft(draft, { force: true });
    } finally {
      setLoading(false);
    }
  };

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!loading && dirty) onManualSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, loading, onManualSave]);

  // Tabs (no accounting)
  const tabs = useMemo(
    () => [
      { name: "General", icon: Zap },
      { name: "Inventory", icon: Truck },
      { name: "Variants", icon: Layers },
      { name: "Pricing", icon: DollarSign },
      { name: "AI Assist", icon: Zap },
    ],
    []
  );

  /* ---------------- Close handling ---------------- */
  const handleCloseAttempt = () => {
    if (dirty) {
      pendingCloseRef.current = onClose ?? null;
      setConfirmDiscardOpen(true);
      return;
    }
    onClose?.();
  };

  const confirmDiscard = () => {
    setConfirmDiscardOpen(false);
    setDirty(false);
    const toCall = pendingCloseRef.current;
    pendingCloseRef.current = null;
    toCall?.();
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center p-6 overflow-auto" style={{ background: "rgba(15,23,42,0.55)" }}>
      <style>{`
        :root {
          --glass-surface: rgba(255,255,255,0.92);
          --glass-border: rgba(15,23,42,0.06);
        }
        .product-editor * { color: #0f172a; }
        .product-editor input,
        .product-editor textarea,
        .product-editor select,
        .product-editor .react-select__control {
          color: #0f172a !important;
          background-color: var(--glass-surface) !important;
          border: 1px solid var(--glass-border) !important;
        }
        .product-editor input::placeholder,
        .product-editor textarea::placeholder {
          color: rgba(15,23,42,0.45) !important;
        }
      `}</style>

      <motion.div
        layout
        className="product-editor w-full max-w-6xl rounded-3xl border shadow-2xl p-6"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        style={{ background: "var(--glass-surface)", borderColor: "rgba(255,255,255,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleCloseAttempt} className="p-2 rounded-full bg-white/60 hover:bg-white/80 border border-white/10" aria-label="Close editor">
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{productId ? "Edit product" : "Create product"}</h3>
              <p className="text-xs text-slate-500">Neural Glass — product editor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <CompanySelector />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onManualSave}
                disabled={loading || !dirty || saveLockRef.current}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm ${loading || !dirty ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"}`}
                title="Save (Ctrl/Cmd+S)"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => {
                  setDraft({ currency: defaults.currency, is_stockable: true });
                  setDirty(false);
                  setValidationErrors(null);
                  toast.info("Cleared fields");
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* validation banner */}
        {validationErrors && (
          <div className="mt-3 rounded-lg p-3 bg-rose-50 border border-rose-100 text-rose-700">
            <div className="font-medium">Validation errors</div>
            <ul className="mt-1 ml-3 list-disc text-sm">
              {Object.entries(validationErrors).map(([k, v]) => (
                <li key={k}>
                  <strong className="capitalize">{k}</strong>: {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs */}
        <Tab.Group selectedIndex={activeIndex} onChange={setActiveIndex}>
          <div className="mt-4 grid grid-cols-12 gap-6">
            <aside className="col-span-3">
              <Tab.List className="space-y-2">
                {tabs.map((t) => (
                  <Tab as={React.Fragment} key={t.name}>
                    {({ selected }) => (
                      <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${selected ? "bg-white/80 ring-1 ring-blue-300 shadow" : "bg-white/60 hover:bg-white/70"}`}>
                        <t.icon className="w-4 h-4 text-slate-700" />
                        <span className="flex-1 text-slate-900">{t.name}</span>
                        {selected && <span className="ml-auto text-xs text-slate-500">●</span>}
                      </button>
                    )}
                  </Tab>
                ))}
              </Tab.List>

              <div className="mt-6 p-3 rounded-xl bg-white/75 border border-slate-100">
                <div className="text-xs text-slate-600">Quick actions</div>
                <div className="mt-3 flex flex-col gap-2">
                  <button onClick={() => { setActiveIndex(0); toast.info("Jumped to General"); }} className="text-sm px-3 py-2 rounded-md bg-white/90 text-slate-900">Edit basic info</button>
                  <button onClick={() => { setActiveIndex(2); toast.info("Jumped to Variants"); }} className="text-sm px-3 py-2 rounded-md bg-white/90 text-slate-900">Manage variants</button>
                </div>
              </div>
            </aside>

            <section className="col-span-9">
              <div className="rounded-2xl border p-4 shadow-sm text-slate-900" style={{ background: "var(--glass-surface)" }}>
                <Tab.Panels>
                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6 text-slate-600">Loading General…</div>}>
                      <GeneralTab draft={draft} onChange={(update) => updateDraft(update)} onRequestSave={() => onManualSave()} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6 text-slate-600">Loading Inventory…</div>}>
                      <InventoryTab draft={draft} onChange={(update) => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6 text-slate-600">Loading Variants…</div>}>
                      <VariantsTab draft={draft} onChange={(update) => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6 text-slate-600">Loading Pricing…</div>}>
                      <PricingTab draft={draft} onChange={(update) => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6 text-slate-600">Loading AI Assist…</div>}>
                      <AIAssistTab draft={draft} onChange={(update) => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>
                </Tab.Panels>
              </div>
            </section>
          </div>
        </Tab.Group>
      </motion.div>

      {/* Discard confirm modal */}
      <ConfirmModal
        open={confirmDiscardOpen}
        title="Discard changes?"
        description="You have unsaved changes. Discard and close the editor?"
        confirmLabel="Discard"
        cancelLabel="Cancel"
        loading={false}
        onConfirm={confirmDiscard}
        onCancel={() => setConfirmDiscardOpen(false)}
      />
    </div>
  );
}
