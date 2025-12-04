"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BACKEND } from "@/lib/env";

type SubType = "clinic" | "hospital" | "multispeciality";
type BillingMode = "cash" | "insurance" | "mixed";

export default function HospitalOnboardingWizard(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // local only, not sent to backend
  const [subIndustry, setSubIndustry] = useState<SubType>("hospital");
  const [departments, setDepartments] = useState<string[]>([]);
  const [billingMode, setBillingMode] = useState<BillingMode>("cash");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const SUB_TYPES = [
    { key: "clinic", label: "Clinic" },
    { key: "hospital", label: "Full Hospital" },
    { key: "multispeciality", label: "Multi-Speciality Hospital" },
  ] as const;

  const DEPARTMENT_LIST = [
    "General Medicine",
    "Pediatrics",
    "Orthopedics",
    "Gynecology",
    "Cardiology",
    "Dermatology",
    "ENT",
    "Neurology",
    "Urology",
    "Emergency",
    "Radiology",
  ] as const;

  const BILLING_MODES = [
    { key: "cash", label: "Cash Billing" },
    { key: "insurance", label: "Insurance Billing" },
    { key: "mixed", label: "Mixed (Cash + Insurance)" },
  ] as const;

  // Cleanup on unmount (abort outstanding requests)
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const toggleDepartment = useCallback((dep: string) => {
    setDepartments((prev) =>
      prev.includes(dep) ? prev.filter((d) => d !== dep) : [...prev, dep]
    );
  }, []);

  const parseResponse = useCallback(async (res: Response) => {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      try {
        return await res.json();
      } catch {
        // fallthrough to text
      }
    }
    const text = await res.text().catch(() => "");
    try {
      return JSON.parse(text);
    } catch {
      return text || null;
    }
  }, []);

  async function finishOnboarding() {
    if (loading) return;
    setError(null);
    setLoading(true);

    // require at least one department
    if (departments.length === 0) {
      setError("Please select at least one department before continuing.");
      setLoading(false);
      setStep(2);
      return;
    }

    const url = `${BACKEND}/api/onboarding/hms`;
    // set up abort controller and timeout
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s

    try {
      // Prefer token-based auth. If token present, send Authorization and DO NOT use credentials.
      const token =
        typeof window !== "undefined"
          ? (localStorage.getItem("token") || null)
          : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const fetchOpts: RequestInit = {
        method: "POST",
        headers,
        body: JSON.stringify({ departments, billingMode, subIndustry }),
        signal: controller.signal,
      };

      // If no token, send credentials for cookie-based sessions (legacy)
      if (!token) (fetchOpts as any).credentials = "include";

      const res = await fetch(url, fetchOpts);
      const data = await parseResponse(res);

      if (res.status === 401) {
        // Session/token invalid — force sign-out and redirect to login
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("token");
          } catch {
            /* ignore */
          }
        }
        setError("Session expired. Please sign in again.");
        router.push("/auth/login");
        return;
      }

      if (!res.ok) {
        const detail =
          data && typeof data === "object"
            ? (data.error || data.message || JSON.stringify(data))
            : String(data || "(no body)").slice(0, 500);
        setError(`Onboarding failed: ${res.status} ${detail}`);
        console.warn("onboarding failed:", res.status, detail);
        return;
      }

      // success: if backend returns token (in case onboarding created or updated auth), save it
      if (data && typeof data === "object" && typeof data.token === "string" && data.token.length > 10) {
        try {
          localStorage.setItem("token", data.token);
        } catch {
          // ignore localStorage errors (e.g. in strict browsers)
        }
      }

      // move to dashboard
      router.push("/tenant/dashboard");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setError("Onboarding request timed out. Try again.");
      } else {
        setError(err?.message || "Network error during onboarding");
        console.error("finishOnboarding error:", err);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      abortRef.current = null;
    }
  }

  // Step navigation with simple validation
  const goNext = useCallback(() => {
    if (step === 2 && departments.length === 0) {
      setError("Pick at least one department to continue.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1));
  }, [step, departments.length]);

  const goPrev = useCallback(() => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const progressPercent = Math.round(((step - 1) / 3) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071226] to-[#071321] p-6 text-white">
      <div className="w-full max-w-3xl">
        <div className="relative rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/10 backdrop-blur-xl shadow-2xl p-8 ring-1 ring-white/5">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[#00E3C2]/10 blur-3xl pointer-events-none" />

          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Hospital Setup Wizard</h1>

          {/* Progress + Stepper */}
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-2 flex items-center justify-between">
              <span>Step {step} of 4</span>
              <span aria-hidden>{progressPercent}%</span>
            </div>
            <div
              className="w-full h-2 rounded bg-white/6 overflow-hidden"
              aria-hidden
            >
              <div
                className="h-full rounded"
                style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg,#B2FFE9,#C8FFF0)" }}
              />
            </div>
            <nav className="mt-3 flex gap-2 text-xs text-white/50" aria-label="Steps">
              <div className={`px-2 py-1 rounded ${step === 1 ? "bg-white/5" : ""}`}>Type</div>
              <div className={`px-2 py-1 rounded ${step === 2 ? "bg-white/5" : ""}`}>Departments</div>
              <div className={`px-2 py-1 rounded ${step === 3 ? "bg-white/5" : ""}`}>Billing</div>
              <div className={`px-2 py-1 rounded ${step === 4 ? "bg-white/5" : ""}`}>Finish</div>
            </nav>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-900/10 p-3 rounded" role="alert">
              {error}
            </div>
          )}

          {/* Step 1 — Hospital Type */}
          {step === 1 && (
            <section aria-labelledby="step1-title">
              <h2 id="step1-title" className="text-xl font-semibold mb-4">Select Hospital Type</h2>
              <div className="space-y-4">
                {SUB_TYPES.map((s) => (
                  <label
                    key={s.key}
                    className={`cursor-pointer block px-5 py-4 rounded-md border transition-all
                      ${subIndustry === s.key ? "border-[#00E3C2] bg-[#00E3C2]/10" : "border-white/10 hover:bg-white/5"}
                    `}
                  >
                    <input
                      type="radio"
                      name="subIndustry"
                      value={s.key}
                      checked={subIndustry === s.key}
                      onChange={(e) => setSubIndustry(e.target.value as SubType)}
                      className="mr-4"
                      aria-checked={subIndustry === s.key}
                    />
                    {s.label}
                  </label>
                ))}
              </div>

              <div className="mt-8 flex gap-2">
                <div className="flex-1">
                  <button
                    onClick={goNext}
                    className="w-full py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black hover:-translate-y-1 transition shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Step 2 — Departments */}
          {step === 2 && (
            <section aria-labelledby="step2-title">
              <h2 id="step2-title" className="text-xl font-semibold mb-2">Choose Your Departments</h2>
              <p className="text-white/60 mb-4">Select all the departments available in your hospital.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEPARTMENT_LIST.map((dep) => (
                  <label
                    key={dep}
                    className={`cursor-pointer border px-4 py-3 rounded-md transition-all flex items-center gap-3
                      ${departments.includes(dep) ? "border-[#00E3C2] bg-[#00E3C2]/10" : "border-white/10 hover:bg-white/5"}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={departments.includes(dep)}
                      onChange={() => toggleDepartment(dep)}
                      className="mr-3"
                      aria-checked={departments.includes(dep)}
                    />
                    <span>{dep}</span>
                  </label>
                ))}
              </div>

              <div className="mt-8 flex gap-2">
                <button
                  onClick={goPrev}
                  className="px-5 py-3 rounded-md font-semibold border border-white/10"
                >
                  ← Back
                </button>
                <div className="flex-1">
                  <button
                    onClick={goNext}
                    className="w-full py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black hover:-translate-y-1 transition shadow-[0_8px_20px_rgba(0,255,220,0.15)] disabled:opacity-60"
                    disabled={departments.length === 0}
                    aria-disabled={departments.length === 0}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Step 3 — Billing Mode */}
          {step === 3 && (
            <section aria-labelledby="step3-title">
              <h2 id="step3-title" className="text-xl font-semibold mb-4">Select Billing Mode</h2>

              <div className="space-y-4">
                {BILLING_MODES.map((m) => (
                  <label
                    key={m.key}
                    className={`cursor-pointer block px-5 py-4 rounded-md border transition-all
                      ${billingMode === m.key ? "border-[#00E3C2] bg-[#00E3C2]/10" : "border-white/10 hover:bg-white/5"}
                    `}
                  >
                    <input
                      type="radio"
                      name="billing"
                      value={m.key}
                      checked={billingMode === m.key}
                      onChange={(e) => setBillingMode(e.target.value as BillingMode)}
                      className="mr-3"
                      aria-checked={billingMode === m.key}
                    />
                    {m.label}
                  </label>
                ))}
              </div>

              <div className="mt-8 flex gap-2">
                <button onClick={goPrev} className="px-5 py-3 rounded-md font-semibold border border-white/10">← Back</button>
                <div className="flex-1">
                  <button
                    onClick={() => setStep(4)}
                    disabled={!billingMode}
                    className="w-full py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black hover:-translate-y-1 disabled:opacity-50 transition shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Step 4 — Final */}
          {step === 4 && (
            <section aria-labelledby="step4-title" className="text-center py-8">
              <h2 id="step4-title" className="text-2xl font-bold">Your Hospital Is Ready</h2>
              <p className="text-white/60 mt-2">
                Zyntra has configured modules: OP, IP, Doctors, Pharmacy, Lab, Wards & Billing.
              </p>

              <div className="mt-8 flex gap-2 justify-center">
                <button
                  onClick={goPrev}
                  className="px-5 py-3 rounded-md font-semibold border border-white/10"
                  disabled={loading}
                >
                  ← Back
                </button>

                <button
                  onClick={finishOnboarding}
                  disabled={loading}
                  className="px-6 py-3 rounded-md font-semibold bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0] text-black hover:-translate-y-1 transition shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
                  aria-busy={loading}
                >
                  {loading ? "Setting up…" : "Go to Dashboard →"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
