"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  title?: string;
  value?: React.ReactNode;
  trend?: string;
  className?: string;
}

export default function KPICard({ title, value, trend, className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-5 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 shadow ${className}`}
    >
      {title && <div className="text-sm opacity-70">{title}</div>}
      <div className="text-3xl font-bold mt-2">{value ?? "—"}</div>
      {trend && <div className="text-xs mt-1 text-green-400">{trend}</div>}
    </motion.div>
  );
}
