// /app/dashboard/ai/components/AIKnowledgePanel.tsx
"use client";

export default function AIKnowledgePanel() {
  return (
    <div className="glass p-4 rounded-2xl">
      <h3 className="text-lg mb-3">Context</h3>
      <ul className="opacity-75 text-sm space-y-2">
        <li>Tenant: Zyntra Health Pvt Ltd</li>
        <li>Logged in as: Admin</li>
        <li>Role: Full Access</li>
        <li>Department: Central Operations</li>
      </ul>
    </div>
  );
}
