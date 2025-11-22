"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManufacturingOnboarding() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [manufacturingType, setManufacturingType] = useState<string>("discrete");
  const [enableWorkCenters, setEnableWorkCenters] = useState<boolean>(true);
  const [enableBOMTemplates, setEnableBOMTemplates] = useState<boolean>(true);
  const [defaultRoutingCount, setDefaultRoutingCount] = useState<number>(2);

  async function finish() {
    try {
      await fetch("/api/onboarding/manufacturing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          manufacturingType,
          enableWorkCenters,
          enableBOMTemplates,
          defaultRoutingCount,
        }),
      });
    } catch (err) {
      console.error("manufacturing onboarding failed:", err);
    }

    router.push("/tenant/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071226] to-[#071321] flex items-center justify-center p-10 text-white">
      <div className="w-full max-w-3xl mx-auto">
        <div className="relative rounded-xl bg-[rgba(255,255,255,0.03)] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#00E3C2]/8 blur-3xl" />

          <h1 className="text-3xl font-bold mb-6">Manufacturing Onboarding</h1>

          {/* STEP 1: Type */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Manufacturing Type</h2>
              <p className="text-white/70 mb-4">Choose the manufacturing style your business uses.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-3 rounded-md border cursor-pointer ${manufacturingType === "discrete" ? "border-[#00E3C2] bg-[#00E3C2]/8" : "border-white/10 hover:bg-white/5"}`}>
                  <input type="radio" name="mtype" checked={manufacturingType === "discrete"} onChange={() => setManufacturingType("discrete")} className="mr-2" />
                  Discrete Manufacturing (assemblies, BOM-driven)
                </label>

                <label className={`p-3 rounded-md border cursor-pointer ${manufacturingType === "process" ? "border-[#00E3C2] bg-[#00E3C2]/8" : "border-white/10 hover:bg-white/5"}`}>
                  <input type="radio" name="mtype" checked={manufacturingType === "process"} onChange={() => setManufacturingType("process")} className="mr-2" />
                  Process Manufacturing (batch, formula-driven)
                </label>
              </div>

              <button
                onClick={() => setStep(2)}
                className="mt-8 w-full bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9] text-black py-3 rounded-md font-semibold hover:-translate-y-1 transition"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2: Work centers */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Work Centers</h2>
              <p className="text-white/70 mb-4">Work centers are used for scheduling operations and capacity planning.</p>

              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer">
                <input type="checkbox" checked={enableWorkCenters} onChange={(e) => setEnableWorkCenters(e.target.checked)} className="mr-2" />
                Enable Work Centers (automatic seed: 2 common work centers)
              </label>

              <div className="mt-4">
                <div className="text-sm text-white/70 mb-2">Default number of routing steps</div>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={defaultRoutingCount}
                  onChange={(e) => setDefaultRoutingCount(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-[#06121a] border border-white/8 rounded-md outline-none"
                />
              </div>

              <button
                onClick={() => setStep(3)}
                className="mt-8 w-full bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9] text-black py-3 rounded-md font-semibold hover:-translate-y-1 transition"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 3: BOM templates */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">BOM & Templates</h2>
              <p className="text-white/70 mb-4">Seeds for BOM templates and routing samples to get started quickly.</p>

              <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer">
                <input type="checkbox" checked={enableBOMTemplates} onChange={(e) => setEnableBOMTemplates(e.target.checked)} className="mr-2" />
                Create sample BOM templates (Basic assembly & sub-assembly)
              </label>

              <button
                onClick={() => setStep(4)}
                className="mt-8 w-full bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9] text-black py-3 rounded-md font-semibold hover:-translate-y-1 transition"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 4: FINISH */}
          {step === 4 && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold">Manufacturing Workspace Ready</h2>
              <p className="text-white/60 mt-2">
                Work centers, BOM templates and routing samples will be created. You can refine them from the Manufacturing app.
              </p>

              <button
                onClick={finish}
                className="mt-8 bg-gradient-to-r from-[#C8FFF0] to-[#B2FFE9] text-black px-6 py-3 rounded-md font-semibold hover:-translate-y-1 transition"
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
