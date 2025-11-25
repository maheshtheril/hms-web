"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function FinanceGlassPanel({
  title,
  subtitle,
  children,
  className = "",
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-md ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <div className="text-sm opacity-60 mt-1">{subtitle}</div>}
        </header>
      )}
      <div>{children}</div>
    </motion.section>
  );
}
