"use client";
import React from "react";
import clsx from "clsx";

export default function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-xl px-4 py-2 text-sm font-semibold bg-white text-black shadow-md hover:translate-y-[-1px] active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}
