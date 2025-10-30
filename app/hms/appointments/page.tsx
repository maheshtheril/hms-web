"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import AppointmentsForm from "./AppointmentsForm";
import RescheduleModal from "./RescheduleModal";
import ConfirmCancelModal from "./ConfirmCancelModal";
import apiClient, { generateIdempotencyKey, setIdempotencyKey } from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

type Appointment = {
  id: string;
  type?: string | null;
  status?: string | null;
  starts_at: string;
  ends_at: string;
  patient_first?: string | null;
  patient_last?: string | null;
  clinician_first?: string | null;
  clinician_last?: string | null;
  created_at?: string;
  duration_minutes?: number | null;
};

export default function AppointmentsPage() {
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ clinician_id: "", patient_id: "", from: "", to: "" });
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [globalActionLoading, setGlobalActionLoading] = useState(false);
  const [perRowLoading, setPerRowLoading] = useState<Record<string, boolean>>({});
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function toLocalDateTimeInput(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  }

  function localInputToISOString(input: string | null) {
    if (!input) return null;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function fetchAppointments(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const controller = abortRef.current;

    try {
      const params: Record<string, string> = {};
      Object.entries(filter).forEach(([k, v]) => v && (params[k] = v));

      const res = await apiClient.get("/hms/appointments", {
        params,
        signal: signal ?? controller.signal,
      });

      setAppointments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.message === "canceled") {
        return;
      }
      console.error("fetchAppointments error:", err);
      setError(err?.message || "Failed to load appointments");
      toast.error(err?.message || "Failed to load appointments", "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setRowLoading(id: string, v: boolean) {
    setPerRowLoading((p) => ({ ...p, [id]: v }));
  }

  function openReschedule(appt: Appointment) {
    setRescheduleAppt(appt);
  }

  // Open the cancel modal
  function openCancel(appt: Appointment) {
    setCancelAppt(appt);
  }

  // Called by ConfirmCancelModal when user confirms cancellation
  async function performCancel(apptId: string, reason: string | null) {
    setRowLoading(apptId, true);
    try {
      const idempotencyKey = generateIdempotencyKey("cancel");
      await apiClient.post(
        `/hms/appointments/${encodeURIComponent(apptId)}/cancel`,
        { reason },
        setIdempotencyKey({}, idempotencyKey)
      );
      toast.success("Appointment cancelled", "Saved");
      // refresh list
      await fetchAppointments();
    } catch (err: any) {
      console.error("cancel error", err);
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "Failed to cancel appointment";
      toast.error(String(msg), "Cancel failed");
      throw err;
    } finally {
      setRowLoading(apptId, false);
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-8 flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Appointments</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage, schedule, and track patient appointments</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            aria-label="Create new appointment"
          >
            New Appointment
          </button>
          <button
            onClick={() => fetchAppointments()}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
            aria-label="Refresh appointments"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Filters */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-md shadow-sm flex flex-wrap gap-3">
          <input
            placeholder="Clinician ID"
            className="p-2 rounded-xl bg-transparent border border-slate-300 dark:border-slate-600 flex-1"
            value={filter.clinician_id}
            onChange={(e) => setFilter((s) => ({ ...s, clinician_id: e.target.value }))}
            aria-label="Filter by clinician id"
          />
          <input
            placeholder="Patient ID"
            className="p-2 rounded-xl bg-transparent border border-slate-300 dark:border-slate-600 flex-1"
            value={filter.patient_id}
            onChange={(e) => setFilter((s) => ({ ...s, patient_id: e.target.value }))}
            aria-label="Filter by patient id"
          />
          <input
            type="date"
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-600"
            value={filter.from}
            onChange={(e) => setFilter((s) => ({ ...s, from: e.target.value }))}
            aria-label="Filter from date"
          />
          <input
            type="date"
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-600"
            value={filter.to}
            onChange={(e) => setFilter((s) => ({ ...s, to: e.target.value }))}
            aria-label="Filter to date"
          />
          <button
            onClick={() => fetchAppointments()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            aria-label="Apply filters"
            disabled={loading}
          >
            {loading ? "Filtering..." : "Filter"}
          </button>
        </div>

        {/* List */}
        <div className="rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-md shadow p-4">
          {loading && <div className="py-6 text-center">Loading...</div>}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {!loading && appointments.length === 0 && !error && (
            <div className="text-slate-500 text-center py-6">No appointments found</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.map((a) => {
              const isLoading = !!perRowLoading[a.id];
              return (
                <motion.div
                  key={a.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-white/80 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/30 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="font-semibold text-slate-800 dark:text-white">
                    {a.type || "Consultation"} — <span className="text-sm text-slate-500 dark:text-slate-300">{a.status}</span>
                  </div>

                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(a.starts_at).toLocaleString()} → {new Date(a.ends_at).toLocaleString()}
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    <div>
                      Patient: {a.patient_first ?? "—"} {a.patient_last ?? ""}
                    </div>
                    <div>
                      Clinician: {a.clinician_first ?? "—"} {a.clinician_last ?? ""}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openReschedule(a)}
                      disabled={globalActionLoading || isLoading}
                      className="px-3 py-1 text-sm rounded-xl bg-emerald-600 text-white disabled:opacity-60"
                    >
                      {isLoading ? "Working..." : "Reschedule"}
                    </button>
                    <button
                      onClick={() => openCancel(a)}
                      disabled={globalActionLoading || isLoading}
                      className="px-3 py-1 text-sm rounded-xl bg-rose-600 text-white disabled:opacity-60"
                    >
                      {isLoading ? "Working..." : "Cancel"}
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    <div>Created: {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</div>
                    <div>Duration: {a.duration_minutes ?? "—"} mins</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {showForm && (
        <AppointmentsForm
          onClose={() => setShowForm(false)}
          onCreated={async (appt: Appointment) => {
            setGlobalActionLoading(true);
            try {
              await fetchAppointments();
            } finally {
              setGlobalActionLoading(false);
              setShowForm(false);
            }
            toast.success("Appointment created", "Saved");
          }}
        />
      )}

      {rescheduleAppt && (
        <RescheduleModal
          appointmentId={rescheduleAppt.id}
          initialStartsAt={rescheduleAppt.starts_at}
          initialEndsAt={rescheduleAppt.ends_at}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={async () => {
            await fetchAppointments();
            toast.success("Appointment rescheduled", "Saved");
          }}
        />
      )}

      {cancelAppt && (
        <ConfirmCancelModal
          appointmentId={cancelAppt.id}
          patientLabel={`${cancelAppt.patient_first ?? "—"} ${cancelAppt.patient_last ?? ""}`}
          initialReason={""}
          onClose={() => setCancelAppt(null)}
          onConfirm={async (reason) => {
            if (!cancelAppt) return;
            try {
              await performCancel(cancelAppt.id, reason);
            } finally {
              setCancelAppt(null);
            }
          }}
        />
      )}
    </div>
  );
}
