"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/app/components/TopNav";
import DashboardIntro from "@/components/DashboardIntro";
import NeuralGlow from "@/components/NeuralGlow";

/**
 * Unified Dashboard layout
 * Includes Sidebar, TopNav, background glow, and one-time intro animation.
 */

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("seenDashboardIntro")) {
        setShowIntro(true);
        sessionStorage.setItem("seenDashboardIntro", "1");
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="relative min-h-screen flex bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      {/* Animated glow background */}
      <div className="absolute -top-64 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <NeuralGlow
          size={1000}
          intensity={0.75}
          colorA="#60a5fa"
          colorB="#818cf8"
          colorC="#a78bfa"
        />
      </div>

      {/* Intro animation (once per session) */}
      {showIntro && <DashboardIntro onFinish={() => setShowIntro(false)} />}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="relative z-10 flex-1 min-w-0 backdrop-blur-[1px]">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
