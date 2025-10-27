"use client";

import React from "react";
import { motion } from "framer-motion";
import HmsSettingsForm from "../admin/SettingsForm";

/* ============================================================================
   HMS Settings Page
   Full-Scale Neural Glass Design Language
   ---------------------------------------------------------------------------
   ✦ Dynamic frosted glass layout with gradient light orbs
   ✦ Smooth entrance transitions via Framer Motion
   ✦ Focus on clarity, minimal friction, and world-class SaaS UX
   ✦ Uses HmsSettingsForm (already Neural Glass styled)
============================================================================ */

export default function HmsSettingsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b0f1a] via-[#111625] to-[#090c14] text-white">
      {/* ========== Animated Gradient Orbs Background ========== */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
          className="absolute top-[-150px] left-[-100px] w-[420px] h-[420px] bg-indigo-500/25 rounded-full blur-[140px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute bottom-[-120px] right-[-120px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[160px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.15, 0.4, 0.15], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
          className="absolute bottom-[30%] left-[40%] w-[340px] h-[340px] bg-blue-500/10 rounded-full blur-[100px]"
        />
      </div>

      {/* ========== Page Header ========== */}
      <section className="px-8 pt-10 pb-6">
        <motion.h1
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-3xl md:text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300"
        >
          HMS Settings
        </motion.h1>
        <p className="text-white/60 mt-2 max-w-2xl">
          Configure your hospital identity, billing preferences, and global HMS parameters.  
          All changes reflect instantly across your SaaS tenant.
        </p>
      </section>

      {/* ========== Main Content Container ========== */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl shadow-[0_12px_60px_-12px_rgba(0,0,0,0.65)] hover:shadow-[0_14px_80px_-12px_rgba(0,0,0,0.7)] transition-shadow duration-700"
          >
            {/* Panel Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white/90">Global Configuration</h2>
                <p className="text-sm text-white/50">Central settings for your tenant's HMS environment</p>
              </div>
              <div className="text-xs text-white/40">
                {/* Optional tenant indicator */}
                {/* {tenant?.name ?? "Default Tenant"} */}
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6">
              <HmsSettingsForm />
            </div>
          </motion.div>

          {/* Optional: Additional Panels (Billing, API Keys, etc.) */}
          {/* <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className=\"mt-8 backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-[0_12px_60px_-12px_rgba(0,0,0,0.65)]\"
          >
            <div className=\"p-6 border-b border-white/10\">
              <h2 className=\"text-lg font-semibold text-white/90\">Billing & Modules</h2>
              <p className=\"text-sm text-white/50\">Toggle module visibility, pricing models, etc.</p>
            </div>
            <div className=\"p-6 text-white/60 text-sm italic\">
              Coming soon — intelligent module control with AI suggestions.
            </div>
          </motion.div> */}
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="text-center text-xs text-white/30 py-6">
        Neural Glass Design Language © 2025 — GG SaaS ERP HMS Settings
      </footer>
    </main>
  );
}
