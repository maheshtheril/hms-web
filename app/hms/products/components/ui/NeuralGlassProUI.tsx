// web/app/components/ui/NeuralGlassProUI.tsx
"use client";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

const baseTap = { WebkitTapHighlightColor: "transparent" };

/**
 * NeuralGlass Pro UI primitives
 * - Inline fallbacks so global CSS cannot invisibilize text
 * - Lightweight, reusable, and accessible
 */

export const PrimaryButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  const fallback: React.CSSProperties = {
    background: "linear-gradient(135deg,#2563eb 0%,#06b6d4 100%)",
    color: "#fff",
    border: "0",
    boxShadow: "0 8px 30px rgba(37,99,235,0.14)",
    borderRadius: 16,
    minHeight: 40,
    padding: "0.5rem 1.25rem",
    fontWeight: 600,
    cursor: "pointer",
    ...baseTap,
    ...style,
  };
  return (
    <button
      {...rest}
      style={fallback}
      className={["ng-btn ng-btn-primary", className].join(" ")}
      data-ng="ng-pro primary"
      aria-pressed={rest["aria-pressed"] ?? undefined}
    >
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  const fallback: React.CSSProperties = {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid rgba(15,23,42,0.04)",
    borderRadius: 14,
    minHeight: 36,
    padding: "0.45rem 1rem",
    fontWeight: 600,
    cursor: "pointer",
    ...baseTap,
    ...style,
  };
  return (
    <button
      {...rest}
      style={fallback}
      className={["ng-btn ng-btn-secondary", className].join(" ")}
      data-ng="ng-pro secondary"
    >
      {children}
    </button>
  );
};

export const GhostButton: React.FC<ButtonProps> = ({ children, className = "", style = {}, ...rest }) => {
  const fallback: React.CSSProperties = {
    background: "rgba(255,255,255,0.94)",
    color: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    minHeight: 34,
    padding: "0.35rem 0.8rem",
    cursor: "pointer",
    ...baseTap,
    ...style,
  };
  return (
    <button
      {...rest}
      style={fallback}
      className={["ng-btn ng-btn-ghost", className].join(" ")}
      data-ng="ng-pro ghost"
    >
      {children}
    </button>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", style = {}, ...rest }) => {
  const fallback: React.CSSProperties = {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 12px 40px rgba(15,23,42,0.08)",
    borderRadius: 20,
    padding: 24,
    color: "#0f172a",
    ...style,
  };
  return (
    <div
      {...rest}
      style={fallback}
      className={["ng-card", className].join(" ")}
      data-ng="ng-pro card"
    >
      {children}
    </div>
  );
};

export const Segmented: React.FC<{
  leftLabel: string;
  rightLabel: string;
  leftActive: boolean;
  onLeft: () => void;
  onRight: () => void;
}> = ({ leftLabel, rightLabel, leftActive, onLeft, onRight }) => {
  return (
    <div className="ng-seg inline-flex" data-ng="ng-pro seg" role="tablist" aria-label="Stockable or Service">
      <button
        type="button"
        aria-selected={leftActive}
        onClick={onLeft}
        style={{
          minWidth: 90,
          padding: "8px 14px",
          borderRadius: 10,
          border: "none",
          background: leftActive ? "#ffffff" : "transparent",
          color: leftActive ? "#0f172a" : "#475569",
          boxShadow: leftActive ? "0 8px 24px rgba(15,23,42,0.06)" : undefined,
          cursor: "pointer",
          ...baseTap,
        }}
      >
        {leftLabel}
      </button>

      <button
        type="button"
        aria-selected={!leftActive}
        onClick={onRight}
        style={{
          minWidth: 90,
          padding: "8px 14px",
          borderRadius: 10,
          border: "none",
          background: !leftActive ? "#ffffff" : "transparent",
          color: !leftActive ? "#0f172a" : "#475569",
          boxShadow: !leftActive ? "0 8px 24px rgba(15,23,42,0.06)" : undefined,
          cursor: "pointer",
          ...baseTap,
        }}
      >
        {rightLabel}
      </button>
    </div>
  );
};

export default { PrimaryButton, SecondaryButton, GhostButton, Card, Segmented };
