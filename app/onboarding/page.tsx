// app/onboarding/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import PrimaryButton from "@/components/PrimaryButton";
import NeuralGlow from "@/components/NeuralGlow"; // optional — safe if present
import AIBadge from "@/components/AIBadge";

const STATUS_STEPS = [
  "Provisioning workspace",
  "Applying security defaults",
  "Configuring AI assistant",
  "Preparing your dashboard",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  // readable step text for aria-live
  const ariaText = useMemo(() => STATUS_STEPS[step] ?? "Finishing up", [step]);

  useEffect(() => {
    // progress through steps, then finish and redirect
    if (completed) return;
    const interval = setInterval(() => {
      setStep((s) => {
        if (s >= STATUS_STEPS.length - 1) {
          clearInterval(interval);
          // small pause on last step, then mark complete
          setTimeout(() => setCompleted(true), 600);
          return s;
        }
        return s + 1;
      });
    }, 900); // step every 900ms
    return () => clearInterval(interval);
  }, [completed]);

  useEffect(() => {
    if (!completed) return;
    const t = setTimeout(() => router.push("/dashboard"), 1600);
    return () => clearTimeout(t);
  }, [completed, router]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white overflow-hidden px-6">
      {/* background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />

      {/* Neural glow centered behind logo (if NeuralGlow exists) */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 pointer-events-none">
        {/* try to render NeuralGlow if it exists; if not, harmless */}
        {typeof NeuralGlow === "function" ? <NeuralGlow size={520} intensity={0.85} /> : null}
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6">
        {/* logo + small heading */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-white/6 p-2 shadow-2xl backdrop-blur-sm">
              <BrandLogo size={7} pulse />
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-indigo-400 to-sky-300">
                Setting up your workspace
              </h1>
              <AIBadge />
            </div>
            <p className="text-sm text-white/70 max-w-xl">
              Please wait — GeniusGrid AI is configuring recommended settings for your tenant.
            </p>
          </div>
        </div>

        {/* status card */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/4 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60">Progress</div>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {/* animated dot */}
                  <motion.span
                    animate={completed ? { scale: [1, 1.6, 1] } : { scale: [1, 1.25, 1] }}
                    transition={{ duration: completed ? 0.9 : 0.8, repeat: Infinity, ease: "easeInOut" }}
                    className={`inline-block h-3 w-3 rounded-full ${completed ? "bg-emerald-400" : "bg-sky-400"}`}
                    aria-hidden
                  />
                  <div className="text-sm font-medium">{completed ? "Workspace ready" : ariaText}</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-white/60">Auto redirect in {completed ? 1 : Math.max(1, STATUS_STEPS.length - step)}s</div>
          </div>

          {/* progress bar */}
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-white/6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-300 transition-all"
                style={{
                  width: `${Math.min(100, Math.round(((step + (completed ? 1 : 0)) / STATUS_STEPS.length) * 100))}%`,
                }}
                aria-hidden
              />
            </div>

            {/* step list (small) */}
            <ul className="mt-3 flex flex-col gap-2 text-xs text-white/70">
              {STATUS_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px] ${
                      i <= step || completed ? "bg-emerald-400/90 text-black" : "bg-white/8 text-white/70"
                    }`}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className={i <= step || completed ? "text-white" : "text-white/60"}>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* accessible live region for screen readers */}
          <div className="sr-only" aria-live="polite">
            {completed ? "Workspace created. Redirecting to dashboard." : ariaText}
          </div>

          {/* actions */}
          <div className="mt-5 flex items-center gap-3">
            <PrimaryButton
              onClick={() => {
                // allow user to skip immediately
                router.push("/dashboard");
              }}
            >
              Go to dashboard
            </PrimaryButton>

            <button
              onClick={() => {
                // show current step in an alert for debugging or support
                alert(`Step: ${ariaText}`);
              }}
              className="rounded-xl px-3 py-2 text-sm text-white/80 bg-white/6 hover:bg-white/8"
            >
              View details
            </button>
          </div>
        </div>

        <div className="text-xs text-white/60">Need help? <a href="/support" className="underline">Contact support</a></div>
      </div>
    </div>
  );
}
