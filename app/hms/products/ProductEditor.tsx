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
import { ProductDraft } from "./types"; // <-- shared type

// lazy tabs (unchanged)
const GeneralTab = React.lazy(() => import("./GeneralTab"));
const InventoryTab = React.lazy(() => import("./InventoryTab"));
const VariantsTab = React.lazy(() => import("./VariantsTab"));
const PricingTab = React.lazy(() => import("./PricingTab"));
const AccountingTab = React.lazy(() => import("./AccountingTab"));
const AIAssistTab = React.lazy(() => import("./AIAssistTab"));

interface ProductEditorProps {
  productId?: string | null; // null => create
  onClose?: () => void;
  onSaved?: (p: ProductDraft) => void;
}

export default function ProductEditor({ productId = null, onClose, onSaved }: ProductEditorProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [draft, setDraft] = useState<ProductDraft>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);

  // load product when editing
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!productId) return;
      setLoading(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const res = await apiClient.get(`/hms/products/${encodeURIComponent(productId)}`, { signal: abortRef.current.signal });
        if (!mounted) return;
        setDraft(res.data?.data ?? {});
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.name !== "AbortError") toast.error(err?.message ?? "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [productId, toast]);

  // save (create or update)
  const saveDraft = useCallback(
    async (payload: ProductDraft) => {
      if (!company) return toast.error("Select company first");
      try {
        const body = { ...payload, company_id: company.id };
        let res;
        if (payload.id) {
          res = await apiClient.put(`/hms/products/${encodeURIComponent(payload.id)}`, body);
        } else {
          res = await apiClient.post(`/hms/products`, body);
        }
        const saved: ProductDraft = res.data?.data ?? payload;
        setDraft(saved);
        setDirty(false);
        // invalidate product lists for current company
        queryClient.invalidateQueries({ queryKey: ["products", company.id] });
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

  // autosave debounce
  const debouncedSave = useDebouncedCallback(async (nextDraft: ProductDraft) => {
    try {
      await saveDraft(nextDraft);
    } catch {
      /* handled in saveDraft */
    }
  }, 1800);

  useEffect(() => {
    if (!dirty) return;
    debouncedSave(draft);
  }, [draft, dirty, debouncedSave]);

  const updateDraft = (patch: Partial<ProductDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
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

  // keyboard shortcut: Ctrl/Cmd+S
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
    <div className="fixed inset-0 z-[2000] flex items-start justify-center p-6 overflow-auto bg-slate-900/55 backdrop-blur-lg">
      {/* enforce readable form controls via scoped styles */}
      <style>{`
        /* Force strong contrast for all form controls inside the editor */
        .product-editor * { color: #0f172a; }
        .product-editor input,
        .product-editor textarea,
        .product-editor select,
        .product-editor .react-select__control {
          color: #0f172a !important;
          background-color: rgba(255,255,255,0.92) !important;
          border: 1px solid rgba(15,23,42,0.06) !important;
          box-shadow: none !important;
        }
        .product-editor input::placeholder, .product-editor textarea::placeholder {
          color: rgba(15,23,42,0.45) !important;
        }
        .product-editor button:focus, .product-editor input:focus, .product-editor textarea:focus, .product-editor select:focus {
          outline: 3px solid rgba(59,130,246,0.18);
          outline-offset: 2px;
        }
        /* ensure icons & small text are visible */
        .product-editor .tab-button { color: #0f172a; }
      `}</style>

      <motion.div
        layout
        className="product-editor w-full max-w-6xl rounded-3xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl p-6"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onClose?.()}
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
                  loading || !dirty
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
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

        <div className="mt-4 grid grid-cols-12 gap-6">
          <aside className="col-span-3">
            <Tab.Group selectedIndex={activeIndex} onChange={setActiveIndex}>
              <Tab.List className="space-y-2">
                {tabs.map((t) => (
                  <Tab as={React.Fragment} key={t.name}>
                    {({ selected }) => (
                      <button
                        className={`tab-button w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                          selected
                            ? "bg-white/80 ring-1 ring-blue-300 shadow"
                            : "bg-white/60 hover:bg-white/70"
                        }`}
                        aria-pressed={selected}
                      >
                        <t.icon className="w-4 h-4 text-slate-700" />
                        <span className="flex-1 text-slate-900">{t.name}</span>
                        {selected && <span className="ml-auto text-xs text-slate-500">●</span>}
                      </button>
                    )}
                  </Tab>
                ))}
              </Tab.List>
            </Tab.Group>

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
            <div className="rounded-2xl bg-white/95 border p-4 shadow-sm text-slate-900">
              <Tab.Group selectedIndex={activeIndex} onChange={setActiveIndex}>
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
              </Tab.Group>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
