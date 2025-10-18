// app/components/ng/PrimaryButton.tsx
"use client";

import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: "button" | "a";
  href?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function PrimaryButton({ as = "button", href, children, className = "", ...rest }: Props) {
  const base = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md focus:outline-none focus-visible:ring-2";
  const styles = `${base} ${className}`;

  if (as === "a" && href) {
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    return (
      <a href={href} className={styles} {...(rest as any)}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={styles} {...(rest as any)}>
      {children}
    </button>
  );
}
