// /app/dashboard/ai/components/AIPromptSuggestions.tsx
"use client";

export default function AIPromptSuggestions() {
  const suggestions = [
    "Show me today's OPD revenue",
    "List all low-stock medicines",
    "Create a new patient John Doe",
    "Show nurse roster for next week",
    "Generate pharmacy sales report",
    "Analyze billing performance"
  ];

  return (
    <div className="glass p-4 rounded-2xl">
      <h3 className="text-lg mb-3">Suggestions</h3>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <button key={s} className="glass-hover p-2 w-full text-left rounded-xl">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
