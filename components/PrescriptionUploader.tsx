"use client";
import React, { useRef, useState } from "react";

export type PrescriptionLine = { id?: string; product_name: string; qty?: number; note?: string; suggested_product_ids?: string[] };
export type PrescriptionPayload = { id?: string; patient_id?: string | null; doctor_id?: string | null; patient_name?: string | null; doctor_name?: string | null; lines?: PrescriptionLine[] };

export default function PrescriptionUploader({ onPrescriptionLoaded }: { onPrescriptionLoaded: (p: PrescriptionPayload | null) => void; }) {
  const [prescriptionId, setPrescriptionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function fetchPrescriptionById(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hms/prescriptions/${encodeURIComponent(id)}`, { credentials: "include" });
      if (!res.ok) { onPrescriptionLoaded(null); return; }
      const json = await res.json();
      const data = json?.data || json;
      const payload: PrescriptionPayload = {
        id: data?.id ?? id,
        patient_id: data?.patient_id ?? null,
        doctor_id: data?.doctor_id ?? null,
        patient_name: data?.patient_name ?? null,
        doctor_name: data?.doctor_name ?? null,
        lines: (data?.lines || []).map((ln: any) => ({ id: ln.id, product_name: ln.name || ln.product_name, qty: ln.quantity, note: ln.note })),
      };
      onPrescriptionLoaded(payload);
    } catch (e) {
      console.error("fetch prescription error", e);
      onPrescriptionLoaded(null);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("prescription", file);
      const res = await fetch(`/api/hms/prescriptions/ocr`, { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) { onPrescriptionLoaded(null); return; }
      const json = await res.json();
      const data = json?.data || json;
      const payload: PrescriptionPayload = {
        id: data?.id,
        patient_id: data?.patient_id ?? null,
        doctor_id: data?.doctor_id ?? null,
        patient_name: data?.patient_name ?? null,
        doctor_name: data?.doctor_name ?? null,
        lines: (data?.lines || []).map((ln: any) => ({ id: ln.id, product_name: ln.name || ln.product_name, qty: ln.quantity, note: ln.note })),
      };
      onPrescriptionLoaded(payload);
    } catch (e) {
      console.error("upload error", e);
      onPrescriptionLoaded(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="block text-xs text-slate-300">Prescription ID</label>
        <div className="flex items-center gap-2">
          <input value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)} placeholder="Enter prescription ID" className="p-2 rounded-md bg-slate-800/40 text-slate-100 w-64" />
          <button onClick={() => fetchPrescriptionById(prescriptionId)} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">{loading ? "Loading..." : "Load"}</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="block text-xs text-slate-300">Or attach</label>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} className="p-1 text-xs" />
        {uploading && <div className="text-xs text-slate-300">Uploading…</div>}
      </div>
    </div>
  );
}
