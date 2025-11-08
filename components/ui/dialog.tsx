"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Simple glass-style dialog layout primitives
 * Compatible with shadcn/ui-style components and minimal dependencies.
 * This lightweight version can be swapped for Radix Dialog later if needed.
 *
 * Updated: Neural-Glass, dark-first, high-contrast defaults for production readability.
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

/**
 * Dialog content container
 * Accepts all standard div HTML attributes so callers can pass aria-*, role, id, onClick, etc.
 *
 * Dark-first, high contrast, with strong separation from backdrop:
 * - bg-neutral-900/90 + backdrop blur for glass
 * - border-white/10 to delineate edges
 * - shadow-2xl for depth
 * - generous padding
 */
type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & { className?: string; children?: React.ReactNode };

const DialogContent: React.FC<DialogContentProps> = ({ children, className = "", ...rest }) => {
  return (
    <div
      {...rest}
      className={cn(
        // container geometry + neural glass
        "relative z-50 mx-auto w-full max-w-lg rounded-2xl",
        "bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-2xl p-6",
        // motion + transition
        "transform transition-all duration-200",
        // content text default
        "text-neutral-100",
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
        "mb-4 pb-3 flex items-center justify-between",
        // subtle divider that works in dark mode
        "border-b border-white/6",
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
        "text-xl font-semibold tracking-tight",
        // high contrast title color
        "text-neutral-100",
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
        "mt-6 pt-3 flex justify-end gap-3",
        // lighter top divider so actions feel separated
        "border-t border-white/6",
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
        "text-sm mt-1 leading-relaxed",
        // readable but subtly muted
        "text-neutral-300",
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
