"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, Variants } from "framer-motion";
import apiClient from "@/lib/api-client";
import HmsSettingsForm from "./admin/SettingsForm";

export default function HmsSettingsPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string>("—");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const res = await apiClient.get("/api/session", { withCredentials: true });
        const s = res?.data?.session;

        if (!mountedRef.current) return;

        setTenantName(s?.tenant_name ?? null);
        setTenantId(s?.tenant_id ?? null);
        setCompanyId(s?.active_company_id ?? null);
      } catch (err) {
        console.error("Session fetch failed", err);
      }
    })();

    return () => { mountedRef.current = false };
  }, []);

  const orbVariant: Variants = reducedMotion
    ? { hidden: { opacity: 0.35, scale: 1 }, visible: { opacity: 0.35, scale: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: (props: any) => ({
          opacity: props.opacity,
          scale: props.scale,
          transition: { repeat: Infinity, duration: props.duration, ease: "easeInOut" }
        })
      };

  return (
    <main className="relative min-h-screen bg-[#0b0f18] text-white">
      {/* BG ORBS */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          custom={{ opacity: [0.3, 0.45, 0.3], scale: [1, 1.2, 1], duration: 18 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute top-[-180px] left-[-120px] w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[130px]"
        />
        <motion.div
          custom={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1], duration: 20 }}
          initial="hidden"
          animate="visible"
          variants={orbVariant}
          className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[170px]"
        />
      </div>

      <section className="px-8 pt-10 pb-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300">
          HMS Settings
        </h1>
        <p className="mt-2 text-white/60 max-w-2xl">Tenant-wide configuration for your HMS environment.</p>

        <div className="mt-6 flex items-center gap-4 text-sm text-white/60">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
            Tenant: <span className="text-white/80">{tenantName ?? "—"}</span>
          </div>
          <div>Last saved: {lastSavedAt}</div>
        </div>
      </section>

      <section className="px-8 pb-20 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/[0.04] backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-xl"
        >
          <HmsSettingsForm
            tenantId={tenantId}
            companyId={companyId}
            onSaved={(ts) => setLastSavedAt(new Date(ts ?? Date.now()).toLocaleString())}
          />
        </motion.div>
      </section>
    </main>
  );
}
