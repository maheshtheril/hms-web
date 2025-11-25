"use client";

import { motion } from "framer-motion";

export default function LoadingGlass() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen w-full flex items-center justify-center
                 backdrop-blur-xl bg-white/5"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="w-10 h-10 border-4 border-white/20 border-t-white/80 rounded-full"
      />
    </motion.div>
  );
}
