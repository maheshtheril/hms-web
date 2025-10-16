// web/components/AIToast.tsx
import React from "react";

export default function AIToast({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="fixed right-4 bottom-6 max-w-sm rounded-lg bg-white/6 px-4 py-2 text-sm text-white/90 shadow-lg">
      {children}
    </div>
  );
}
