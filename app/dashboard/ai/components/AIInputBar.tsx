// /app/dashboard/ai/components/AIInputBar.tsx
"use client";

import { useState } from "react";
import AIVoiceButton from "./AIVoiceButton";

export default function AIInputBar({ onSend }) {
  const [text, setText] = useState("");

  return (
    <div className="flex items-center gap-3 glass p-3 rounded-2xl">
      <input
        className="flex-1 bg-transparent text-white outline-none"
        placeholder="Ask anything…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend(text)}
      />

      <AIVoiceButton />

      <button
        onClick={() => onSend(text)}
        className="glass px-4 py-2 rounded-xl"
      >
        Send
      </button>
    </div>
  );
}
