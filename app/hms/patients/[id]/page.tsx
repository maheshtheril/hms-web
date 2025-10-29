// web/app/hms/patients/[id]/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchPatient,
  generateAiSummary,
  // optional hooks — if not present, implement similarly in ../hooks
  fetchEncounters,
  deleteEncounter,
  updatePatient,
} from "../hooks";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Edit2,
  Download,
  Trash2,
  Clock,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ---------------------- Neural Glass primitives (local) ---------------------- */
function GlassCard({ children, className = "" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-white/20 shadow-lg rounded-2xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function GlassButton({ children, className = "", ...rest }: any) {
  return (
    <button
      {...rest}
      className={`px-3 py-2 rounded-xl font-medium bg-white/75 dark:bg-slate-800/70 border border-white/30 backdrop-blur-md shadow-sm hover:scale-[1.02] transition ${className}`}
    >
      {children}
    </button>
  );
}

function Pill({ children, className = "" }: any) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/30 dark:bg-slate-800/30 border border-white/10 ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Small helpers -------------------------------- */
function formatDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
}

/* ------------------------------- Page Component ----------------------------- */
export default function PatientViewAdvanced() {
  const params = useParams();
  const id = (params as any).id;
  const router = useRouter();

  // patient
  const [patient, setPatient] = useState<any | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // encounters timeline
  const [encounters, setEncounters] = useState<any[]>([]);
  const [encPage, setEncPage] = useState(0);
  const [encPageSize] = useState(8);
  const [encLoading, setEncLoading] = useState(false);
  const [encHasMore, setEncHasMore] = useState(true);

  // AI summary
  const [aiSummaries, setAiSummaries] = useState<{ id: string; text: string; ts: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // edit modal
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // audit log accordion
  const [showAudit, setShowAudit] = useState(false);

  // dropdown z-index helper - used by any menus in this file
  const dropdownStyle = {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(6px)",
    zIndex: 60,
  } as React.CSSProperties;

  useEffect(() => {
    let mounted = true;
    async function loadPatient() {
      setLoadingPatient(true);
      setError(null);
      try {
        const p = await fetchPatient(id);
        if (!mounted) return;
        setPatient(p);
        setEditForm({
          first_name: p.first_name ?? "",
          last_name: p.last_name ?? "",
          dob: p.dob ?? "",
          gender: p.gender ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
        });
      } catch (err: any) {
        console.error("fetchPatient failed", err);
        if (!mounted) return;
        setError("Failed to load patient");
      } finally {
        if (mounted) setLoadingPatient(false);
      }
    }
    loadPatient();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    // initial encounters load
    loadEncounters(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadEncounters(page = 0) {
    setEncLoading(true);
    try {
      const res = await fetchEncounters(id, { page, pageSize: encPageSize }); // expects { rows, hasMore }
      // best-effort: accept raw array too
      const rows = Array.isArray(res) ? res : res?.rows ?? [];
      const hasMore = Array.isArray(res) ? rows.length === encPageSize : !!res?.hasMore;
      setEncounters((s) => (page === 0 ? rows : [...s, ...rows]));
      setEncHasMore(hasMore);
      setEncPage(page);
    } catch (err) {
      console.error("fetchEncounters failed", err);
    } finally {
      setEncLoading(false);
    }
  }

  async function onDeleteEncounter(encId: string) {
    if (!confirm("Delete encounter? This cannot be undone.")) return;
    try {
      await deleteEncounter(encId);
      setEncounters((s) => s.filter((e) => e.id !== encId));
    } catch (err) {
      console.error("deleteEncounter failed", err);
      alert("Failed to delete encounter");
    }
  }

  async function onGenerateSummary() {
    setAiLoading(true);
    try {
      // keep history
      const txt = await generateAiSummary(id);
      setAiSummaries((s) => [{ id: String(Date.now()), text: txt, ts: new Date().toISOString() }, ...s]);
    } catch (err) {
      console.error("generateAiSummary failed", err);
      alert("AI summary failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function onSaveEdits() {
    setSaving(true);
    try {
      const updated = await updatePatient(id, editForm); // expects updated patient
      setPatient(updated);
      setEditing(false);
    } catch (err) {
      console.error("updatePatient failed", err);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function onExport() {
    // simple export: JSON download (user can extend to PDF/server-export)
    const blob = new Blob([JSON.stringify(patient, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-${patient?.id || "unknown"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadingPatient) {
    return (
      <div className="p-6 min-h-[240px]">
        <GlassCard className="flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <GlassCard>
          <div className="text-center text-red-600">{error}</div>
        </GlassCard>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <GlassCard>
          <div className="text-center">Patient not found</div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/40 to-slate-200/10 dark:from-slate-900 dark:to-slate-950 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="flex items-start gap-3">
            <button onClick={() => router.back()} className="rounded-full p-2 hover:scale-95 transition bg-white/10">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="text-sm text-slate-500">#{patient.patient_number ?? "—"}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>{patient.gender ?? "—"}</Pill>
                <Pill>{formatDate(patient.dob)}</Pill>
                <Pill>{patient.status ?? "—"}</Pill>
              </div>
            </div>
          </div>

          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Contact</div>
                <div className="text-xs text-slate-400">editable</div>
              </div>

              <div className="text-sm">
                <div>
                  <strong>Phone:</strong> {patient.phone ?? "—"}
                </div>
                <div>
                  <strong>Email:</strong> {patient.email ?? "—"}
                </div>
                <div>
                  <strong>Address:</strong> {patient.address ?? "—"}
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <GlassButton onClick={() => setEditing(true)} className="flex items-center gap-2">
                  <Edit2 size={16} /> Edit
                </GlassButton>
                <GlassButton onClick={() => { window.print(); }} title="Print">
                  <Printer size={16} /> Print
                </GlassButton>
                <div style={dropdownStyle} className="rounded-xl border border-white/10">
                  <div className="flex items-center gap-1 p-1">
                    <button onClick={onExport} className="px-2 py-1 text-sm"> <Download size={14} /> Export JSON</button>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">AI Summary</div>
              <GlassButton onClick={onGenerateSummary} disabled={aiLoading} className="flex items-center gap-2">
                {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={14} />}{" "}
                {aiLoading ? "Generating…" : "Regenerate"}
              </GlassButton>
            </div>

            <div className="mt-3 space-y-2">
              {aiSummaries.length === 0 ? (
                <div className="text-sm text-slate-500">No summaries yet. Use <strong>Regenerate</strong>.</div>
              ) : (
                aiSummaries.map((s) => (
                  <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-white/30 rounded-lg border border-white/8">
                    <div className="text-xs text-slate-400">{formatDate(s.ts)}</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{s.text}</div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Audit Log</div>
              <button onClick={() => setShowAudit((s) => !s)} className="rounded p-1">
                {showAudit ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>

            <AnimatePresence>
              {showAudit && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="text-xs text-slate-500">
                    {/* For now we show a mock/audit sample — ideally fetched from server */}
                    <div className="space-y-2">
                      <div className="text-xs"><strong>2025-10-28 10:21</strong> — Patient created by user@example.com</div>
                      <div className="text-xs"><strong>2025-10-29 02:30</strong> — Contact updated by admin@example.com</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <GlassCard className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Clinical timeline</div>
              <div className="text-lg font-semibold">Encounters</div>
            </div>

            <div className="flex items-center gap-2">
              <GlassButton onClick={() => { router.push(`/hms/patients/${id}/encounters/new`); }}>
                New Encounter
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-4">
              {encounterSkeletons(encLoading, encounters.length) /* skeletons while loading or list when loaded */}

              {encounters.length > 0 && (
                <div className="space-y-3">
                  {encounters.map((e) => (
                    <div key={e.id} className="p-3 rounded-lg border border-white/8 bg-white/10 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{e.title || e.reason || "Encounter"}</div>
                        <div className="text-xs text-slate-400">{formatDate(e.created_at)}</div>
                        <div className="text-sm mt-2 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{e.summary ?? e.notes ?? "—"}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-xs text-slate-400">{e.type ?? "visit"}</div>
                        <div className="flex gap-2">
                          <GlassButton onClick={() => router.push(`/hms/encounters/${e.id}`)}>View</GlassButton>
                          <button
                            onClick={() => onDeleteEncounter(e.id)}
                            className="px-2 py-1 rounded-xl text-red-600 border border-red-200/10 bg-white/5"
                            title="Delete encounter"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {encHasMore && (
                <div className="flex justify-center pt-3">
                  <GlassButton onClick={() => loadEncounters(encPage + 1)} disabled={encLoading}>
                    {encLoading ? <Loader2 className="animate-spin" /> : "Load more"}
                  </GlassButton>
                </div>
              )}

              {!encLoading && encounters.length === 0 && <div className="text-sm text-slate-500">No encounters found.</div>}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Export & reports</div>
                <div className="text-lg font-semibold">Actions</div>
              </div>

              <div className="flex items-center gap-2">
                <GlassButton onClick={onExport}><FileText size={14} /> Export JSON</GlassButton>
                <GlassButton onClick={() => window.print()}><Printer size={14} /> Print</GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ---------------- Edit Modal ---------------- */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditing(false)} />

            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="relative z-10 w-full max-w-2xl">
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Edit patient</div>
                  <div className="flex items-center gap-2">
                    <GlassButton onClick={() => setEditing(false)}>Close</GlassButton>
                    <GlassButton onClick={onSaveEdits} disabled={saving}>
                      {saving ? <Loader2 className="animate-spin" /> : "Save"}
                    </GlassButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">First name</label>
                    <input className="w-full px-3 py-2 rounded-xl border border-white/12 bg-white/60" value={editForm.first_name || ""} onChange={(e) => setEditForm((s: any) => ({ ...s, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Last name</label>
                    <input className="w-full px-3 py-2 rounded-xl border border-white/12 bg-white/60" value={editForm.last_name || ""} onChange={(e) => setEditForm((s: any) => ({ ...s, last_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Phone</label>
                    <input className="w-full px-3 py-2 rounded-xl border border-white/12 bg-white/60" value={editForm.phone || ""} onChange={(e) => setEditForm((s: any) => ({ ...s, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input className="w-full px-3 py-2 rounded-xl border border-white/12 bg-white/60" value={editForm.email || ""} onChange={(e) => setEditForm((s: any) => ({ ...s, email: e.target.value }))} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- Small UI helpers ---------------------------- */
function encounterSkeletons(loading: boolean, currentLength: number) {
  if (loading && currentLength === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-white/8 bg-white/5 animate-pulse h-28" />
        ))}
      </div>
    );
  }
  return null;
}
