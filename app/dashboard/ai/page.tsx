// /app/dashboard/ai/page.tsx
"use client";

import AIChatWindow from "./components/AIChatWindow";
import AIContextSidebar from "./components/AIContextSidebar";
import AIQuickActions from "./components/AIQuickActions";

export default function AICenter() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-screen p-4">
      
      {/* Left Context Sidebar */}
      <div className="hidden md:block col-span-1">
        <AIContextSidebar />
      </div>

      {/* Main Chat Window */}
      <div className="col-span-3 glass p-4 rounded-3xl h-full flex flex-col">
        <AIChatWindow />
      </div>
    </div>
  );
}
