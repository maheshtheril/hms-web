"use client";

import React from "react";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
}

/**
 * GlassInput
 * - forwards ref to the underlying <input>
 * - accepts all standard input props (type, placeholder, value, onChange, etc.)
 * - optional label (string or React node) and className overrides
 */
const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, containerClassName = "", inputClassName = "", ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`}>
        {label && <label className="text-xs opacity-70">{label}</label>}
        <input
          ref={ref}
          {...props}
          className={`bg-white/10 border border-white/20 rounded-xl px-4 py-2 outline-none
                     text-white placeholder-white/40 focus:ring-1 focus:ring-white/10 ${inputClassName}`}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";

export default GlassInput;
