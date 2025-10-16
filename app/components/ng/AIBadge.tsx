"use client";
import React from "react";

export default function AIBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/6 border border-[color:var(--ng-border)] ${className}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 2a2 2 0 0 1 2 2v2h-4V4a2 2 0 0 1 2-2zM8 7h8v2H8V7zm1 6h6v2H9v-2zM6 19h12v2H6v-2z" /></svg>
      <strong className="font-semibold">AI</strong>
    </span>
  );
}
