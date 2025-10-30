"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { motion } from "framer-motion";

export default function EncounterDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [enc, setEnc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await apiClient.get(`/hms/encounters/${encodeURIComponent(params.id)}`);
      setEnc(res.data);
    } catch (e: any) {
      console.error(e);
      setErr("Failed to load encounter");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (err) return <div className="p-6 text-rose-600">{err}</div>;
  if (!enc) return <div className="p-6">Not found</div>;

  const meta = enc.metadata ?? {};

  return (
    <div className="min-h-screen p-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{enc.patient_name ?? "Patient"}</h1>
            <div className="text-sm text-slate-500">{enc.clinician_name ?? "Clinician"}</div>
          </div>
          <div className="text-sm text-slate-400">{new Date(enc.started_at).toLocaleString()}</div>
        </div>

        <div className="mt-4 grid gap-2">
          <div>
            <div className="text-xs text-slate-500">Reason</div>
            <div className="text-sm">{meta.reason ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Notes</div>
            <div className="text-sm whitespace-pre-wrap">{meta.notes ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Appointment ID</div>
            <div className="text-sm">{meta.appointment_id ?? "—"}</div>
          </div>

          <div className="mt-2">
            <div className="text-xs text-slate-500">Status</div>
            <div className="text-sm">{meta.status ?? (enc.ended_at ? "closed" : "active")}</div>
          </div>

          {meta.outcome && (
            <div>
              <div className="text-xs text-slate-500">Outcome</div>
              <div className="text-sm">{meta.outcome}</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border">Back</button>
        </div>
      </motion.div>
    </div>
  );
}
