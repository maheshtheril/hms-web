"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  subtitle?: React.ReactNode;
}

export default function GlassPanel({ title, subtitle, children, className = "" }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 backdrop-blur-xl bg-white/5 border border-white/10 shadow-sm ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <div className="text-sm opacity-70 mt-1">{subtitle}</div>}
        </header>
      )}
      <div>{children}</div>
    </motion.section>
  );
}
