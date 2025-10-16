// web/components/DashboardIntro.tsx
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";

export default function DashboardIntro({ onFinish }: { onFinish?: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // phases: 0 = entrance, 1 = message, 2 = done
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => {
      setPhase(2);
      onFinish?.();
    }, 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinish]);

  return (
    <div aria-live="polite" className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: phase >= 1 ? 1 : 0.9, y: phase >= 1 ? 0 : -6 }}
        transition={{ duration: 0.5 }}
        className="pointer-events-auto rounded-2xl bg-gradient-to-r from-sky-400/10 to-indigo-500/8 border border-white/6 px-5 py-3 shadow-nebula-lg backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/6">
            <BrandLogo size={3} pulse={false} />
          </div>

          <div>
            <div className="text-sm font-semibold">
              {phase === 0 && "Welcome — initializing AI"}
              {phase === 1 && "GeniusGrid AI has optimized your dashboard"}
              {phase === 2 && "Ready — enjoy your workspace"}
            </div>
            <div className="text-xs text-white/60 mt-0.5">
              {phase === 0 && "Booting preferences"}
              {phase === 1 && "Loading smart suggestions"}
              {phase === 2 && "All set"}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
