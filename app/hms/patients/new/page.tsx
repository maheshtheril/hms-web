// web/app/hms/patients/new/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPatient } from "../hooks";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Check, Save, User } from "lucide-react";

/* ----------------------------- CONFIG / HELPERS ---------------------------- */
const DRAFT_KEY = "hms:patient:draft:v1";

function uid() {
  // simple client id for optimistic UI / local tracking
  return "p_" + Math.random().toString(36).slice(2, 9);
}

function formatInitials(first?: string | null, last?: string | null) {
  const a = (first || "").trim().charAt(0).toUpperCase();
  const b = (last || "").trim().charAt(0).toUpperCase();
  return `${a || ""}${b || ""}` || "P";
}

function generatePatientNumber() {
  // opinionated pattern: YYYYMMDD + 4 random chars (client-side placeholder)
  const d = new Date();
  const prefix = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/* ---------------------------- Neural Glass Primitives ---------------------- */
function GlassCard({ children, className = "" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-white/12 shadow-lg rounded-2xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function GlassInput({ className = "", ...props }: any) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-xl border border-white/20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition ${className}`}
    />
  );
}

function GlassSelect({ className = "", ...props }: any) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-xl border border-white/20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-sky-400/30 ${className}`}
    />
  );
}

function GlassButton({ children, className = "", ...rest }: any) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl font-medium bg-white/75 dark:bg-slate-800/70 border border-white/20 backdrop-blur-md shadow-sm hover:scale-[1.02] transition disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

/* --------------------------------- Toast ---------------------------------- */
function Toasts() {
  const [toasts, setToasts] = React.useState<
    { id: string; message: string; tone?: "success" | "error" | "info" }[]
  >([]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setToasts((t) => [...t, { id: String(Date.now()) + Math.random(), ...e.detail }]);
    };
    window.addEventListener("hms:toast", handler as EventListener);
    return () => window.removeEventListener("hms:toast", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== t.id));
      }, 4200)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div aria-live="polite" className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`min-w-[220px] rounded-lg p-3 shadow-xl border border-white/12 backdrop-blur-md bg-white/90 flex items-start gap-3 ${
              t.tone === "success" ? "ring-1 ring-emerald-200/40" : t.tone === "error" ? "ring-1 ring-red-200/30" : ""
            }`}
          >
            <div className="mt-0.5">
              {t.tone === "success" ? <Check size={18} /> : t.tone === "error" ? <X size={18} /> : <Save size={18} />}
            </div>
            <div className="text-sm">{t.message}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function pushToast(message: string, tone: "success" | "error" | "info" = "info") {
  window.dispatchEvent(
    new CustomEvent("hms:toast", {
      detail: { message, tone },
    })
  );
}

