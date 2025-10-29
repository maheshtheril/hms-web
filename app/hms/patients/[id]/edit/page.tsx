// web/app/hms/patients/[id]/edit/page.tsx
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

/* ---------------------- Neural Glass primitives (dark-first) ---------------------- */
const GlassCard = ({ children, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-3xl border border-white/8
      bg-slate-900/48 backdrop-blur-2xl shadow-[0_16px_60px_rgba(2,6,23,0.6)] p-6
      text-white transition-all ${className}`}
  >
    <div
      aria-hidden
      className="absolute inset-0 rounded-3xl pointer-events-none"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.18))",
        mixBlendMode: "overlay",
      }}
    />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

const GlassButton = ({ children, className = "", ...rest }: any) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    {...rest}
    className={`px-4 py-2 rounded-2xl font-medium text-sm
      bg-slate-800/60 border border-white/6
      shadow-sm backdrop-blur-md hover:shadow-lg hover:bg-slate-800/70
      text-white transition-all ${className}`}
  >
    {children}
  </motion.button>
);

const Pill = ({ children, className = "" }: any) => (
  <span
    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs 
      font-semibold border border-white/8 backdrop-blur-md 
      bg-gradient-to-r from-white/4 to-transparent
      text-white ${className}`}
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
        setLoading(true);
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
      // optional: show UI toast (left to caller)
    } finally {
      setAiLoading(false);
    }
  }

  async function onSaveEdit() {
    if (!patient) return;
    setSaving(true);
    try {
      const updated = await updatePatient(id, patient);
      setPatient(updated);
      setEditing(false);
    } catch (err) {
      console.error("save failed", err);
      alert("Failed to save edits");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteEncounter(eid: string) {
    if (!confirm("Delete this encounter?")) return;
    try {
      await deleteEncounter(eid);
      setEncounters((prev) => prev.filter((e) => e.id !== eid));
    } catch (err) {
      console.error("delete encounter failed", err);
      alert("Failed to delete encounter");
    }
  }

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#020617] via-[#07102a] to-[#03040a] text-white">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen relative overflow-hidden p-10 bg-gradient-to-br from-[#020617] via-[#07102a] to-[#03040a] text-white">
      {/* Subtle backdrop glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px 400px at 20% 30%, rgba(99,102,241,0.06), transparent 20%), radial-gradient(600px 400px at 80% 80%, rgba(14,165,233,0.03), transparent 20%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-12 gap-8">
        {/* ---------------- Left ---------------- */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <GlassCard>
            <div className="flex items-start gap-4">
              <GlassButton onClick={() => router.back()} className="p-2">
                <ArrowLeft size={18} />
              </GlassButton>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-indigo-300">
                  {patient?.first_name ?? "—"} {patient?.last_name ?? ""}
                </h1>
                <div className="text-sm text-slate-300 mt-1">#{patient?.patient_number ?? "—"}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{patient?.gender ?? "—"}</Pill>
                  <Pill>{formatDate(patient?.dob)}</Pill>
                  <Pill>{patient?.status ?? "—"}</Pill>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="space-y-2 text-sm text-slate-300">
                <div>
                  <strong className="text-white/90">Phone:</strong>{" "}
                  <span className="text-slate-300">{patient?.contact?.phone ?? patient?.phone ?? "—"}</span>
                </div>
                <div>
                  <strong className="text-white/90">Email:</strong>{" "}
                  <span className="text-slate-300">{patient?.contact?.email ?? patient?.email ?? "—"}</span>
                </div>
                <div>
                  <strong className="text-white/90">Address:</strong>{" "}
                  <span className="text-slate-300">{patient?.contact?.address ?? patient?.address ?? "—"}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <GlassButton onClick={() => setEditing(true)} className="flex items-center gap-2 bg-indigo-700/70">
                  <Edit2 size={16} /> Edit
                </GlassButton>
                <GlassButton onClick={() => window.print()} className="flex items-center gap-2">
                  <Printer size={16} /> Print
                </GlassButton>
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
                className="p-4 rounded-xl bg-slate-800/30 border border-white/6 text-sm whitespace-pre-wrap"
              >
                {aiSummary}
              </motion.div>
            ) : (
              <p className="text-sm text-slate-300">No summary yet. Generate one with the button above.</p>
            )}
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Audit Log</h2>
              <button
                onClick={() => setShowAudit((s) => !s)}
                aria-expanded={showAudit}
                className="p-1 rounded-md text-slate-300 hover:text-white"
              >
                {showAudit ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>
            <AnimatePresence>
              {showAudit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-xs text-slate-400 space-y-1"
                >
                  {/* Placeholder audit rows — replace with real audit data if available */}
                  <p>
                    <strong className="text-white/90">2025-10-28</strong> — Patient created by <span className="text-slate-300">admin@example.com</span>
                  </p>
                  <p>
                    <strong className="text-white/90">2025-10-29</strong> — Contact updated by <span className="text-slate-300">user@example.com</span>
                  </p>
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
                <div className="text-sm text-slate-300">Clinical timeline</div>
                <h2 className="text-xl font-semibold">Encounters</h2>
              </div>
              <GlassButton onClick={() => router.push(`/hms/patients/${id}/encounters/new`)} className="bg-emerald-600/80">
                New Encounter
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard>
            {encounters.length === 0 ? (
              <div className="text-sm text-slate-400">No encounters found.</div>
            ) : (
              <div className="space-y-3">
                {encounters.map((e) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-white/6 bg-slate-800/30 backdrop-blur-md flex justify-between items-start"
                  >
                    <div className="max-w-[70%]">
                      <div className="font-medium text-white">{e.title || e.reason || "Encounter"}</div>
                      <div className="text-xs text-slate-400">{formatDate(e.created_at)}</div>
                      <p className="mt-2 text-sm text-slate-300">{e.summary ?? e.notes ?? "—"}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <GlassButton onClick={() => router.push(`/hms/encounters/${e.id}`)} className="bg-slate-800/60">
                        View
                      </GlassButton>
                      <button
                        onClick={() => onDeleteEncounter(e.id)}
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-300 bg-slate-800/30 border border-white/6"
                        title="Delete encounter"
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
                <div className="text-sm text-slate-300">Export & reports</div>
                <h2 className="font-semibold">Actions</h2>
              </div>
              <div className="flex gap-2">
                <GlassButton onClick={() => window.print()} className="bg-slate-800/60">
                  <Printer size={14} /> Print
                </GlassButton>
                <GlassButton
                  onClick={() => {
                    try {
                      const blob = new Blob([JSON.stringify(patient, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${(patient?.first_name ?? "patient")}-${(patient?.last_name ?? "")}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("export failed", err);
                      alert("Failed to export");
                    }
                  }}
                  className="bg-slate-800/60"
                >
                  <FileText size={14} /> Export
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ---------------- Edit Modal ---------------- */}
      <AnimatePresence>
        {editing && patient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditing(false)} />
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="relative z-10 w-full max-w-xl">
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Edit Patient</h3>
                  <div className="flex gap-2">
                    <GlassButton onClick={() => setEditing(false)} className="bg-slate-800/60">Close</GlassButton>
                    <GlassButton onClick={onSaveEdit} disabled={saving} className="bg-emerald-600/80">
                      {saving ? <Loader2 className="animate-spin" /> : "Save"}
                    </GlassButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="px-3 py-2 rounded-xl border border-white/8 bg-slate-800/30 text-white"
                    value={patient.first_name || ""}
                    onChange={(e) => setPatient({ ...patient, first_name: e.target.value })}
                    placeholder="First name"
                  />
                  <input
                    className="px-3 py-2 rounded-xl border border-white/8 bg-slate-800/30 text-white"
                    value={patient.last_name || ""}
                    onChange={(e) => setPatient({ ...patient, last_name: e.target.value })}
                    placeholder="Last name"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="px-3 py-2 rounded-xl border border-white/8 bg-slate-800/30 text-white"
                    value={patient?.contact?.phone ?? patient?.phone ?? ""}
                    onChange={(e) =>
                      setPatient({
                        ...patient,
                        contact: { ...(patient.contact || {}), phone: e.target.value },
                      })
                    }
                    placeholder="Phone"
                  />
                  <input
                    className="px-3 py-2 rounded-xl border border-white/8 bg-slate-800/30 text-white"
                    value={patient?.contact?.email ?? patient?.email ?? ""}
                    onChange={(e) =>
                      setPatient({
                        ...patient,
                        contact: { ...(patient.contact || {}), email: e.target.value },
                      })
                    }
                    placeholder="Email"
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
