// web/components/AIBadge.tsx
import React from "react";

export default function AIBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`ai-badge ${small ? "text-[11px] px-2" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1" aria-hidden>
        <path fill="currentColor" d="M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9Zm0 2a7 7 0 0 1 7 7c0 1.7-.6 3.3-1.7 4.5L7.5 7.7A6.9 6.9 0 0 1 12 4Z"/>
      </svg>
      AI
    </span>
  );
}
