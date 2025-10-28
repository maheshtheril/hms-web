// components/ui/glass/Button.tsx
"use client";

import React from "react";
import clsx from "clsx";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "accent" | "danger";
  as?: React.ElementType;
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-white/6 border border-white/10 text-white/95 hover:scale-[1.02] focus:ring-2 focus:ring-white/10",
  ghost:
    "bg-transparent border border-transparent text-white/90 hover:bg-white/4 focus:ring-2 focus:ring-white/8",
  accent:
    "bg-gradient-to-br from-cyan-400/10 to-violet-400/10 border border-white/12 text-white/95 shadow-[0_8px_30px_rgba(99,102,241,0.06)]",
  danger:
    "bg-red-500/8 text-rose-300 border border-rose-300/20 hover:bg-red-500/12",
};

export default function Button({
  children,
  className,
  variant = "default",
  as: Component = "button",
  ...rest
}: ButtonProps) {
  return (
    <Component
      {...(rest as any)}
      className={clsx(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-all transform will-change-transform disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </Component>
  );
}
