// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import AuthCard from "@/components/AuthCard";
import PrimaryButton from "@/components/PrimaryButton";
import AIBadge from "@/components/AIBadge";
import NeuralGlow from "@/components/NeuralGlow";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        // Successful login
        router.push("/dashboard");
      } else {
        // Try to parse backend reason if provided
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Invalid credentials. Please check your email or password.");
      }
    } catch {
      setError("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white overflow-hidden px-6">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />

      {/* CENTERED NEURAL GLOW */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow size={720} intensity={0.9} colorA="#60a5fa" colorB="#6366f1" colorC="#a78bfa" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-[920px]">
        {/* Logo area */}
        <div className="mb-6 flex items-center justify-center">
          <div className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full bg-white/6 p-2 shadow-2xl backdrop-blur-sm">
            <BrandLogo size={8} pulse />
          </div>
        </div>

        {/* Auth card */}
        <AuthCard className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300">
                  Welcome back
                </h1>
                <AIBadge />
              </div>
              <p className="mt-2 text-sm text-white/70">Sign in to your GeniusGrid workspace</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
              {/* Email */}
              <div>
                <label htmlFor="email" className="text-xs font-medium text-white/70">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "email-error" : undefined}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "email-error" : undefined}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Error message */}
              {error && (
                <p id="email-error" role="alert" className="text-sm text-red-400 mt-1">
                  {error}
                </p>
              )}

              <PrimaryButton type="submit" disabled={loading} aria-busy={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </PrimaryButton>
            </form>

            <div className="mt-6 border-t border-white/10 pt-5 text-center">
              <p className="text-xs text-white/60 mb-2">Don’t have an account?</p>
              <a
                href="/signup"
                className="inline-block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition"
              >
                Create an account
              </a>
            </div>
          </motion.div>
        </AuthCard>
      </div>
    </div>
  );
}
