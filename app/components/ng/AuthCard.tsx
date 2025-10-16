"use client";
import React from "react";

export default function AuthCard({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        `rounded-2xl border border-[color:var(--ng-border)] bg-[color:var(--ng-surface-1)] backdrop-blur-sm p-6 shadow-ng-soft ${className}`
      }
    >
      {children}
    </div>
  );
}
