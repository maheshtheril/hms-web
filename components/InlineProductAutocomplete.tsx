"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Search } from "lucide-react";

/**
 * InlineProductAutocomplete
 * props:
 * - value?: string | null  (product id)
 * - onSelect(product | null)
 * - placeholder?: string
 */
export default function InlineProductAutocomplete({
  value,
  onSelect,
  placeholder = "Product name or SKU",
}: {
  value?: string | null;
  onSelect: (p: any | null) => void;
  placeholder?: string;
}) {
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // if value exists, optionally fetch label once (non-blocking)
  useEffect(() => {
    let mounted = true;
    async function fetchLabel() {
      if (!value || !company) return;
      try {
        const res = await apiClient.get(`/hms/products/${encodeURIComponent(value)}`);
        if (!mounted) return;
        setQuery(res.data?.data?.name ?? res.data?.name ?? "");
      } catch {
        // ignore
      }
    }
    fetchLabel();
    return () => { mounted = false; };
  }, [value, company]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function search(qs: string) {
    if (!company) {
      setResults([]);
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const params = new URLSearchParams();
      if (qs) params.set("q", qs);
      params.set("limit", "12");
      params.set("company_id", company.id);

      const res = await apiClient.get(`/hms/products?${params.toString()}`, { signal: abortRef.current.signal });
      setResults(res.data?.data ?? []);
      setActive(0);
      setOpen(true);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("product autocomplete search", err);
    } finally {
      setLoading(false);
    }
  }

  function onChange(v: string) {
    setQuery(v);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      search(v);
    }, 220);
  }

  function choose(p: any) {
    setQuery(p?.name ?? p?.sku ?? "");
    setOpen(false);
    onSelect(p);
  }

  function clear() {
    setQuery("");
    onSelect(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown") {
        search(query);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => { if (query) search(query); }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-xl border"
            />
            <div className="absolute left-2 top-2 text-slate-400 pointer-events-none">
              <Search size={14} />
            </div>
          </div>
        </div>
        <button onClick={() => { if (!query) search(""); else clear(); }} className="px-3 py-1 rounded-xl border">
          {query ? "Clear" : "Pick"}
        </button>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-auto bg-white rounded-xl shadow-lg border">
          <div className="divide-y">
            {results.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => choose(p)}
                onMouseEnter={() => setActive(idx)}
                className={`w-full text-left p-3 flex items-center justify-between ${idx === active ? "bg-slate-100" : ""}`}
              >
                <div>
                  <div className="font-medium">{p.name ?? p.sku ?? p.id}</div>
                  <div className="text-xs text-slate-500">{p.sku ?? ""} {p.description ? `• ${p.description.slice(0, 80)}` : ""}</div>
                </div>
                <div className="text-sm font-mono">{p.price ? Number(p.price).toFixed(2) : ""}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
