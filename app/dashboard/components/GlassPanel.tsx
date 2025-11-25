"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassPanelProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

/**
 * GlassPanel
 * - Typed props (no implicit any)
 * - Optional title
 * - Optional style overrides
 * - Smooth motion animation
 */
const GlassPanel: React.FC<GlassPanelProps> = ({
  title,
  children,
  className = "",
  titleClassName = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl ${className}`}
    >
      {title && (
        <h2 className={`text-xl font-semibold mb-4 ${titleClassName}`}>{title}</h2>
      )}
      <div>{children}</div>
    </motion.div>
  );
};

export default GlassPanel;
