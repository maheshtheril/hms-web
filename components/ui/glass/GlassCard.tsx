// components/ui/glass/GlassCard.tsx
"use client";

import React from "react";
import clsx from "clsx";

export type GlassCardProps = {
  children?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
};

export default function GlassCard({ children, className, as: Component = "div", ...rest }: GlassCardProps & any) {
  return (
    <Component
      {...rest}
      className={clsx(
        "relative overflow-hidden rounded-2xl p-4 border border-white/10 backdrop-blur-xl",
        "bg-gradient-to-tr from-white/3 to-white/6",
        "shadow-[0_8px_30px_rgba(2,6,23,0.4)]",
        className
      )}
    >
      {/* sheen + color wash */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-indigo-400/4 to-cyan-300/3 mix-blend-screen" />
      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_60px_120px_rgba(0,0,0,0.08)]" />
      <div className="relative z-10">{children}</div>
    </Component>
  );
}
