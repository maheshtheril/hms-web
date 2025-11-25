// /app/dashboard/ai/components/AIContextSidebar.tsx
"use client";

import AIPromptSuggestions from "./AIPromptSuggestions";
import AIKnowledgePanel from "./AIKnowledgePanel";

export default function AIContextSidebar() {
  return (
    <div className="space-y-4">
      <AIPromptSuggestions />
      <AIKnowledgePanel />
    </div>
  );
}
