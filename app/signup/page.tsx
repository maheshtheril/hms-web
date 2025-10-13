// web/app/signup/page.tsx
"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000",
  withCredentials: true,
});

export default function SignupPage() {
  const [form, setForm] = useState({ org: "", name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onChange =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api.post("/api/tenant-signup", form);
      if (res.data?.ok) {
        setOk(true);
        router.push("/dashboard");
      } else {
        setErr("Signup failed");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 " +
    "px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 " +
    "outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20";

  return (
    <div className="max-w-md mx-auto py-10 px-6">
      <h1 className="text-2xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">
        Create your workspace
      </h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
            Organization / Company
          </label>
          <input
            className={inputClass}
            placeholder="e.g., Genius Infravision LLP"
            value={form.org}
            onChange={onChange("org")}
            autoComplete="organization"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Your name</label>
          <input
            className={inputClass}
            placeholder="e.g., Dr. Sahid Cholayil"
            value={form.name}
            onChange={onChange("name")}
            autoComplete="name"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Work email</label>
          <input
            className={inputClass}
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={onChange("email")}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">Password</label>
          <input
            className={inputClass}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={onChange("password")}
            autoComplete="new-password"
          />
        </div>

        <button
          className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black py-2 font-medium disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating..." : "Start Free"}
        </button>

        {err && <p className="text-red-600 dark:text-red-400 text-sm">{String(err)}</p>}
        {ok && <p className="text-green-600 dark:text-green-400 text-sm">Account created.</p>}
      </form>
    </div>
  );
}
