"use client";

import { motion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";

export default function ComingSoon({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0b0b12] via-[#111827] to-[#0f172a] relative overflow-hidden">
      
      {/* Glass overlay */}
      <div className="absolute inset-0 backdrop-blur-3xl bg-white/5" />

      {/* Neural light gradients */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_40%),radial-gradient(circle_at_75%_75%,rgba(255,255,255,0.08),transparent_40%)]"
      />

      {/* Card content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-lg p-8 rounded-3xl bg-white/10 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
            <Clock className="w-10 h-10 text-white/90" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Coming Soon</h1>
        <p className="mt-4 text-lg text-white/70 leading-relaxed">
          The <span className="text-white/90 font-semibold">{label}</span> section is currently in progress.  
          We’re shaping it with <Sparkles className="inline-block w-4 h-4 text-indigo-400" /> neural precision.
        </p>
        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 backdrop-blur-xl transition-all duration-300"
          >
            ← Back to Dashboard
          </button>
        </div>
      </motion.div>

      {/* Glowing orbs */}
      <div className="absolute -bottom-32 left-1/2 w-[500px] h-[500px] bg-indigo-600/30 blur-[180px] rounded-full -translate-x-1/2" />
      <div className="absolute -top-32 left-1/2 w-[400px] h-[400px] bg-cyan-500/20 blur-[150px] rounded-full -translate-x-1/2" />
    </div>
  );
}
