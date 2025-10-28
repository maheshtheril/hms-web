"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import DepartmentsForm from "../admin/DepartmentsForm";

/* ============================================================================
   DepartmentsPage — improved production-ready version
   - AbortController for fetch cancellation
   - reduced-motion support
   - keyboard + focus accessibility for list
   - retry mechanism and aria-live for error reporting
   - expects DepartmentsForm to call props.onSaved(newOrUpdatedDepartment)
============================================================================ */

type Department = {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  is_active: boolean;
  parent_name?: string | null;
  created_at?: string;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Department | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bump to refetch

  const fetchDepartments = useCallback(async (signal?: AbortSignal) => {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch("/api/hms/departments", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin", // include cookies if your backend needs session
      signal,
    });

    const text = await res.text();
    if (!res.ok) {
      // include body text for easier debugging
      throw new Error(`Failed to fetch (${res.status}) ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }

    setDepartments(Array.isArray(data) ? data : []);
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    console.error("Error fetching departments:", err);
    setError(err?.message || "Failed to load departments");
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    // reduced-motion preference
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else mq.addListener(handler);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", handler);
        else mq.removeListener(handler);
      };
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    fetchDepartments(ctl.signal);
    return () => ctl.abort();
  }, [fetchDepartments, refreshKey]);

  // Called by DepartmentsForm when it creates/updates a department.
  // It is expected that DepartmentsForm calls onSaved(savedDepartment) after successful create/update.
  const handleSaved = useCallback((saved: Department | null) => {
    // best-effort: refresh list and select the saved item
    setRefreshKey((k) => k + 1);
    if (saved) {
      // slight delay to allow refetch -> select after items are loaded
      setTimeout(() => setSelected(saved), 300);
    } else {
      setSelected(null);
    }
  }, []);

  const onRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0c0f1a] via-[#101521] to-[#0a0c17] text-white">
      {/* Background Motion Auras */}
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
        <motion.div
          initial={{ opacity: 0 }}
          animate={reducedMotion ? { opacity: 0.35, scale: 1 } : { opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
          transition={reducedMotion ? undefined : { repeat: Infinity, duration: 16, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-indigo-500/30"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={reducedMotion ? { opacity: 0.25, scale: 1 } : { opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
          transition={reducedMotion ? undefined : { repeat: Infinity, duration: 22, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full blur-[120px] bg-purple-500/20"
        />
      </div>

      {/* Header */}
      <section className="px-8 pt-10 pb-6">
        <motion.h1
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
          className="text-3xl md:text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300"
        >
          Departments & Services
        </motion.h1>
        <p className="text-white/60 mt-2 max-w-3xl">
          Manage hospital departments, map services, and maintain hierarchy within your multi-tenant HMS system.
        </p>
      </section>

      {/* Content Grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Department List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: reducedMotion ? 0 : 0.45 }}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)] overflow-hidden"
            role="region"
            aria-labelledby="existing-depts-heading"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 id="existing-depts-heading" className="text-lg font-semibold text-white/90">
                Existing Departments
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-indigo-300 hover:text-indigo-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-400/40 rounded"
                aria-label="Create new department"
                type="button"
              >
                + New
              </button>
            </div>

            <div className="p-6 h-[540px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" aria-live="polite">
              {loading && <p className="text-white/50 text-sm">Loading departments...</p>}

              {error && (
                <div className="mb-3">
                  <p className="text-rose-400 text-sm">Error: {error}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={onRetry}
                      className="px-3 py-1 rounded-md bg-white/5 border border-white/8 text-sm hover:bg-white/6 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && departments.length === 0 && (
                <div className="text-white/40 text-sm italic space-y-2">
                  <p>No departments found yet.</p>
                  <button
                    onClick={() => setSelected(null)}
                    className="inline-block text-sm text-indigo-300 hover:text-indigo-200 transition focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  >
                    Create the first department
                  </button>
                </div>
              )}

              {!loading && departments.length > 0 && (
                <ul className="divide-y divide-white/5" role="list">
                  {departments.map((dept) => (
                    <li key={dept.id}>
                      <button
                        onClick={() => setSelected(dept)}
                        className={`w-full text-left p-3 rounded-xl transition-colors duration-150 cursor-pointer hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/25 ${
                          selected?.id === dept.id ? "bg-white/[0.08] border border-indigo-400/30" : ""
                        }`}
                        aria-pressed={selected?.id === dept.id}
                      >
                        <div className="flex justify-between items-center">
                          <div className="min-w-0">
                            <div className="font-medium text-white/90 truncate">{dept.name}</div>
                            <div className="text-xs text-white/50 truncate">{dept.code || "—"}</div>
                          </div>
                          <span
                            className={`ml-3 text-xs px-2 py-0.5 rounded-full ${
                              dept.is_active ? "bg-emerald-400/20 text-emerald-300" : "bg-zinc-700/40 text-zinc-400"
                            }`}
                          >
                            {dept.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {dept.description && (
                          <p className="text-xs mt-1 text-white/60 line-clamp-2">{dept.description}</p>
                        )}
                        {dept.parent_name && (
                          <p className="text-xs mt-1 text-indigo-300">Parent: {dept.parent_name}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>

          {/* Right Panel: Department Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: reducedMotion ? 0 : 0.45 }}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)]"
            role="region"
            aria-labelledby="dept-form-heading"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 id="dept-form-heading" className="text-lg font-semibold text-white/90">
                {selected ? "Edit Department" : "Create Department"}
              </h2>
              {selected ? (
                <button
                  onClick={() => setSelected(null)}
                  className="text-sm text-white/50 hover:text-white/70 transition focus:outline-none focus:ring-2 focus:ring-indigo-400/25 rounded"
                >
                  × Cancel Edit
                </button>
              ) : (
                <div aria-hidden className="text-sm text-white/40">Fill the form to add a department</div>
              )}
            </div>

            <div className="p-6">
              {/* DepartmentsForm should accept `initialData` and call `onSaved(savedDept)` after success.
                  If it doesn't yet, add that callback (very small change in your form component). */}
              <DepartmentsForm initialData={selected ?? undefined} onSaved={handleSaved} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-white/30 py-6">
        Neural Glass Design Language © 2025 — GG SaaS ERP HMS
      </footer>
    </main>
  );
}