/* ----------------------------- Main Component ----------------------------- */
export default function NewPatientPageAdvanced() {
  const router = useRouter();

  // form state
  const [section, setSection] = useState<"basic" | "contact" | "clinical">("basic");
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [form, setForm] = useState({
    id: uid(),
    patient_number: generatePatientNumber(),
    first_name: "",
    last_name: "",
    dob: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  // validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // autosave debounce
  const autosaveTimer = useRef<number | null>(null);

  // restore draft prompt
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        // only if draft looks like a patient object
        if (draft && typeof draft === "object" && draft.patient_number) {
          if (confirm("A saved draft was found. Restore draft?")) {
            setForm((s) => ({ ...s, ...draft }));
            pushToast("Draft restored", "info");
          } else {
            // user declined restore — keep form as blank but keep draft in localStorage
            pushToast("Draft kept for later", "info");
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    // cleanup on unmount
  }, []);

  // Autosave to localStorage (debounced)
  useEffect(() => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      try {
        setSavingDraft(true);
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setSavingDraft(false);
        // small toast but not spammy
      } catch (err) {
        setSavingDraft(false);
        console.warn("Failed to save draft", err);
      }
    }, 900); // debounce 900ms
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [form]);

  // keyboard shortcut: Cmd/Ctrl + S => submit
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const initials = useMemo(() => formatInitials(form.first_name, form.last_name), [form.first_name, form.last_name]);

  /* ----------------------------- Validation ------------------------------ */
  function validateAll() {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (form.email && !/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(form.email)) errs.email = "Invalid email";
    if (form.phone && !/^[+\d\s()-]{6,20}$/.test(form.phone)) errs.phone = "Invalid phone number";
    return errs;
  }

  /* ---------------------------- Handlers -------------------------------- */
  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[k as string];
      return copy;
    });
  }

  async function handleSubmit() {
    const errs = validateAll();
    setErrors(errs);
    if (Object.keys(errs).length) {
      pushToast("Fix validation errors before saving", "error");
      // jump to first error section
      if (errs.first_name) setSection("basic");
      else if (errs.phone || errs.email) setSection("contact");
      return;
    }

    setLoading(true);
    try {
      // optimistic UI: show toast and disable further edits
      pushToast("Creating patient…", "info");
      const payload: any = {
        patient_number: form.patient_number,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        dob: form.dob || null,
        gender: form.gender || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      };

      const created = await createPatient(payload);

      // remove draft after success
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}

      pushToast("Patient created", "success");
      // navigate to view page
      router.push(`/hms/patients/${created.id}`);
    } catch (err) {
      console.error("createPatient failed", err);
      pushToast("Failed to create patient", "error");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------- UI Sections ------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/40 to-slate-200/20 dark:from-slate-900 dark:to-slate-950 p-8">
      <Toasts />
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-semibold bg-white/80 dark:bg-slate-800/70 border border-white/10 shadow"
              aria-hidden
            >
              <User size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">New Patient</h1>
              <div className="text-sm text-slate-500">Create a new patient record — autosaves locally</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 mr-2">
              {savingDraft ? "Saving draft…" : "Draft autosaved"}
            </div>
            <GlassButton onClick={() => handleSubmit()} disabled={loading} className="flex items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "Saving…" : "Save (Ctrl/Cmd+S)"}
            </GlassButton>
          </div>
        </div>

        {/* NAV */}
        <div className="flex gap-2">
          <button
            onClick={() => setSection("basic")}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${section === "basic" ? "bg-white/80 dark:bg-slate-800/70" : "bg-white/10 dark:bg-slate-900/20"}`}
            aria-pressed={section === "basic"}
          >
            Basic
          </button>
          <button
            onClick={() => setSection("contact")}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${section === "contact" ? "bg-white/80 dark:bg-slate-800/70" : "bg-white/10 dark:bg-slate-900/20"}`}
            aria-pressed={section === "contact"}
          >
            Contact
          </button>
          <button
            onClick={() => setSection("clinical")}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${section === "clinical" ? "bg-white/80 dark:bg-slate-800/70" : "bg-white/10 dark:bg-slate-900/20"}`}
            aria-pressed={section === "clinical"}
          >
            Clinical
          </button>
        </div>

        <GlassCard>
          <AnimatePresence mode="wait" initial={false}>
            {section === "basic" && (
              <motion.div key="basic" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="col-span-1 flex flex-col items-center gap-3">
                    <div className="w-28 h-28 rounded-2xl flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-sky-300 to-indigo-400 text-white shadow-lg border border-white/20">
                      {initials}
                    </div>
                    <div className="text-xs text-slate-500">Avatar (initials)</div>
                  </div>

                  <div className="col-span-2 space-y-3">
                    <div>
                      <label className="block mb-1 text-sm font-medium">Patient number</label>
                      <GlassInput value={form.patient_number} onChange={(e: any) => update("patient_number", e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-sm font-medium">First name</label>
                        <GlassInput
                          value={form.first_name}
                          onChange={(e: any) => update("first_name", e.target.value)}
                          aria-invalid={!!errors.first_name}
                          aria-describedby={errors.first_name ? "err-first" : undefined}
                        />
                        {errors.first_name && <div id="err-first" className="text-xs text-red-500 mt-1">{errors.first_name}</div>}
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium">Last name</label>
                        <GlassInput value={form.last_name} onChange={(e: any) => update("last_name", e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block mb-1 text-sm font-medium">DOB</label>
                        <GlassInput type="date" value={form.dob} onChange={(e: any) => update("dob", e.target.value)} />
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium">Gender</label>
                        <GlassSelect value={form.gender} onChange={(e: any) => update("gender", e.target.value)}>
                          <option value="">—</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="unknown">Unknown</option>
                        </GlassSelect>
                      </div>

                      <div>
                        <label className="block mb-1 text-sm font-medium">Record privacy</label>
                        <GlassSelect defaultValue="private" onChange={() => {}}>
                          <option value="private">Private (default)</option>
                          <option value="shared">Shared</option>
                        </GlassSelect>
                        <div className="text-xs text-slate-400 mt-1">Control how this record is shared with clinics.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {section === "contact" && (
              <motion.div key="contact" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">Phone</label>
                    <GlassInput value={form.phone} onChange={(e: any) => update("phone", e.target.value)} aria-invalid={!!errors.phone} />
                    {errors.phone && <div className="text-xs text-red-500 mt-1">{errors.phone}</div>}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium">Email</label>
                    <GlassInput value={form.email} onChange={(e: any) => update("email", e.target.value)} aria-invalid={!!errors.email} />
                    {errors.email && <div className="text-xs text-red-500 mt-1">{errors.email}</div>}
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium">Address</label>
                    <GlassInput value={form.address} onChange={(e: any) => update("address", e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-sm font-medium">Emergency contact (name)</label>
                      <GlassInput value={form.emergency_contact_name} onChange={(e: any) => update("emergency_contact_name", e.target.value)} />
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium">Emergency contact (phone)</label>
                      <GlassInput value={form.emergency_contact_phone} onChange={(e: any) => update("emergency_contact_phone", e.target.value)} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {section === "clinical" && (
              <motion.div key="clinical" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 rounded-xl border border-white/20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition"
                    />
                    <div className="text-xs text-slate-400 mt-1">Clinical notes, allergies, flags.</div>
                  </div>

                  <div className="flex gap-3">
                    <GlassButton onClick={() => { setSection("basic"); }}>
                      Back to Basic
                    </GlassButton>

                    <GlassButton onClick={() => handleSubmit()} disabled={loading} className="ml-auto flex items-center gap-2">
                      {loading ? <Loader2 className="animate-spin" /> : <Check />}
                      {loading ? "Saving…" : "Save Patient"}
                    </GlassButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* small helper row */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div>Tip: Use <kbd className="px-2 py-1 rounded bg-white/10">Ctrl/Cmd + S</kbd> to save</div>
          <div>
            <button
              onClick={() => {
                if (confirm("Clear draft and reset form?")) {
                  localStorage.removeItem(DRAFT_KEY);
                  setForm({
                    id: uid(),
                    patient_number: generatePatientNumber(),
                    first_name: "",
                    last_name: "",
                    dob: "",
                    gender: "",
                    phone: "",
                    email: "",
                    address: "",
                    notes: "",
                    emergency_contact_name: "",
                    emergency_contact_phone: "",
                  });
                  pushToast("Draft cleared", "info");
                }
              }}
              className="text-xs underline"
            >
              Clear draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
