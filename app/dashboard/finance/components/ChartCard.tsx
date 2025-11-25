"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, children, className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`p-6 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 h-72 ${className}`}
    >
      {title && <div className="text-lg font-semibold mb-4">{title}</div>}
      <div className="flex items-center justify-center h-full opacity-75">{children ?? <span>Chart placeholder</span>}</div>
    </motion.div>
  );
}
