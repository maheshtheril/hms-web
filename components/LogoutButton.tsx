"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("logout error:", err);
    } finally {
      // go back to login after logout
      router.replace("/login");
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm"
    >
      Logout
    </button>
  );
}
