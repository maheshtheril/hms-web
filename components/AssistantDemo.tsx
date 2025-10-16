// web/components/AssistantDemo.tsx
import React from "react";
import { motion } from "framer-motion";

export default function AssistantDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 max-w-xl rounded-2xl bg-white/5 p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">AI Assistant — Quick demo</h3>
          <button onClick={onClose} className="text-white/70">✕</button>
        </div>
        <div className="mt-3 space-y-3 text-sm text-white/90">
          <div className="rounded-xl bg-white/6 p-3">
            <strong>Suggested setup:</strong>
            <div className="mt-2 text-xs text-white/80">
              • Create default roles: Admin, Accountant, Sales.<br />
              • Import chart of accounts and map GST rates.<br />
              • Enable SMS OTP for client onboarding.
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-white/80">Close</button>
        </div>
      </motion.div>
    </div>
  );
}
