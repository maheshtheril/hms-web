"use client";
import React from "react";
import Link from "next/link";
import clsx from "clsx";

export function GhostButton({ children, className = "", href, ...props }: any) {
  if (href) {
    return (
      <Link
        href={href}
        className={clsx("inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-[color:var(--ng-border)] bg-transparent hover:bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
        {...props}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      {...props}
      className={clsx("rounded-xl px-4 py-2 text-sm font-semibold border border-[color:var(--ng-border)] bg-transparent hover:bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
    >
      {children}
    </button>
  );
}
