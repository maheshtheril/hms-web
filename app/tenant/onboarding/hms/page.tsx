"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HMSOnboarding() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<string[]>([]);
  const [billingMode, setBillingMode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DEPARTMENT_LIST = [
    "General Medicine",
    "Pediatrics",
    "Orthopedics",
    "Gynecology",
    "Cardiology",
    "ENT",
    "Dermatology",
    "Neurology",
    "Urology",
    "Emergency",
  ];

  function toggleDepartment(dep: string) {
    setDepartments((prev) =>
      prev.includes(dep) ? prev.filter((d) => d !== dep) : [...prev, dep]
    );
  }

  async function finish() {
    setError(null);
    setLoading(true);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || ""; // env-controlled, empty => relative path
      const url = API ? `${API}/onboarding/hms` : `/api/onboarding/hms`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include", // ensures HttpOnly cookie (session) is included
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          departments,
          billingMode,
        }),
      });

      if (res.status === 401) {
        // not authenticated — redirect to login
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        setError(`Onboarding failed: ${res.status} ${txt ?? ""}`);
        setLoading(false);
        return;
      }

      // success — navigate to tenant dashboard
      router.push("/tenant/dashboard");
    } catch (err: any) {
      setError(err?.message || "Network error during onboarding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071226] to-[#071321] flex items-center justify-center p-10 text-white">
      <div className="w-full max-w-3xl mx-auto">
        {/* Glass Card */}
        <div className="relative rounded-xl bg-[rgba(255,255,255,0.03)] border border-white/10 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/5">
          <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-[#00E3C2]/10 blur-3xl"></div>

          <h1 className="text-3xl font-bold mb-6">Hospital Onboarding</h1>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-900/10 p-3 rounded">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Confirm Your Hospital Setup</h2>
              <p className="text-white/70 leading-relaxed">
                ZYNTRA will automatically create hospital modules including OP, IP, doctors,
                pharmacy, lab defaults, wards, beds & service templates.
              </p>

              <button
                onClick={() => setStep(2)}
                className="mt-8 w-full bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9]
                           text-black py-3 rounded-md font-semibold hover:-translate-y-1
                           transition-transform shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Departments</h2>
              <p className="text-white/60 mb-4">
                Choose the departments you want enabled in your hospital workspace.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEPARTMENT_LIST.map((dep) => (
                  <label
                    key={dep}
                    className={`cursor-pointer border rounded-md px-4 py-3 
                      ${
                        departments.includes(dep)
                          ? "border-[#00E3C2] bg-[#00E3C2]/10"
                          : "border-white/10 hover:bg-white/5"
                      }
                      transition-all`}
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
                className="mt-8 w-full bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9]
                           text-black py-3 rounded-md font-semibold hover:-translate-y-1
                           transition-transform shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Billing Mode</h2>
              <p className="text-white/60 mb-4">
                Select how your hospital handles billing.
              </p>

              <div className="space-y-4">
                {["cash", "insurance", "mixed"].map((mode) => (
                  <label
                    key={mode}
                    className={`cursor-pointer block border rounded-md px-4 py-3 
                      ${
                        billingMode === mode
                          ? "border-[#00E3C2] bg-[#00E3C2]/10"
                          : "border-white/10 hover:bg-white/5"
                      }
                      transition-all`}
                  >
                    <input
                      type="radio"
                      name="billing"
                      value={mode}
                      checked={billingMode === mode}
                      onChange={(e) => setBillingMode(e.target.value)}
                      className="mr-3"
                    />
                    {mode === "cash" && "Cash Billing"}
                    {mode === "insurance" && "Insurance Billing"}
                    {mode === "mixed" && "Mixed (Cash + Insurance)"}
                  </label>
                ))}
              </div>

              <button
                onClick={() => setStep(4)}
                disabled={!billingMode}
                className="mt-8 w-full bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9]
                           text-black py-3 rounded-md font-semibold hover:-translate-y-1
                           transition-transform disabled:opacity-50 shadow-[0_8px_20px_rgba(0,255,220,0.15)]"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold">Your Hospital Workspace Is Ready</h2>
              <p className="text-white/60 mt-2">
                All modules are configured. You can start patient registration, billing, pharmacy,
                lab tests, and more.
              </p>

              <button
                onClick={finish}
                disabled={loading}
                className="mt-8 bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9]
                           text-black px-6 py-3 rounded-md font-semibold
                           hover:-translate-y-1 transition-transform shadow-[0_8px_20px_rgba(0,255,220,0.15)] disabled:opacity-60"
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
