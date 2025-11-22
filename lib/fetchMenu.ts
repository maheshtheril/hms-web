import { MenuResponse } from "@/types/menu";

export async function fetchMenu(): Promise<MenuResponse> {
  const res = await fetch("/api/menu", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    console.error("[fetchMenu] error:", await res.text());
    return { ok: false, modules: [], items: [] };
  }

  return res.json();
}
