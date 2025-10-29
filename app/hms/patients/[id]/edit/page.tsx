// web/app/hms/patients/[id]/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import {
  fetchPatient,
  fetchEncounters,
  deleteEncounter,
  generateAiSummary,
  updatePatient,
} from "../../hooks";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Edit2,
  Trash2,
  Download,
  Printer,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ---------------------- Neural Glass primitives ---------------------- */
const GlassCard = ({ children, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-3xl border border-white/20 
      bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl p-6 
      text-slate-800 dark:text-slate-100 transition-all ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sky-200/10 dark:from-slate-800/10 dark:to-sky-900/20 rounded-3xl pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const GlassButton = ({ children, className = "", ...rest }: any) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    {...rest}
    className={`px-4 py-2 rounded-2xl font-medium text-sm
      bg-white/60 dark:bg-slate-800/60 border border-white/20 
      shadow-sm backdrop-blur-md hover:shadow-lg hover:bg-white/80 
      dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-100 
      transition-all ${className}`}
  >
    {children}
  </motion.button>
);

const Pill = ({ children, className = "" }: any) => (
  <span
    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs 
      font-semibold border border-white/20 backdrop-blur-md 
      bg-gradient-to-r from-white/50 to-transparent 
      dark:from-slate-800/40 text-slate-700 dark:text-slate-200 ${className}`}
  >
    {children}
  </span>
);

/* ----------------------------- Utilities ----------------------------- */
const formatDate = (date?: string | null) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return date;
  }
};

/* ----------------------------- Component ----------------------------- */
export default function PatientGlassView() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [patient, setPatient] = useState<any | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  /* --------------------- Load patient + encounters -------------------- */
  useEffect(() => {
    (async () => {
      try {
        const p = await fetchPatient(id);
        setPatient(p);
        const e = await fetchEncounters(id);
        setEncounters(Array.isArray(e) ? e : e.rows || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onGenerateSummary() {
    setAiLoading(true);
    try {
      const s = await generateAiSummary(id);
      setAiSummary(s);
    } catch (err) {
      console.error("AI summary failed", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function onSaveEdit() {
    setSaving(true);
    try {
      const updated = await updatePatient(id, patient);
      setPatient(updated);
      setEditing(false);
    } catch {
      alert("Failed to save edits");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteEncounter(eid: string) {
    if (!confirm("Delete this encounter?")) return;
    await deleteEncounter(eid);
    setEncounters((prev) => prev.filter((e) => e.id !== eid));
  }

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen relative overflow-hidden p-10 bg-gradient-to-br from-slate-100/50 via-sky-50/30 to-slate-200/50 dark:from-slate-900 dark:to-slate-950">
      {/* Subtle backdrop glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(56,189,248,0.08),transparent_60%)]" />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-12 gap-8">
        {/* ---------------- Left ---------------- */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <GlassCard>
            <div className="flex items-start gap-4">
              <GlassButton onClick={() => router.back()} className="p-2">
                <ArrowLeft size={18} />
              </GlassButton>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-indigo-500 bg-clip-text text-transparent">
                  {patient.first_name} {patient.last_name}
                </h1>
                <div className="text-sm text-slate-500 mt-1">#{patient.patient_number ?? "—"}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{patient.gender ?? "—"}</Pill>
                  <Pill>{formatDate(patient.dob)}</Pill>
                  <Pill>{patient.status ?? "—"}</Pill>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Phone:</strong> {patient.phone ?? "—"}</div>
                <div><strong>Email:</strong> {patient.email ?? "—"}</div>
                <div><strong>Address:</strong> {patient.address ?? "—"}</div>
              </div>
              <div className="flex gap-2 pt-3">
                <GlassButton onClick={() => setEditing(true)} className="flex items-center gap-2">
                  <Edit2 size={16} /> Edit
                </GlassButton>
                <GlassButton onClick={() => window.print()}><Printer size={16} /> Print</GlassButton>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">AI Summary</h2>
              <GlassButton onClick={onGenerateSummary} disabled={aiLoading} className="flex items-center gap-2">
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiLoading ? "Generating…" : "Regenerate"}
              </GlassButton>
            </div>
            {aiSummary ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-white/30 dark:bg-slate-800/30 border border-white/10 text-sm whitespace-pre-wrap"
              >
                {aiSummary}
              </motion.div>
            ) : (
              <p className="text-sm text-slate-500">No summary yet. Generate one with the button above.</p>
            )}
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Audit Log</h2>
              <button onClick={() => setShowAudit((s) => !s)}>
                {showAudit ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            <AnimatePresence>
              {showAudit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-xs text-slate-500 space-y-1"
                >
                  <p><strong>2025-10-28</strong> — Patient created by admin@example.com</p>
                  <p><strong>2025-10-29</strong> — Contact updated by user@example.com</p>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>

        {/* ---------------- Right ---------------- */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Clinical timeline</div>
                <h2 className="text-xl font-semibold">Encounters</h2>
              </div>
              <GlassButton onClick={() => router.push(`/hms/patients/${id}/encounters/new`)}>
                New Encounter
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard>
            {encounters.length === 0 ? (
              <div className="text-sm text-slate-500">No encounters found.</div>
            ) : (
              <div className="space-y-3">
                {encounters.map((e) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-white/10 bg-white/30 dark:bg-slate-800/30 backdrop-blur-md flex justify-between items-start"
                  >
                    <div>
                      <div className="font-medium">{e.title || e.reason || "Encounter"}</div>
                      <div className="text-xs text-slate-500">{formatDate(e.created_at)}</div>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{e.summary ?? e.notes ?? "—"}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <GlassButton onClick={() => router.push(`/hms/encounters/${e.id}`)}>View</GlassButton>
                      <button
                        onClick={() => onDeleteEncounter(e.id)}
                        className="p-2 rounded-xl text-red-500 hover:text-red-600 bg-white/30 dark:bg-slate-800/30 border border-white/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-500">Export & reports</div>
                <h2 className="font-semibold">Actions</h2>
              </div>
              <div className="flex gap-2">
                <GlassButton onClick={() => window.print()}><Printer size={14} /> Print</GlassButton>
                <GlassButton onClick={() => {
                  const blob = new Blob([JSON.stringify(patient, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${patient.first_name}-${patient.last_name}.json`;
                  a.click();
                }}>
                  <FileText size={14} /> Export
                </GlassButton>
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
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(false)} />
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="relative z-10 w-full max-w-xl">
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Edit Patient</h3>
                  <div className="flex gap-2">
                    <GlassButton onClick={() => setEditing(false)}>Close</GlassButton>
                    <GlassButton onClick={onSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="animate-spin" /> : "Save"}
                    </GlassButton>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/60"
                    value={patient.first_name}
                    onChange={(e) => setPatient({ ...patient, first_name: e.target.value })}
                  />
                  <input
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/60"
                    value={patient.last_name}
                    onChange={(e) => setPatient({ ...patient, last_name: e.target.value })}
                  />
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
