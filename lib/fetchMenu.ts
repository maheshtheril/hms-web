import { MenuResponse } from "@/types/menu";
import { BACKEND } from "@/lib/env"; // <-- central backend URL

export async function fetchMenu(): Promise<MenuResponse> {
  if (!BACKEND) {
    console.error("[fetchMenu] BACKEND URL missing. Set NEXT_PUBLIC_BACKEND_URL.");
    return { ok: false, modules: [], items: [] };
  }

  try {
    const res = await fetch(`${BACKEND}/api/menu`, {
      method: "GET",
      credentials: "include", // send sid cookie to backend
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[fetchMenu] backend error: ${res.status}`, err);
      return { ok: false, modules: [], items: [] };
    }

    return res.json();
  } catch (err) {
    console.error("[fetchMenu] network error:", err);
    return { ok: false, modules: [], items: [] };
  }
}
