// web/components/NeuralGlow.tsx
"use client";

import { motion } from "framer-motion";
import React from "react";

export default function NeuralGlow({
  size = 520,
  intensity = 0.85,
  colorA = "#60a5fa",
  colorB = "#6366f1",
  colorC = "#a78bfa",
}: {
  size?: number;
  intensity?: number;
  colorA?: string;
  colorB?: string;
  colorC?: string;
}) {
  const outer = {
    width: size,
    height: size,
    filter: `blur(${80 * intensity}px)`,
    background: `radial-gradient(circle at center, ${hexWithAlpha(colorA, 0.16)} 0%, ${hexWithAlpha(colorB, 0.12)} 30%, ${hexWithAlpha(colorC, 0.06)} 60%, transparent 75%)`,
  } as React.CSSProperties;

  const inner = {
    width: Math.round(size * 0.48),
    height: Math.round(size * 0.48),
    filter: `blur(${30 * intensity}px)`,
    background: `radial-gradient(circle at center, ${hexWithAlpha(colorA, 0.22)} 0%, ${hexWithAlpha(colorB, 0.07)} 45%, transparent 70%)`,
  } as React.CSSProperties;

  return (
    <div className="pointer-events-none select-none" aria-hidden>
      <motion.div
        className="absolute rounded-full"
        style={outer}
        initial={{ scale: 1, opacity: 0.75 }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75], rotate: [0, 16, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={inner}
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: [1, 1.03, 1], opacity: [0.5, 0.9, 0.5], rotate: [0, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** Helper: convert hex to rgba string with alpha */
function hexWithAlpha(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
