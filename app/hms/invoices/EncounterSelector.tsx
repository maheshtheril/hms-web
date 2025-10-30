"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";
import { useCompany } from "@/app/providers/CompanyProvider";
import { Calendar } from "lucide-react";

type Encounter = {
  id: string;
  patient_id?: string;
  clinician_id?: string;
  started_at?: string;
  metadata?: any;
};

export default function EncounterSelector({
  value,
  onChange,
  patientId, // optional: restrict encounters to patient
  placeholder = "Select encounter (optional)",
}: {
  value?: string | null;
  onChange: (id: string | null) => void;
  patientId?: string | null;
  placeholder?: string;
}) {
  const toast = useToast();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchLabel() {
      if (!value) { setSelectedLabel(null); return; }
      try {
        const res = await apiClient.get(`/hms/encounters/${encodeURIComponent(value)}`);
        if (!mounted) return;
        const enc = res.data?.data ?? res.data;
        setSelectedLabel(enc?.id ?? enc?.started_at ?? value);
      } catch (err) {
        // ignore
      }
    }
    fetchLabel();
    return () => { mounted = false; };
  }, [value]);

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
      params.set("limit", "40");
      params.set("company_id", company.id);
      if (patientId) params.set("patient_id", patientId);

      const res = await apiClient.get(`/hms/encounters?${params.toString()}`, { signal: abortRef.current.signal });
      setResults(res.data?.data ?? []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") return;
      console.error("search encounters", err);
      toast.error("Failed to search encounters");
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

  function pick(e: Encounter) {
    setSelectedLabel(e.id);
    onChange(e.id);
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
          <button onClick={() => setOpen(true)} className="w-full text-left px-3 py-2 rounded-xl border bg-white/90 inline-flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <div className="text-sm">{selectedLabel ?? placeholder}</div>
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
              <div>
                <div className="text-lg font-semibold">Select Encounter</div>
                <div className="text-sm text-slate-500">Recent encounters{patientId ? " — filtered by patient" : ""}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="px-3 py-1 rounded-xl border">Close</button>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex gap-2">
                <input value={q} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search encounters by id, clinician, notes..." className="flex-1 px-3 py-2 rounded-xl border" />
                <button onClick={() => search(q)} className="px-3 py-2 rounded-xl border">Search</button>
              </div>
            </div>

            <div className="mt-4 max-h-[420px] overflow-auto">
              {loading ? <div className="p-4 text-center">Searching...</div> : (
                <div className="space-y-2">
                  {results.length === 0 ? <div className="p-4 text-slate-500">No encounters found</div> : results.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border flex items-center justify-between">
                      <div>
                        <div className="font-medium">{e.id}</div>
                        <div className="text-xs text-slate-500">{e.started_at ? new Date(e.started_at).toLocaleString() : ""} {e.patient_id ? `• ${e.patient_id}` : ""}</div>
                      </div>
                      <div>
                        <button onClick={() => pick(e)} className="px-3 py-1 rounded-xl bg-blue-600 text-white">Select</button>
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
