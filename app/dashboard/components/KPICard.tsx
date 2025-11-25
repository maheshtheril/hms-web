"use client";

import React from "react";
import { motion } from "framer-motion";

interface KPICardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  trend?: string | null;
  className?: string;
}

/**
 * KPICard
 * - Typed props to avoid implicit `any`
 * - Small, reusable KPI tile for dashboards
 * - Accepts React nodes for flexible content (strings, numbers, JSX)
 */
const KPICard: React.FC<KPICardProps> = ({ title, value, trend = null, className = "" }) => {
  const trendIsPositive = typeof trend === "string" && /^\+/.test(trend);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-6 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-md ${className}`}
    >
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {trend && (
        <div className={`text-sm mt-1 ${trendIsPositive ? "text-green-400" : "text-red-400"}`}>
          {trend}
        </div>
      )}
    </motion.div>
  );
};

export default KPICard;
