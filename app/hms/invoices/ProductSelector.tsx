"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Search } from "lucide-react";

type Product = {
  id: string;
  sku?: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  uom?: string | null;
  is_stockable?: boolean;
  metadata?: any;
};

export default function ProductSelector({
  value,
  onChange,
  placeholder = "Select product",
}: {
  value?: string | null;
  onChange: (p: Product | null) => void;
  placeholder?: string;
}) {
  const toast = useToast();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // fetch selected label if value present
    let mounted = true;
    async function fetchLabel() {
      if (!value || !company) { setSelectedLabel(null); return; }
      try {
        const res = await apiClient.get(`/hms/products/${encodeURIComponent(value)}`);
        if (!mounted) return;
        const p = res.data?.data ?? res.data;
        setSelectedLabel(p?.name ?? p?.sku ?? p?.id ?? null);
      } catch {
        // ignore
      }
    }
    fetchLabel();
    return () => { mounted = false; };
  }, [value, company]);

  async function search(qs: string) {
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      if (!company) {
        setResults([]);
        return;
      }
      const params = new URLSearchParams();
      if (qs) params.set("q", qs);
      params.set("limit", "30");
      params.set("company_id", company.id);

      const res = await apiClient.get(`/hms/products?${params.toString()}`, { signal: abortRef.current.signal });
      setResults(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("search products", err);
      toast.error("Failed to search products");
    } finally {
      setLoading(false);
    }
  }

  function onQueryChange(v: string) {
    setQ(v);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { search(v); }, 250);
  }

  function pick(p: Product) {
    setSelectedLabel(p.name ?? p.sku ?? p.id);
    onChange(p);
    setOpen(false);
  }

  function clear() {
    setSelectedLabel(null);
    onChange(null);
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <button
            onClick={() => setOpen(true)}
            className="w-full text-left px-3 py-2 rounded-xl border bg-white/90 inline-flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Search size={16} />
              <div className="text-sm">{selectedLabel ?? placeholder}</div>
            </div>
            <div className="text-xs text-slate-500">{value ? "Change" : "Select"}</div>
          </button>
        </div>
        <button onClick={clear} className="px-3 py-2 rounded-xl border">Clear</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-8">
          <div className="w-[760px] max-w-full bg-white rounded-2xl shadow-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold">Select Product</div>
                <div className="text-sm text-slate-500">Search catalog</div>
              </div>
              <div>
                <button onClick={() => setOpen(false)} className="px-3 py-1 rounded-xl border">Close</button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 flex-1">
                <Search size={16} />
                <input className="bg-transparent outline-none w-full" value={q} onChange={(e)=>onQueryChange(e.target.value)} placeholder="Search by name or sku" />
              </div>
              <button onClick={() => search(q)} className="px-3 py-2 rounded-xl border">Search</button>
            </div>

            <div className="mt-4 max-h-[420px] overflow-auto">
              {loading ? <div className="p-4 text-center">Searching...</div> : (
                <div className="space-y-2">
                  {results.length === 0 ? <div className="p-4 text-slate-500">No products</div> : results.map(p => (
                    <div key={p.id} className="p-3 rounded-xl border flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.name ?? p.sku ?? p.id}</div>
                        <div className="text-xs text-slate-500">{p.sku ?? ""} {p.price ? `• ${Number(p.price).toFixed(2)}` : ""}</div>
                        <div className="text-xs text-slate-400">{p.description ?? ""}</div>
                      </div>
                      <div>
                        <button onClick={()=>pick(p)} className="px-3 py-1 rounded-xl bg-blue-600 text-white">Select</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
