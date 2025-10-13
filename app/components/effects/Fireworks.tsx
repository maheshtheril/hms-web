// app/components/effects/Fireworks.tsx
"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

/** Methods exposed to parent components via ref */
export type FireworksHandle = {
  /** burst roughly at the center of the viewport */
  burstCenter: (power?: number) => Promise<void> | void;
  /** burst at x,y (viewport pixels) */
  burstAt: (x: number, y: number, power?: number) => Promise<void> | void;
};

type Props = {
  /** overlay z-index (purely for stacking; canvas-confetti draws to body) */
  zIndex?: number;
  /** extra classes for overlay div (e.g., to animate opacity) */
  className?: string;
  /** preloads the library on mount for instant first burst (default: true) */
  preload?: boolean;
};

let _confetti: any | null = null;

async function getConfetti() {
  if (typeof window === "undefined") return null; // SSR guard
  if (_confetti) return _confetti;
  try {
    const mod = await import("canvas-confetti");
    _confetti = (mod as any).default ?? mod;
  } catch {
    _confetti = null; // graceful no-op if import fails
  }
  return _confetti;
}

const Fireworks = forwardRef<FireworksHandle, Props>(function Fireworks(
  { zIndex = 9999, className, preload = true },
  ref
) {
  const [mounted, setMounted] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (!preload) return;
    getConfetti()
      .then((c) => {
        if (c) readyRef.current = true;
      })
      .catch(() => {});
  }, [preload]);

  const burstAt = async (x: number, y: number, power = 80) => {
    const confetti = await getConfetti();
    if (!confetti) return;

    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const origin = { x: Math.max(0, Math.min(1, x / w)), y: Math.max(0, Math.min(1, y / h)) };

    confetti({
      particleCount: Math.round(power),
      spread: 70,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 200,
      scalar: 1,
      origin,
      drift: 0,
    });
  };

  const burstCenter = async (power = 80) => {
    const x = Math.floor((typeof window !== "undefined" ? window.innerWidth : 0) / 2);
    const y = Math.floor((typeof window !== "undefined" ? window.innerHeight : 0) / 2);
    return burstAt(x, y, power);
  };

  useImperativeHandle(
    ref,
    (): FireworksHandle => ({
      burstCenter,
      burstAt,
    }),
    []
  );

  // Only an overlay for stacking context; the canvas is injected by canvas-confetti on <body>
  if (!mounted) return null;
  return (
    <div
      className={`pointer-events-none fixed inset-0 ${className ?? ""}`}
      style={{ zIndex }}
      aria-hidden="true"
    />
  );
});

export default Fireworks;
