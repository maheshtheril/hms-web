// /app/dashboard/ai/components/AIChatWindow.tsx
"use client";

import { useState } from "react";
import AIInputBar from "./AIInputBar";
import AIMessage from "./AIMessage";
import AIToolbar from "./AIToolbar";

export default function AIChatWindow() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! I’m Zyntra AI. How can I help you today?" }
  ]);

  return (
    <div className="flex flex-col h-full">
      
      <AIToolbar />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, idx) => (
          <AIMessage key={idx} role={msg.role} text={msg.text} />
        ))}
      </div>

      <AIInputBar onSend={(text) =>
        setMessages([...messages, { role: "user", text }])
      } />
    </div>
  );
}
