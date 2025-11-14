"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, Variants } from "framer-motion";
import HmsSettingsForm from "./admin/SettingsForm";
import apiClient from "@/lib/api-client";

/**
 * HmsSettingsPage (advanced)
 * - Reads /api/session non-blocking to show Tenant
 * - Displays Last-saved timestamp (updated by onSaved)
 * - Neutral fallback if session endpoint isn't present
 */

export default function HmsSettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const res = await apiClient.get("/api/session", { withCredentials: true });
        const s = res?.data?.session;
        if (!mountedRef.current) return;
        if (s?.tenant_name) setTenantName(s.tenant_name);
      } catch (err) {
        // non-fatal
        console.debug("HmsSettingsPage: session not available", err);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = (m: any) => setReducedMotion(Boolean(m.matches));
      update(mq);
      if (mq.addEventListener) mq.addEventListener("change", update);
      else mq.addListener(update);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", update);
        else mq.removeListener(update);
      };
    } catch {}
  }, []);

  const onFormSaved = useCallback((savedAt?: string | number) => {
    const time = savedAt ? new Date(savedAt).getTime() : Date.now();
    setLastSavedAt(time);
  }, []);

  useEffect(() => {
    const fn = (e: Event) => {
      try {
        // @ts-ignore
        const savedAt = (e as CustomEvent).detail?.savedAt;
        onFormSaved(savedAt);
      } catch {
        onFormSaved();
      }
    };
    window.addEventListener("hms-settings-saved", fn as EventListener);
    return () => window.removeEventListener("hms-settings-saved", fn as EventListener);
  }, [onFormSaved]);

  const lastSavedText = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString(undefined, { hour12: true })
    : "—";

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
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#071026] via-[#0b1220] to-[#05060b] text-white">
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <motion.div
          custom={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.2, 1], duration: 18 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute top-[-150px] left-[-100px] w-[420px] h-[420px] bg-indigo-500/18 rounded-full blur-[140px]"
        />
        <motion.div
          custom={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1], duration: 20 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute bottom-[-120px] right-[-120px] w-[500px] h-[500px] bg-purple-600/14 rounded-full blur-[160px]"
        />
      </div>

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
                Tenant-level settings for identity, billing, and defaults. Changes propagate immediately and are versioned.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/50">
              <div className="hidden sm:inline-flex items-center gap-3 bg-white/3 border border-white/6 px-3 py-2 rounded-2xl">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" aria-hidden />
                <span className="font-medium text-white/90">Tenant:</span>
                <span className="text-xs text-white/70">{tenantName ?? "—"}</span>
              </div>
              <div className="text-xs text-white/40">Last saved: {lastSavedText}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="hms-settings-panel" className="px-4 md:px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: 0.08 }}
            className="backdrop-blur-2xl bg-white/[0.02] border border-white/8 rounded-3xl shadow-[0_18px_80px_-24px_rgba(0,0,0,0.7)]"
            role="region"
            aria-labelledby="global-configuration-heading"
          >
            <div className="p-5 md:p-6 border-b border-white/8 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 id="global-configuration-heading" className="text-lg font-semibold text-white/90">
                  Global Configuration
                </h2>
                <p className="text-sm text-white/50 mt-1">Central settings for your tenant's HMS environment.</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="hidden md:flex items-center gap-3 text-xs text-white/40">
                  <span className="px-2 py-1 rounded-md bg-white/3 border border-white/6">Auto-backup: On</span>
                  <span className="px-2 py-1 rounded-md bg-white/3 border border-white/6">Schema: v1</span>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <HmsSettingsForm onSaved={onFormSaved} />
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="text-center text-xs text-white/30 py-6">Neural Glass © 2025 — HMS Settings</footer>
    </main>
  );
}
