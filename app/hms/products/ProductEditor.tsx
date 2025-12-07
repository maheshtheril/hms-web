// app/hms/products/ProductEditor.tsx
"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tab } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { useToast } from "@/components/toast/ToastProvider";
import { ArrowLeft, Save, Zap, Layers, Truck, DollarSign, CreditCard } from "lucide-react";
import apiClient from "@/lib/api-client";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";
import type { ProductDraft } from "./types"; // centralized shared type

// Helper: ensure editor state never contains `null` for string fields.
// Accepts raw object (API may return nulls) and returns a ProductDraft
function normalizeDraftForEditor(raw: Record<string, any> | undefined | null): ProductDraft {
  const out: any = {};
  if (!raw || typeof raw !== "object") {
    return out;
  }

  // Copy everything first
  Object.assign(out, raw);

  // String fields that should be undefined (not null)
  const stringKeys: (keyof ProductDraft)[] = ["name", "sku", "description", "currency"];
  for (const k of stringKeys) {
    if (out[k] === null) out[k] = undefined;
  }

  // boolean/number fields: prefer undefined for editor state
  if (out.price === null) out.price = undefined;
  if (out.is_stockable === null) out.is_stockable = undefined;

  return out as ProductDraft;
}

// --- Lazy tabs (correct relative paths)
const GeneralTab = React.lazy(() => import("./GeneralTab"));
const InventoryTab = React.lazy(() => import("./InventoryTab"));
const VariantsTab = React.lazy(() => import("./VariantsTab"));
const PricingTab = React.lazy(() => import("./PricingTab"));
const AccountingTab = React.lazy(() => import("./AccountingTab"));
const AIAssistTab = React.lazy(() => import("./AIAssistTab"));

interface ProductEditorProps {
  productId?: string | null;
  onClose?: () => void;
  onSaved?: (p: ProductDraft) => void;
}

