"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  className?: string;
}

/**
 * Simple accessible label component used across the app.
 * - Keeps consistent spacing, font-size and color for Neural-Glass look.
 * - Supports `required` prop which appends a small red asterisk.
 */
export const Label: React.FC<LabelProps> = ({ children, required = false, className, ...rest }) => {
  return (
    <label
      {...rest}
      className={cn(
        "text-sm font-medium text-slate-700 dark:text-slate-200",
        "select-none",
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {required ? <sup className="text-red-600 ml-0.5 text-xs" aria-hidden>*</sup> : null}
      </span>
    </label>
  );
};

export default Label;
