"use client";
import React from "react";
import Link from "next/link";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * GhostButton:
 * - If href is internal (starts with "/") -> use Next <Link>.
 * - If href is external -> <a target="_blank" />.
 * - If no href -> render <span> so it can safely be wrapped by a <Link> ancestor.
 */
export function GhostButton({ href, children, className = "", ...rest }: Props) {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-opacity disabled:opacity-60";
  const cls = `${base} ${className}`.trim();

  // internal
  if (href && href.startsWith("/")) {
    return (
      <Link href={href} className={cls} {...(rest as any)}>
        {children}
      </Link>
    );
  }

  // external
  if (href) {
    const safeProps = {
      target: "_blank",
      rel: "noopener noreferrer",
      ...rest,
    } as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={cls} {...safeProps}>
        {children}
      </a>
    );
  }

  // NO href -> render span (safe to be inside Link)
  return (
    <span className={cls} {...(rest as any)}>
      {children}
    </span>
  );
}
