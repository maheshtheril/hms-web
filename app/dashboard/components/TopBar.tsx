"use client";

import { motion } from "framer-motion";

export default function TopBar() {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="
        w-full px-6 py-4
        flex justify-between items-center
        backdrop-blur-xl bg-white/5
        border-b border-white/10
        shadow-lg
      "
    >
      <div className="text-xl font-semibold tracking-wide">Dashboard</div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 outline-none text-white placeholder-white/40"
        />

        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
          🔔
        </div>

        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-black font-bold">
          M
        </div>
      </div>
    </motion.div>
  );
}
