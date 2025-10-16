// web/components/BrandLogo.tsx
import React from "react";

export default function BrandLogo({
  size = 20,
  pulse = true,
  src = "/logo.png",
  alt = "GeniusGrid",
}: { size?: number; pulse?: boolean; src?: string; alt?: string }) {
  return (
    <div className="flex justify-center">
      <div className="relative">
        <div
          className={`absolute -inset-2 rounded-full bg-gradient-to-r from-sky-400/40 via-indigo-500/30 to-transparent blur-[90px] opacity-80 ${pulse ? "glow-pulse" : ""}`}
        />
        <div className="relative z-10 flex items-center justify-center rounded-full bg-white/5 p-2 shadow-2xl backdrop-blur-sm" style={{ height: `${size + 4}rem`, width: `${size + 4}rem` }}>
          <img src={src} alt={alt} className="h-full w-full object-contain rounded-full" />
        </div>
      </div>
    </div>
  );
}
