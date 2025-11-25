"use client";

import React from "react";
import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`p-6 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 h-72 shadow-md ${className}`}
    >
      <div className="mb-4">
        <div className="text-lg font-semibold">{title}</div>
        {subtitle && <div className="text-xs opacity-60">{subtitle}</div>}
      </div>

      <div className="flex items-center justify-center h-40 opacity-50">
        {children ?? <span>Chart Placeholder</span>}
      </div>
    </motion.div>
  );
};

export default ChartCard;