export default function ProductEditor({ productId = null, onClose, onSaved }: ProductEditorProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  const [activeIndex, setActiveIndex] = useState<number>(0);
  // keep editor draft typed to shared ProductDraft
  const [draft, setDraft] = useState<ProductDraft>({});
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // --- Defaults derived from company settings (currency, tax_inclusive)
  // company from provider may have a minimal type; cast to any for safe access
  const defaults = useMemo(() => {
    const compAny = company as any;
    return {
      currency: compAny?.settings?.default_currency ?? "USD",
      tax_inclusive: compAny?.settings?.tax_inclusive_by_default ?? false,
    };
  }, [company]);

  // Load product if editing
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!productId) {
        // creating new product -> clear draft
        setDraft({});
        setDirty(false);
        return;
      }
      setLoading(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const res = await apiClient.get(`/hms/products/${encodeURIComponent(productId)}`, {
          signal: abortRef.current.signal,
        });
        if (!mounted) return;
        // Normalize API nulls to undefined for editor usage
        setDraft(normalizeDraftForEditor(res.data?.data ?? {}));
        setDirty(false);
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.name !== "AbortError")
          toast.error(err?.message ?? "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [productId, toast]);

  // Save (create or update)
  const saveDraft = useCallback(
    async (payload: ProductDraft) => {
      if (!company) {
        toast.error("Select company first");
        throw new Error("No company selected");
      }
      try {
        // Prepare body: send nulls only for fields intentionally set to null
        // ensure company_id present for creation
        const body: any = { ...payload, company_id: company.id };

        let res;
        if (payload.id) {
          res = await apiClient.put(`/hms/products/${encodeURIComponent(payload.id)}`, body);
        } else {
          res = await apiClient.post(`/hms/products`, body);
        }

        // prefer canonical server record if returned
        const savedRaw = res?.data?.data ?? null;
        const canonical = savedRaw ? { ...payload, ...savedRaw } : { ...payload };
        const saved = normalizeDraftForEditor(canonical);
        setDraft(saved);
        setDirty(false);

        // invalidate product list cache for current company
        if (company?.id) queryClient.invalidateQueries({ queryKey: ["products", company.id] });

        onSaved?.(saved);
        toast.success("Saved");
        return saved;
      } catch (err: any) {
        toast.error(err?.message ?? "Save failed");
        throw err;
      }
    },
    [company, onSaved, queryClient, toast]
  );

  // Autosave debounce (cancelable)
  const debouncedSave = useDebouncedCallback(async (nextDraft: ProductDraft) => {
    try {
      await saveDraft(nextDraft);
    } catch {
      /* handled by saveDraft toast */
    }
  }, 1800);

  // trigger autosave when dirty, cancel on unmount or when draft changes
  useEffect(() => {
    if (!dirty) return;
    debouncedSave(draft);

    return () => {
      // cancel pending debounced save when component unmounts / draft changes
      const maybeCancel = (debouncedSave as any)?.cancel;
      if (typeof maybeCancel === "function") maybeCancel();
    };
  }, [draft, dirty, debouncedSave]);

  const updateDraft = (patch: Partial<ProductDraft>) => {
    setDraft((d) => {
      const merged = { ...d, ...patch };
      // ensure string nulls are converted to undefined for editor consistency
      const normalized = normalizeDraftForEditor(merged as Record<string, any>);
      return normalized;
    });
    setDirty(true);
  };

  const onManualSave = async () => {
    setLoading(true);
    try {
      await saveDraft(draft);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl/Cmd+S
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

  const tabs = useMemo(
    () => [
      { name: "General", icon: Zap },
      { name: "Inventory", icon: Truck },
      { name: "Variants", icon: Layers },
      { name: "Pricing", icon: DollarSign },
      { name: "Accounting", icon: CreditCard },
      { name: "AI Assist", icon: Zap },
    ],
    []
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center p-6 overflow-auto" style={{ background: "rgba(15,23,42,0.55)" }}>
      <style>{`
        :root {
          --glass-surface: rgba(255,255,255,0.9);
          --glass-accent: rgba(79,70,229,1); /* indigo-600 */
          --glass-muted: rgba(15,23,42,0.45);
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
          color: var(--glass-muted) !important;
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
            <button
              onClick={() => {
                if (dirty && !confirm("You have unsaved changes. Discard?")) return;
                onClose?.();
              }}
              className="p-2 rounded-full bg-white/60 hover:bg-white/80 border border-white/10"
              aria-label="Close editor"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{productId ? "Edit product" : "Create product"}</h3>
              <p className="text-xs text-slate-500">Neural Glass — advanced product editor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <CompanySelector />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onManualSave}
                disabled={loading || !dirty}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm ${
                  loading || !dirty ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                }`}
                title="Save (Ctrl/Cmd+S)"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => {
                  setDraft({});
                  setDirty(false);
                  toast.info("Cleared fields");
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Layout - SINGLE Tab.Group wrapping both List and Panels */}
        <Tab.Group selectedIndex={activeIndex} onChange={setActiveIndex}>
          <div className="mt-4 grid grid-cols-12 gap-6">
            <aside className="col-span-3">
              <Tab.List className="space-y-2">
                {tabs.map((t) => (
                  <Tab as={React.Fragment} key={t.name}>
                    {({ selected }) => (
                      <button
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                          selected ? "bg-white/80 ring-1 ring-blue-300 shadow" : "bg-white/60 hover:bg-white/70"
                        }`}
                      >
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
                  <button
                    onClick={() => {
                      setActiveIndex(0);
                      toast.info("Jumped to General");
                    }}
                    className="text-sm px-3 py-2 rounded-md bg-white/90 text-slate-900"
                  >
                    Edit basic info
                  </button>
                  <button
                    onClick={() => {
                      setActiveIndex(2);
                      toast.info("Jumped to Variants");
                    }}
                    className="text-sm px-3 py-2 rounded-md bg-white/90 text-slate-900"
                  >
                    Manage variants
                  </button>
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
                    <Suspense fallback={<div className="p-6 text-slate-600">Loading Accounting…</div>}>
                      <AccountingTab draft={draft} onChange={(update) => updateDraft(update)} />
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
    </div>
  );
}
