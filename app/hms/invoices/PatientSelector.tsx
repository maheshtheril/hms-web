"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Search, User } from "lucide-react";

type Patient = {
  id: string;
  display_name?: string; // could be name or identifier in your data
  phone?: string | null;
  dob?: string | null;
};

export default function PatientSelector({
  value,
  onChange,
  placeholder = "Search patient by name / id / phone",
}: {
  value?: string | null;
  onChange: (id: string | null, display?: string | null) => void;
  placeholder?: string;
}) {
  const toast = useToast();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // if value present, try to fetch display label once
    let mounted = true;
    async function fetchLabel() {
      if (!value || !company) {
        setSelectedLabel(null);
        return;
      }
      try {
        const res = await apiClient.get(`/hms/patients/${encodeURIComponent(value)}`);
        if (!mounted) return;
        const p = res.data?.data ?? res.data;
        setSelectedLabel(p?.display_name ?? p?.name ?? p?.id ?? null);
      } catch (err: any) {
        console.warn("patient label fetch", err);
      }
    }
    fetchLabel();
    return () => { mounted = false; };
    // eslint-disable-next-line
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
      params.set("limit", "25");
      params.set("company_id", company.id);

      const res = await apiClient.get(`/hms/patients?${params.toString()}`, { signal: abortRef.current.signal });
      setResults(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("search patients", err);
      toast.error("Failed to search patients");
    } finally {
      setLoading(false);
    }
  }

  function onQueryChange(v: string) {
    setQ(v);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      search(v);
    }, 300);
  }

  function pick(p: Patient) {
    setSelectedLabel(p.display_name ?? p.id);
    onChange(p.id, p.display_name ?? p.id);
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
              <User size={16} />
              <div className="text-sm">
                {selectedLabel ?? placeholder}
              </div>
            </div>
            <div className="text-xs text-slate-500">{value ? "Change" : "Select"}</div>
          </button>
        </div>

        <button onClick={clear} className="px-3 py-2 rounded-xl border">Clear</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-8">
          <div className="w-[720px] max-w-full bg-white rounded-2xl shadow-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold">Select Patient</div>
                <div className="text-sm text-slate-500">Search by name, id or phone</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="px-3 py-1 rounded-xl border">Close</button>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 flex-1">
                  <Search size={16} />
                  <input value={q} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search patients..." className="bg-transparent outline-none w-full" />
                </div>
                <button onClick={() => search(q)} className="px-3 py-2 rounded-xl border">Search</button>
              </div>
            </div>

            <div className="mt-4 max-h-[420px] overflow-auto">
              {loading ? <div className="p-4 text-center">Searching...</div> : (
                <div className="space-y-2">
                  {results.length === 0 ? <div className="p-4 text-slate-500">No results</div> : results.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl border flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.display_name ?? p.id}</div>
                        <div className="text-xs text-slate-500">{p.phone ?? p.dob ?? ""}</div>
                      </div>
                      <div>
                        <button onClick={() => pick(p)} className="px-3 py-1 rounded-xl bg-blue-600 text-white">Select</button>
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
