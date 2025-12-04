import { BACKEND } from "@/lib/env";

export async function fetchCompanies() {
  if (!BACKEND) {
    console.error("[fetchCompanies] BACKEND missing. Set NEXT_PUBLIC_BACKEND_URL.");
    return { ok: false, companies: [] };
  }

  try {
    const res = await fetch(`${BACKEND}/api/user/companies`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[fetchCompanies] backend error:", res.status, text);
      return { ok: false, companies: [] };
    }

    return await res.json();
  } catch (err) {
    console.error("[fetchCompanies] network error:", err);
    return { ok: false, companies: [] };
  }
}
