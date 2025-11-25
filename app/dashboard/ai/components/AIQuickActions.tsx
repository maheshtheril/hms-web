// /app/dashboard/ai/components/AIQuickActions.tsx
"use client";

export default function AIQuickActions() {
  const actions = [
    "Create Patient",
    "Create Invoice",
    "Check Stock",
    "Schedule Appointment",
    "Search Employee",
    "Get Reports",
  ];

  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <button key={a} className="glass px-3 py-1 rounded-xl text-sm">
          {a}
        </button>
      ))}
    </div>
  );
}
