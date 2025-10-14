"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
try { sessionStorage.setItem("celebrateLoginOnce", "1"); } catch {}

      // DO NOT trigger fireworks here. Just go to dashboard.
      router.replace("/dashboard");

    } catch (err) {
      console.error("login error:", err);
      setError("Unexpected error");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-black text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/40 to-transparent -z-10" />
      <form
        onSubmit={handleLogin}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/50 backdrop-blur p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-400/20 p-2 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm mb-1">Email</label>
<input
  id="login_email"
  name="email"
  type="email"
  autoComplete="email"
  className="w-full rounded-lg bg-white/5 px-3 py-2"
  placeholder="Email"
/>

        </div>

        <div className="mb-6">
          <label className="block text-sm mb-1">Password</label>
         <input
  id="login_password"
  name="password"
  type="password"
  autoComplete="current-password"
  className="w-full rounded-lg bg-white/5 px-3 py-2"
  placeholder="Password"
/>

        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 active:scale-[.98] transition disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
