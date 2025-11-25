// /app/dashboard/ai/components/AIToolbar.tsx
"use client";

import AIQuickActions from "./AIQuickActions";

export default function AIToolbar() {
  return (
    <div className="glass p-3 rounded-2xl flex justify-between items-center mb-4">
      <div className="text-lg font-semibold">Zyntra AI Assistant</div>
      <AIQuickActions />
    </div>
  );
}
