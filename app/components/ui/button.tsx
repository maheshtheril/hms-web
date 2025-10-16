"use client";
import React from "react";
import clsx from "clsx";

export function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx("rounded-xl px-4 py-2 text-sm font-semibold bg-white text-black shadow-md hover:scale-[.995] active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30", className)}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx("rounded-xl px-4 py-2 text-sm font-semibold border border-white/10 bg-transparent hover:bg-white/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20", className)}
    >
      {children}
    </button>
  );
}
