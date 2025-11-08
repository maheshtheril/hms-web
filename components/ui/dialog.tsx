"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Simple glass-style dialog layout primitives
 * Compatible with shadcn/ui-style components and minimal dependencies.
 * This lightweight version can be swapped for Radix Dialog later if needed.
 */

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

/** Root dialog wrapper */
const Dialog: React.FC<DialogProps> = ({ children }) => {
  return <>{children}</>;
};

/** Trigger element wrapper */
const DialogTrigger: React.FC<React.PropsWithChildren<{ asChild?: boolean }>> = ({ children }) =>
  <>{children}</>;

/** Dialog content container */
const DialogContent: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "relative z-50 mx-auto w-full max-w-lg rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 shadow-xl p-6",
        "transition-all duration-200 animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {children}
    </div>
  );
};

/** Dialog header (title + optional description) */
const DialogHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "mb-4 border-b border-white/20 pb-2 flex items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
};

/** Dialog title (text heading) */
const DialogTitle: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return (
    <h2
      className={cn(
        "text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight",
        className
      )}
    >
      {children}
    </h2>
  );
};

/** Dialog footer (action area, e.g. Cancel / Save buttons) */
const DialogFooter: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return (
    <div
      className={cn(
        "mt-4 border-t border-white/10 pt-3 flex justify-end gap-2",
        className
      )}
    >
      {children}
    </div>
  );
};

/** Optional description section */
const DialogDescription: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return (
    <p
      className={cn(
        "text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed",
        className
      )}
    >
      {children}
    </p>
  );
};

/** Centralized exports (export Dialog under both names so imports keep working) */
export {
  Dialog,
  Dialog as RootDialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
};
