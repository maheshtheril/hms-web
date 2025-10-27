"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DepartmentsForm from "../admin/DepartmentsForm";

/* ============================================================================
   HMS Departments Management Page
   Full-scale Neural Glass Design Language
   ---------------------------------------------------------------------------
   ✦ Two-panel adaptive layout: left = department list, right = create/edit form
   ✦ Animated glass backgrounds and blurred layers
   ✦ Responsive for mobile, laptop, and ultra-wide screens
   ✦ Ready for integration with /api/hms/departments CRUD endpoints
============================================================================ */

type Department = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  parent_name?: string | null;
  created_at?: string;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Department | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------- Fetch departments -------------------------- */
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/hms/departments", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json();
        if (mounted) setDepartments(data || []);
      } catch (err: any) {
        console.error("Error fetching departments:", err);
        if (mounted) setError("Failed to load departments");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------- Render UI -------------------------- */
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0c0f1a] via-[#101521] to-[#0a0c17] text-white">
      {/* Background Motion Auras */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 16, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-indigo-500/30"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-[30rem] h-[30rem] rounded-full blur-[120px] bg-purple-500/20"
        />
      </div>

      {/* Header */}
      <section className="px-8 pt-10 pb-6">
        <motion.h1
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
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
            transition={{ delay: 0.2, duration: 0.6 }}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white/90">Existing Departments</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-indigo-300 hover:text-indigo-200 transition"
              >
                + New
              </button>
            </div>

            <div className="p-6 h-[540px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {loading && <p className="text-white/50 text-sm">Loading departments...</p>}
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              {!loading && !error && departments.length === 0 && (
                <p className="text-white/40 text-sm italic">No departments found yet.</p>
              )}

              {!loading && departments.length > 0 && (
                <ul className="divide-y divide-white/5">
                  {departments.map((dept) => (
                    <li
                      key={dept.id}
                      onClick={() => setSelected(dept)}
                      className={`p-3 rounded-xl transition-colors duration-200 cursor-pointer hover:bg-white/[0.06] ${
                        selected?.id === dept.id ? "bg-white/[0.08] border border-indigo-400/30" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-white/90">{dept.name}</div>
                          <div className="text-xs text-white/50">{dept.code || "—"}</div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            dept.is_active
                              ? "bg-emerald-400/20 text-emerald-300"
                              : "bg-zinc-700/40 text-zinc-400"
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
            transition={{ delay: 0.4, duration: 0.6 }}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)]"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white/90">
                {selected ? "Edit Department" : "Create Department"}
              </h2>
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="text-sm text-white/50 hover:text-white/70 transition"
                >
                  × Cancel Edit
                </button>
              )}
            </div>
            <div className="p-6">
              <DepartmentsForm initialData={selected || undefined} />
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
