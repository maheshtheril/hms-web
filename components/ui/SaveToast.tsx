"use client";

import { toast } from "sonner";

/**
 * saveToast - show consistent glass-style toast messages across GeniusGrid ERP.
 * 
 * Usage examples:
 *  saveToast.success("Lead saved");
 *  saveToast.error("Could not update invoice");
 *  saveToast.info("Syncing with AI Agent...");
 */

export const saveToast = {
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
      className:
        "backdrop-blur-md bg-emerald-500/10 border border-emerald-400/40 text-emerald-100 shadow-[0_0_20px_rgba(0,255,170,0.25)] rounded-2xl",
      icon: "✅",
    }),

  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
      className:
        "backdrop-blur-md bg-rose-500/10 border border-rose-400/40 text-rose-100 shadow-[0_0_20px_rgba(255,60,80,0.25)] rounded-2xl",
      icon: "❌",
    }),

  info: (title: string, description?: string) =>
    toast(title, {
      description,
      className:
        "backdrop-blur-md bg-blue-500/10 border border-blue-400/40 text-blue-100 shadow-[0_0_20px_rgba(60,140,255,0.25)] rounded-2xl",
      icon: "💡",
    }),
};
