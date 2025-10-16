// web/components/AuthCard.tsx
import React from "react";

export default function AuthCard({ children, bordered = true, className = "" }: { children: React.ReactNode; bordered?: boolean; className?: string }) {
  return (
    <div className={`${bordered ? "ai-border" : ""} max-w-xl mx-auto ${className}`}>
      <div className="rounded-2xl bg-black/60 p-6 sm:p-8 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
