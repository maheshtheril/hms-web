"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { motion } from "framer-motion";

export default function AdmissionDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, []);

  async function fetch() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/hms/admissions/${encodeURIComponent(params.id)}`);
      setAd(res.data);
    } catch (e: any) {
      console.error(e);
      setErr("Failed to load admission");
    } finally { setLoading(false); }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (err) return <div className="p-6 text-rose-600">{err}</div>;
  if (!ad) return <div className="p-6">Not found</div>;

  const meta = ad.metadata ?? {};

  return (
    <div className="min-h-screen p-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{ad.patient_name ?? "Patient"}</h1>
            <div className="text-sm text-slate-500">{ad.ward ?? "—"} • Bed {ad.bed ?? "—"}</div>
          </div>
          <div className="text-sm text-slate-400">{new Date(ad.admitted_at).toLocaleString()}</div>
        </div>

        <div className="mt-4 grid gap-2">
          <div><div className="text-xs text-slate-500">Encounter</div><div className="text-sm">{ad.encounter_id ?? "—"}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><div className="text-sm">{ad.status ?? "admitted"}</div></div>
          <div><div className="text-xs text-slate-500">Notes</div><div className="text-sm whitespace-pre-wrap">{meta.notes ?? "—"}</div></div>
          {meta.discharge_notes && (<div><div className="text-xs text-slate-500">Discharge notes</div><div className="text-sm">{meta.discharge_notes}</div></div>)}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border">Back</button>
        </div>
      </motion.div>
    </div>
  );
}
