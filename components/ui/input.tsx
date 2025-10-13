"use client";
import React from "react";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20 ${props.className ?? ""}`} />
}