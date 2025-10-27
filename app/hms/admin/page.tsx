"use client";

import React from "react";
import { motion } from "framer-motion";
import DepartmentsForm from "./DepartmentsForm";
import HmsSettingsForm from "./SettingsForm";

/* =============================================================================
   HMS Admin Dashboard
   Full-scale Neural Glass Design implementation
   -----------------------------------------------------------------------------
   ✦ Dynamic motion layers, depth & frosted gradients
   ✦ Adaptive layout: 2-column on desktop, 1-column on mobile
   ✦ Uses your existing HMS forms as modular panels
   ✦ Tenant-aware (plug into your auth/tenant context when ready)
============================================================================= */

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0c0f1a] via-[#111625] to-[#0a0c17] text-white">
      {/* Background motion lights */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-indigo-500/30"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full blur-[120px] bg-purple-500/20"
        />
      </div>

      {/* Page header */}
      <section className="px-8 pt-10 pb-6">
        <motion.h1
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300"
        >
          HMS Admin Panel
        </motion.h1>
        <p className="text-white/60 mt-2 max-w-2xl">
          Configure departments, services, and global hospital settings.
          Each change applies instantly across your multi-tenant ERP system.
        </p>
      </section>

      {/* Dashboard Grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Departments */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_60px_-10px_rgba(0,0,0,0.7)] transition-shadow duration-500"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white/90">
                  Services & Departments
                </h2>
                <p className="text-sm text-white/50">
                  Manage clinical & operational departments.
                </p>
              </div>
              <div className="text-xs text-white/40">
                {/* optional tenant label */}
                {/* {tenant?.name || "Default Tenant"} */}
              </div>
            </div>
            <div className="p-6">
              <DepartmentsForm />
            </div>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-2xl shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_60px_-10px_rgba(0,0,0,0.7)] transition-shadow duration-500"
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white/90">
                HMS Global Settings
              </h2>
              <p className="text-sm text-white/50">
                Core configuration: identity, billing, and defaults.
              </p>
            </div>
            <div className="p-6">
              <HmsSettingsForm />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-white/30 py-6">
        Neural Glass Design Language © 2025 — GG SaaS ERP HMS Module
      </footer>
    </main>
  );
}
