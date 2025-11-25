"use client";

import React from "react";
import { motion } from "framer-motion";

interface KPICardProps {
  title?: React.ReactNode;
  value: string | number;
  trend?: string | React.ReactNode;
  className?: string;
}

/**
 * KPICard
 * - Typed props to remove implicit-any errors
 * - Flexible title (string or ReactNode)
 * - value required (string | number)
 * - optional trend can be string or ReactNode
 */
const KPICard: React.FC<KPICardProps> = ({ title, value, trend, className = "" }) => {
  return (
    <motion.div
      className={`p-6 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-md ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {title && <div className="text-sm opacity-70">{title}</div>}
      <div className="text-3xl font-bold mt-2">{value}</div>
      {trend && <div className="text-green-400 text-sm mt-1">{trend}</div>}
    </motion.div>
  );
};

export default KPICard;
