// web/app/components/ui/NeuralGlassUI.tsx
"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

/**
 * Hardened NeuralGlass UI primitives (strong inline fallbacks + data attribute)
 * - Each button gets a data-ng attribute so global CSS overrides can be targeted safely
 * - Inline styles set explicit colors so higher-specificity CSS rarely wins
 */

const baseTapHighlight = { WebkitTapHighlightColor: "transparent" };

export const PrimaryButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  const fallbackStyle: React.CSSProperties = {
    backgroundColor: "#2563eb", // blue-600
    color: "#ffffff",
    borderRadius: 16,
    minHeight: 40,
    ...baseTapHighlight,
    ...style,
  };
  return (
    <button
      {...rest}
      data-ng="neural primary"
      style={fallbackStyle}
      className={[
        "inline-flex items-center justify-center gap-2 px-6 py-2 rounded-2xl text-sm font-semibold",
        "transition disabled:opacity-60 disabled:cursor-not-allowed",
        // gradient class left for normal styling, fallback is inline
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
  const fallbackStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    color: "#0f172a", // slate-900
    borderRadius: 16,
    minHeight: 36,
    ...baseTapHighlight,
    ...style,
  };
  return (
    <button
      {...rest}
      data-ng="neural secondary"
      style={fallbackStyle}
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
  const fallbackStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.95)",
    color: "#0f172a",
    borderRadius: 12,
    minHeight: 32,
    ...baseTapHighlight,
    ...style,
  };
  return (
    <button
      {...rest}
      data-ng="neural ghost"
      style={fallbackStyle}
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
  // explicit inline styles for both states
  const activeStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    borderRadius: 10,
    padding: "8px 14px",
    minWidth: 90,
    ...baseTapHighlight,
  };
  const inactiveStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    color: "#475569", // slate-600 — visible but softer
    padding: "8px 14px",
    minWidth: 90,
    ...baseTapHighlight,
  };

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
      style={{ ...baseTapHighlight }}
    >
      <button
        role="tab"
        aria-selected={leftActive}
        tabIndex={leftActive ? 0 : -1}
        onClick={onToggleLeft}
        onKeyDown={onKeyDownLeft}
        data-ng="neural segmented-left"
        style={leftActive ? activeStyle : inactiveStyle}
        className="text-sm font-medium transition"
      >
        {leftLabel}
      </button>

      <button
        role="tab"
        aria-selected={!leftActive}
        tabIndex={!leftActive ? 0 : -1}
        onClick={onToggleRight}
        onKeyDown={onKeyDownRight}
        data-ng="neural segmented-right"
        style={!leftActive ? activeStyle : inactiveStyle}
        className="text-sm font-medium transition"
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
