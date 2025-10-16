// web/components/PrimaryButton.tsx
import React from "react";

export default function PrimaryButton({ children, type = "button", className = "", ...props }: any) {
  return (
    <button
      type={type}
      className={`w-full rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-black shadow-lg transition-transform active:scale-[.98] disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
