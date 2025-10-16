"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // optional: track that user visited onboarding
    try {
      sessionStorage.setItem("visitedOnboarding", "1");
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/6 bg-white/3 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 shadow">
              <img src="/logo.png" alt="GeniusGrid" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Welcome to Onboarding</h1>
              <p className="mt-1 text-sm text-white/70">
                Quick, guided steps to get your tenant ready — powered by GeniusGrid AI.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-white/8 bg-white/5 p-4">
              <h3 className="text-sm font-semibold">1 — Core setup</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li>• Create roles: Admin, Accountant, Sales</li>
                <li>• Set company details & fiscal year</li>
                <li>• Import chart of accounts (CSV)</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => router.push("/settings/company")}
                  className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-black"
                >
                  Go to company settings
                </button>
                <button
                  onClick={() => router.push("/settings/roles")}
                  className="rounded-md px-3 py-1.5 text-sm text-white/80"
                >
                  Manage roles
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-white/8 bg-white/5 p-4">
              <h3 className="text-sm font-semibold">2 — Data migration</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li>• Upload customers & suppliers CSV</li>
                <li>• Map GST / tax codes automatically</li>
                <li>• Import opening balances</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => router.push("/import")}
                  className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-black"
                >
                  Upload CSVs
                </button>
                <button
                  onClick={() => alert("Download sample CSV (placeholder)")}
                  className="rounded-md px-3 py-1.5 text-sm text-white/80"
                >
                  Download template
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">AI-powered recommendations</h3>
            <div className="mt-3 rounded-lg border border-white/8 bg-white/5 p-4">
              <p className="text-sm text-white/80">
                GeniusGrid AI can generate a step-by-step migration checklist, produce CSV templates, and suggest default automations for your workflows.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => alert("Generating checklist (demo)…")}
                  className="rounded-md bg-sky-400 px-3 py-2 text-sm font-medium text-black"
                >
                  Generate migration checklist
                </button>
                <button
                  onClick={() => alert("Suggesting automations (demo)…")}
                  className="rounded-md bg-white/6 px-3 py-2 text-sm text-white/90"
                >
                  Suggest automations
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="ml-auto rounded-md px-3 py-2 text-sm text-white/80"
                >
                  Skip to dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-white/70">
              <strong>Need help?</strong> Contact support or open the assistant inside the dashboard.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/support")}
                className="rounded-md bg-white/6 px-3 py-2 text-sm text-white/90"
              >
                Contact support
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-black"
              >
                Finish setup
              </button>
            </div>
          </div>

          <div className="mt-6 text-xs text-white/60">
            By continuing you accept our{" "}
            <a href="/legal/terms" className="underline">
              Terms
            </a>{" "}
            &{" "}
            <a href="/legal/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
