// /app/dashboard/ai/components/AIMessage.tsx
"use client";

export default function AIMessage({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] p-3 rounded-2xl glass ${isUser
        ? "bg-indigo-500/20 border-indigo-400/30"
        : "bg-white/10 border-white/20"
      }`}>
        {text}
      </div>
    </div>
  );
}
