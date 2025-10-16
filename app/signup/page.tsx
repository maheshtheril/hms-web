// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import AuthCard from "@/components/AuthCard";
import PrimaryButton from "@/components/PrimaryButton";
import AIBadge from "@/components/AIBadge";
import NeuralGlow from "@/components/NeuralGlow";

const api = axios.create({ baseURL: "", withCredentials: true });

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");
    try {
      const res = await api.post("/api/tenant-signup", form);
      if (res.data?.ok) {
        setOk(true);
        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setErr(res.data?.error || "Signup failed");
      }
    } catch {
      setErr("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white overflow-hidden px-6">
      {/* Base background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />

      {/* CENTERED NEURAL GLOW */}
      <div className="absolute -top-36 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow size={680} intensity={0.8} colorA="#7dd3fc" colorB="#6366f1" colorC="#a78bfa" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-[980px]">
        {/* Logo area */}
        <div className="mb-6 flex items-center justify-center">
          <div className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full bg-white/6 p-2 shadow-2xl backdrop-blur-sm">
            <BrandLogo size={8} pulse />
          </div>
        </div>

        {/* Auth card */}
        <AuthCard className="w-full max-w-xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Create your workspace
                </h1>
                <AIBadge />
              </div>
              <p className="mt-2 text-sm text-white/70">Spin up a secure tenant with AI-powered onboarding.</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4" aria-label="Signup form">
              {/* Organization */}
              <div>
                <label htmlFor="org" className="text-xs font-medium text-white/70">
                  Organization / Company
                </label>
                <input
                  id="org"
                  name="org"
                  aria-label="Organization or company name"
                  placeholder="Organization / Company"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.org}
                  onChange={onChange("org")}
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="text-xs font-medium text-white/70">
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  aria-label="Your full name"
                  placeholder="Your name"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.name}
                  onChange={onChange("name")}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-xs font-medium text-white/70">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  aria-label="Work email"
                  placeholder="you@company.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.email}
                  onChange={onChange("email")}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="text-xs font-medium text-white/70">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  aria-label="Password"
                  placeholder="Password"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.password}
                  onChange={onChange("password")}
                  required
                />
              </div>

              {/* Error or success messages */}
              {err && (
                <p id="signup-error" role="alert" className="text-sm text-red-400 mt-1">
                  {err}
                </p>
              )}
              {ok && (
                <p role="status" aria-live="polite" className="text-sm text-emerald-400 mt-1">
                  Workspace created — redirecting…
                </p>
              )}

              <PrimaryButton type="submit" disabled={loading} aria-busy={loading}>
                {loading ? "Creating workspace…" : "Start Free"}
              </PrimaryButton>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-xs text-white/60 mb-2">Already have an account?</p>
              <a
                href="/login"
                className="inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition"
              >
                Back to Login
              </a>
            </div>
          </motion.div>
        </AuthCard>
      </div>
    </div>
  );
}
