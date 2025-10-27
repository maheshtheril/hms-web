// app/hms/settings/page.tsx  (client)
"use client";

import React, { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import HmsSettingsForm from "../admin/SettingsForm";

/* ============================================================================
   HMS Settings Page — Neural Glass Design (production-ready polish)
   - Adds prefers-reduced-motion fallback
   - Accessible headings, skip link, and focus styles
   - Breadcrumb + tenant indicator placeholder (replace with real data)
   - Keeps visual language, gradients, frosted panels, and subtle motion
============================================================================ */

export default function HmsSettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
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
      // ignore matchMedia if unavailable
    }
  }, []);

  const orbVariant: Variants = reducedMotion
    ? { hidden: { opacity: 0.35, scale: 1 }, visible: { opacity: 0.35, scale: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: (custom: any) => ({
          opacity: custom.opacity,
          scale: custom.scale,
          transition: { repeat: Infinity, duration: custom.duration, ease: "easeInOut" },
        }),
      };

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0b0f1a] via-[#111625] to-[#090c14] text-white"
      aria-labelledby="hms-settings-title"
    >
      {/* Skip link for keyboard users */}
      <a href="#hms-settings-panel" className="sr-only focus:not-sr-only focus:inline-block p-2 m-2 rounded-md bg-white/5">
        Skip to settings
      </a>

      {/* ========== Animated Gradient Orbs Background ========== */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <motion.div
          custom={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.2, 1], duration: 18 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute top-[-150px] left-[-100px] w-[420px] h-[420px] bg-indigo-500/25 rounded-full blur-[140px]"
        />
        <motion.div
          custom={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1], duration: 20 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute bottom-[-120px] right-[-120px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[160px]"
        />
        <motion.div
          custom={{ opacity: [0.15, 0.4, 0.15], scale: [1, 1.15, 1], duration: 22 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute bottom-[30%] left-[40%] w-[340px] h-[340px] bg-blue-500/10 rounded-full blur-[100px]"
        />
      </div>

      {/* ========== Page Header ========== */}
      <section className="px-6 md:px-10 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center gap-2 text-sm text-white/50">
              <li>HMS</li>
              <li aria-hidden>›</li>
              <li className="text-white/80">Settings</li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 id="hms-settings-title" className="text-3xl md:text-4xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
                HMS Settings
              </h1>
              <p className="text-white/60 mt-2 max-w-2xl">
                Configure your hospital identity, billing preferences, and global HMS parameters. Changes propagate across the tenant immediately.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/50">
              {/* Tenant indicator — swap with real tenant data */}
              <div className="hidden sm:inline-flex items-center gap-3 bg-white/3 border border-white/6 px-3 py-2 rounded-2xl">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" aria-hidden />
                <span className="font-medium text-white/90">Tenant:</span>
                <span className="text-xs text-white/70">Acme Hospitals (demo)</span>
              </div>
              <div className="text-xs text-white/40">Last saved: —</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Main Content Container ========== */}
      <section id="hms-settings-panel" className="px-4 md:px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.55, delay: 0.12 }}
            className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl shadow-[0_12px_60px_-12px_rgba(0,0,0,0.65)] hover:shadow-[0_14px_80px_-12px_rgba(0,0,0,0.7)] transition-shadow duration-700"
            role="region"
            aria-labelledby="global-configuration-heading"
          >
            {/* Panel Header */}
            <div className="p-5 md:p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 id="global-configuration-heading" className="text-lg font-semibold text-white/90">
                  Global Configuration
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  Central settings for your tenant's HMS environment.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Example action area (non-functional — form handles actions) */}
                <div className="hidden md:flex items-center gap-3 text-xs text-white/40">
                  <span className="px-2 py-1 rounded-md bg-white/3 border border-white/6">Auto-backup: On</span>
                  <span className="px-2 py-1 rounded-md bg-white/3 border border-white/6">Version: 1.2</span>
                </div>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-5 md:p-6">
              <HmsSettingsForm />
            </div>
          </motion.div>

          {/* Optional: Additional Panels (Billing, API Keys, etc.) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.55, delay: 0.26 }}
            className="mt-8 backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-[0_12px_60px_-12px_rgba(0,0,0,0.65)]"
            aria-hidden
          >
            <div className="p-5 md:p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white/90">Billing & Modules</h3>
              <p className="text-sm text-white/50 mt-1">Toggle module visibility, pricing models, integrations and more.</p>
            </div>
            <div className="p-5 md:p-6 text-white/60 text-sm italic">Coming soon — intelligent module control with AI suggestions.</div>
          </motion.div>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="text-center text-xs text-white/30 py-6">
        Neural Glass Design Language © 2025 — GG SaaS ERP HMS Settings
      </footer>
    </main>
  );
}
