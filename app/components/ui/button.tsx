"use client";
import React from "react";
export function Button({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 transition ${className}`} />
}