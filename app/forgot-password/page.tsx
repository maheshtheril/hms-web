"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!email) return setErr("Please enter your email.");
    setLoading(true);

    try {
      // Replace with your real API route later
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d?.error || "Unable to process request.");
      } else {
        setOk("If that email exists, we've sent reset instructions.");
      }
    } catch {
      setErr("Unexpected error. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="relative z-10 mx-auto max-w-md px-6 py-20">
        <div className="rounded-2xl border border-white/6 bg-white/3 p-8 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter the email address for your GeniusGrid account and we'll send a reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs text-white/80">Email</label>
            <input
              type="email"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            {err && <p className="text-sm text-red-400">{err}</p>}
            {ok && <p className="text-sm text-emerald-400">{ok}</p>}
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-white/60">
            <button onClick={() => router.push("/login")} className="underline">
              Back to sign in
            </button>
            <button onClick={() => router.push("/signup")} className="underline">
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
