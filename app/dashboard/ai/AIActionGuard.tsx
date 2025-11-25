// /app/dashboard/ai/AIActionGuard.tsx
"use client";

export default function AIActionGuard({ user, children }) {
  const allowed = [
    "admin",
    "manager",
    "doctor",
    "inventory_manager",
    "billing_staff",
    "hr_manager",
  ];

  if (!allowed.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 text-xl">
        AI Assistant Access Denied
      </div>
    );
  }

  return children;
}
