"use client";

import React from "react";
import { motion } from "framer-motion";

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function GlassButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: GlassButtonProps) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 text-white shadow-lg transition 
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-white/20"} 
        ${className}`}
    >
      {children}
    </motion.button>
  );
}
