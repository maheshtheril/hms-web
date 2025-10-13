"use client";

import { ReactNode } from "react";
import { useQuickLead } from "./QuickLeadProvider";

export function QuickLeadButton({
  children,
  className,
  src,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  src: string;
  ariaLabel?: string;
}) {
  const { openQuickLead } = useQuickLead();
  return (
    <button
      type="button"
      aria-label={ariaLabel || "Open quick lead"}
      onClick={() => openQuickLead(src)}
      className={className}
    >
      {children}
    </button>
  );
}
