"use client";
import React from "react";

export default function NeuralGlow({
  size = 720,
  intensity = 0.9,
  colorA = "var(--ng-accent-a)",
  colorB = "var(--ng-accent-b)",
  colorC = "var(--ng-accent-c)",
  className = "",
}: { size?: number; intensity?: number; colorA?: string; colorB?: string; colorC?: string; className?: string }) {
  const s = Math.max(320, size);
  const opacity = Math.max(0.06, Math.min(0.22, intensity * 0.12));
  return (
    <div
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{ width: s, height: s }}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} preserveAspectRatio="xMidYMid slice" className="opacity-100">
        <defs>
          <radialGradient id="ngGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor={colorA} stopOpacity={opacity} />
            <stop offset="45%" stopColor={colorB} stopOpacity={opacity * 0.9} />
            <stop offset="100%" stopColor={colorC} stopOpacity={0} />
          </radialGradient>
          <filter id="ngBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="42" />
          </filter>
        </defs>

        <rect width={s} height={s} fill="url(#ngGrad)" filter="url(#ngBlur)" style={{ transformOrigin: "50% 50%", transform: "translateY(-4%) rotate(.4deg) scale(1.02)" }} />
      </svg>
    </div>
  );
}
