"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tab } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { useToast } from "@/components/toast/ToastProvider";
import { ArrowLeft, Save, Zap, Layers, Truck, DollarSign, CreditCard } from "lucide-react";
import apiClient from "@/lib/api-client";
import CompanySelector from "@/components/CompanySelector";
import { useCompany } from "@/app/providers/CompanyProvider";

// Tabs are lazy — implement each tab as its own file: GeneralTab, InventoryTab, VariantsTab, PricingTab, AccountingTab, AIAssistTab
const GeneralTab = React.lazy(() => import("./GeneralTab"));
const InventoryTab = React.lazy(() => import("./InventoryTab"));
const VariantsTab = React.lazy(() => import("./VariantsTab"));
const PricingTab = React.lazy(() => import("./PricingTab"));
const AccountingTab = React.lazy(() => import("./AccountingTab"));
const AIAssistTab = React.lazy(() => import("./AIAssistTab"));

export type ProductDraft = {
  id?: string;
  name?: string | null;
  sku?: string | null;
  description?: string | null;
  // allow null because forms often set null for emptied numeric fields
  price?: number | null;
  // currency may be null while user is editing
  currency?: string | null;
  is_stockable?: boolean | null;
  attributes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};


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

  // fetch product if editing
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
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') toast.error(err?.message ?? 'Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; abortRef.current?.abort(); };
  }, [productId, toast]);

  // debounced autosave (best practice for ERP forms)
  const saveDraft = useCallback(async (payload: ProductDraft) => {
    if (!company) return toast.error('Select company first');
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
      queryClient.invalidateQueries({ queryKey: ["products", company.id] });

      onSaved?.(saved);
      toast.success('Saved');
      return saved;
    } catch (err: any) {
      toast.error(err?.message ?? 'Save failed');
      throw err;
    }
  }, [company, onSaved, queryClient, toast]);

  const debouncedSave = useDebouncedCallback(async (nextDraft: ProductDraft) => {
    try { await saveDraft(nextDraft); } catch (e) { /* handled above */ }
  }, 2000);

  // when draft changes, mark dirty and autosave
  useEffect(() => {
    if (!dirty) return; // only autosave if user changed something
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

  const tabs = useMemo(() => [
    { name: 'General', icon: Zap },
    { name: 'Inventory', icon: Truck },
    { name: 'Variants', icon: Layers },
    { name: 'Pricing', icon: DollarSign },
    { name: 'Accounting', icon: CreditCard },
    { name: 'AI Assist', icon: Zap },
  ], []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-auto bg-slate-900/40 backdrop-blur-md">
      <motion.div layout className="w-full max-w-6xl rounded-3xl border border-white/20 bg-white/50 backdrop-blur-xl shadow-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => onClose?.()} className="p-2 rounded-full bg-white/30 hover:bg-white/50">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{productId ? 'Edit product' : 'Create product'}</h3>
              <p className="text-xs text-slate-500">Neural Glass — advanced product editor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CompanySelector />
            <div className="flex items-center gap-2">
              <button onClick={onManualSave} disabled={loading || !dirty} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={() => { setDraft({}); setDirty(false); }} className="px-3 py-2 rounded-xl border">Reset</button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-12 gap-6">
          <aside className="col-span-3">
            <Tab.Group selectedIndex={activeIndex} onChange={setActiveIndex}>
              <Tab.List className="space-y-2">
                {tabs.map((t, i) => (
                  <Tab as={React.Fragment} key={t.name}>
                    {({ selected }) => (
                      <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl ${selected ? 'bg-white/60 ring-1 ring-blue-300' : 'bg-white/30'} text-sm`}>
                        <t.icon className="w-4 h-4" />
                        {t.name}
                        {selected && <span className="ml-auto text-xs text-slate-500">●</span>}
                      </button>
                    )}
                  </Tab>
                ))}
              </Tab.List>
            </Tab.Group>

            <div className="mt-6 p-3 rounded-xl bg-white/30 border"> 
              <div className="text-xs text-slate-600">Quick actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <button onClick={() => { setActiveIndex(0); toast.info('Jumped to General'); }} className="text-sm px-3 py-2 rounded-md bg-white/50">Edit basic info</button>
                <button onClick={() => { setActiveIndex(2); toast.info('Jumped to Variants'); }} className="text-sm px-3 py-2 rounded-md bg-white/50">Manage variants</button>
              </div>
            </div>
          </aside>

          <section className="col-span-9">
            <div className="rounded-2xl bg-white/40 border p-4 shadow-sm">
              <Tab.Group selectedIndex={activeIndex} onChange={setActiveIndex}>
                <Tab.Panels>
                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6">Loading General…</div>}>
                      <GeneralTab draft={draft} onChange={update => updateDraft(update)} onRequestSave={() => onManualSave()} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6">Loading Inventory…</div>}>
                      <InventoryTab draft={draft} onChange={update => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6">Loading Variants…</div>}>
                      <VariantsTab draft={draft} onChange={update => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6">Loading Pricing…</div>}>
                      <PricingTab draft={draft} onChange={update => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6">Loading Accounting…</div>}>
                      <AccountingTab draft={draft} onChange={update => updateDraft(update)} />
                    </Suspense>
                  </Tab.Panel>

                  <Tab.Panel>
                    <Suspense fallback={<div className="p-6">Loading AI Assist…</div>}>
                      <AIAssistTab draft={draft} onChange={update => updateDraft(update)} />
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
