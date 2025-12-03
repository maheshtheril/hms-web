"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BACKEND } from "@/lib/env"; // 🧠 env-based backend URL

export default function HospitalOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // local only, not sent to backend
  const [subIndustry, setSubIndustry] = useState<string>("hospital");
  const [departments, setDepartments] = useState<string[]>([]);
  const [billingMode, setBillingMode] = useState<string>("cash");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SUB_TYPES = [
    { key: "clinic", label: "Clinic" },
    { key: "hospital", label: "Full Hospital" },
    { key: "multispeciality", label: "Multi-Speciality Hospital" },
  ];

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
  ];

  const BILLING_MODES = [
    { key: "cash", label: "Cash Billing" },
    { key: "insurance", label: "Insurance Billing" },
    { key: "mixed", label: "Mixed (Cash + Insurance)" },
  ];

  function toggleDepartment(dep: string) {
    setDepartments((prev) =>
      prev.includes(dep) ? prev.filter((d) => d !== dep) : [...prev, dep]
    );
  }

  async function finishOnboarding() {
    if (loading) return;
    setError(null);

    if (!BACKEND) {
      setError(
        "Backend URL is not configured. Ask admin to set NEXT_PUBLIC_BACKEND_URL."
      );
      return;
    }

    setLoading(true);

    const url = `${BACKEND}/api/onboarding/hms`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // send sid cookie to backend
        body: JSON.stringify({
          // do NOT send subIndustry since you said you don't want it persisted
          departments,
          billingMode,
        }),
        signal: controller.signal,
      });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const text = await res.text().catch(() => "");

      if (!res.ok) {
        let detail = "";
        if (ct.includes("application/json")) {
          try {
            const j = JSON.parse(text);
            detail = j?.error || j?.message || JSON.stringify(j);
          } catch {
            detail = "(json-parse-failed)";
          }
        } else {
          detail = text ? text.slice(0, 400) : "(no-body)";
        }
        setError(`Onboarding failed: ${res.status} ${detail}`);
        console.warn("onboarding failed:", res.status, detail);
        return;
      }

      if (ct.includes("application/json")) {
        try {
          const j = JSON.parse(text);
          console.info("onboarding success:", j);
        } catch {
          // ignore JSON parse failure on success
        }
      }

      router.push("/tenant/dashboard");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setError("Onboarding request timed out. Try again.");
      } else {
        setError(err?.message || "Network error during onboarding");
      }
      console.error("finishOnboarding error:", err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071226] to-[#071321] p-10 text-white">
      <div className="w-full max-w-3xl">
        {/* Glass Container */}
        <div className="relative rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/10 backdrop-blur-xl shadow-2xl p-10 ring-1 ring-white/5">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[#00E3C2]/10 blur-3xl"></div>

          <h1 className="text-4xl font-bold mb-8">Hospital Setup Wizard</h1>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-900/10 p-3 rounded">
              {error}
            </div>
          )}

          {/* STEP 1 — Hospital Type */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Hospital Type</h2>

              <div className="space-y-4">
                {SUB_TYPES.map((s) => (
                  <label
                    key={s.key}
                    className={`cursor-pointer block px-5 py-4 rounded-md border transition-all
                    ${
                      subIndustry === s.key
                        ? "border-[#00E3C2] bg-[#00E3C2]/10"
                        : "border-white/10 hover:bg-white/5"
                    }
                  `}
                  >
                    <input
                      type="radio"
                      name="subIndustry"
                      value={s.key}
                      checked={subIndustry === s.key}
                      onChange={(e) => setSubIndustry(e.target.value)}
                      className="mr-4"
                    />
                    {s.label}
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="mt-8 w-full py-3 rounded-md font-semibold 
                bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0]
                text-black hover:-translate-y-1 transition shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 — Departments */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Choose Your Departments</h2>
              <p className="text-white/60 mb-4">
                Select all the departments available in your hospital.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEPARTMENT_LIST.map((dep) => (
                  <label
                    key={dep}
                    className={`cursor-pointer border px-4 py-3 rounded-md transition-all
                      ${
                        departments.includes(dep)
                          ? "border-[#00E3C2] bg-[#00E3C2]/10"
                          : "border-white/10 hover:bg-white/5"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={departments.includes(dep)}
                      onChange={() => toggleDepartment(dep)}
                      className="mr-3"
                    />
                    {dep}
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                className="mt-8 w-full py-3 rounded-md font-semibold 
                bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0]
                text-black hover:-translate-y-1 transition shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 3 — Billing Mode */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Billing Mode</h2>

              <div className="space-y-4">
                {BILLING_MODES.map((m) => (
                  <label
                    key={m.key}
                    className={`cursor-pointer block px-5 py-4 rounded-md border transition-all
                    ${
                      billingMode === m.key
                        ? "border-[#00E3C2] bg-[#00E3C2]/10"
                        : "border-white/10 hover:bg-white/5"
                    }
                  `}
                  >
                    <input
                      type="radio"
                      name="billing"
                      value={m.key}
                      checked={billingMode === m.key}
                      onChange={(e) => setBillingMode(e.target.value)}
                      className="mr-3"
                    />
                    {m.label}
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep(4)}
                disabled={!billingMode}
                className="mt-8 w-full py-3 rounded-md font-semibold 
                bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0]
                text-black hover:-translate-y-1 disabled:opacity-50
                transition shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 4 — Final */}
          {step === 4 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold">Your Hospital Is Ready</h2>
              <p className="text-white/60 mt-2">
                Zyntra has configured all modules: OP, IP, Doctors, Pharmacy, Lab, Wards &
                Billing.
              </p>

              <button
                onClick={finishOnboarding}
                disabled={loading}
                className="mt-8 px-6 py-3 rounded-md font-semibold 
                bg-gradient-to-r from-[#B2FFE9] to-[#C8FFF0]
                text-black hover:-translate-y-1 transition 
                shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                {loading ? "Setting up…" : "Go to Dashboard →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
