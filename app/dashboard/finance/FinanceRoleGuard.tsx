"use client";

export default function FinanceRoleGuard({ user, children }) {
  const allowed = ["admin", "finance_manager", "accountant"];

  if (!allowed.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400 text-xl">
        Access Denied — Finance Permissions Required
      </div>
    );
  }

  return children;
}
