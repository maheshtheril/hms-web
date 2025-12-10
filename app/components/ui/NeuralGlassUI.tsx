// web/app/components/ui/NeuralGlassUI.tsx
"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

/**
 * Hardened NeuralGlass UI primitives
 * - Explicit, high-contrast backgrounds & text (solid) so global CSS doesn't break it
 * - Inline style fallback for critical color properties
 * - Accessible focus states
 */

export const PrimaryButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  // solid blue background + white text (explicit)
  const fallbackStyle: React.CSSProperties = {
    backgroundColor: "#2563eb", // blue-600
    color: "#ffffff",
    WebkitTapHighlightColor: "transparent",
  };
  return (
    <button
      {...rest}
      style={{ ...fallbackStyle, ...style }}
      className={[
        "inline-flex items-center justify-center gap-2 px-6 py-2 rounded-2xl text-sm font-semibold",
        "transition disabled:opacity-60 disabled:cursor-not-allowed",
        // keep gradient class but solid fallback above prevents invisible text
        "bg-gradient-to-br from-blue-600 to-blue-500",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  // white solid background with dark text explicit
  const fallbackStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    color: "#0f172a", // slate-900
    WebkitTapHighlightColor: "transparent",
  };
  return (
    <button
      {...rest}
      style={{ ...fallbackStyle, ...style }}
      className={[
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium",
        "transition border border-white/30",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
};

export const GhostButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  // subtle light background + dark text explicit
  const fallbackStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.9)",
    color: "#0f172a",
    WebkitTapHighlightColor: "transparent",
  };
  return (
    <button
      {...rest}
      style={{ ...fallbackStyle, ...style }}
      className={[
        "inline-flex items-center gap-2 px-3 py-1 rounded-xl text-sm font-medium",
        "transition border border-white/20",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
};

type SegmentedToggleProps = {
  leftLabel: string;
  rightLabel: string;
  leftActive: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  ariaLabel?: string;
  className?: string;
};

export const SegmentedToggle: React.FC<SegmentedToggleProps> = ({
  leftLabel,
  rightLabel,
  leftActive,
  onToggleLeft,
  onToggleRight,
  ariaLabel = "Segmented control",
  className = "",
}) => {
  const onKeyDownLeft = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") onToggleRight();
    if (e.key === "Home") onToggleLeft();
    if (e.key === "End") onToggleRight();
  };

  const onKeyDownRight = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") onToggleLeft();
    if (e.key === "Home") onToggleLeft();
    if (e.key === "End") onToggleRight();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={["inline-flex rounded-xl p-1 border", "border-white/20 bg-white/5", className].join(" ")}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <button
        role="tab"
        aria-selected={leftActive}
        tabIndex={leftActive ? 0 : -1}
        onClick={onToggleLeft}
        onKeyDown={onKeyDownLeft}
        className={[
          "px-4 py-2 rounded-lg text-sm font-medium transition",
          leftActive
            ? "bg-white text-slate-900 shadow"
            : "text-white/80",
        ].join(" ")}
        style={leftActive ? { backgroundColor: "#ffffff", color: "#0f172a" } : undefined}
      >
        {leftLabel}
      </button>

      <button
        role="tab"
        aria-selected={!leftActive}
        tabIndex={!leftActive ? 0 : -1}
        onClick={onToggleRight}
        onKeyDown={onKeyDownRight}
        className={[
          "px-4 py-2 rounded-lg text-sm font-medium transition",
          !leftActive
            ? "bg-white text-slate-900 shadow"
            : "text-white/80",
        ].join(" ")}
        style={!leftActive ? { backgroundColor: "#ffffff", color: "#0f172a" } : undefined}
      >
        {rightLabel}
      </button>
    </div>
  );
};

export default {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  SegmentedToggle,
};
