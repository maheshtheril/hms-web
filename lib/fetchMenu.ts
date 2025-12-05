// web/lib/fetchMenu.ts
import { MenuResponse, MenuItem } from "@/types/menu";
import { BACKEND } from "@/lib/env";

/**
 * Robust fetchMenu
 * - accepts backend shapes: { menu: [...] } or { items: [...] } or an array
 * - maps backend fields (path -> url, permission_code -> permission)
 * - returns canonical MenuResponse: { ok, modules, items }
 */

const MENU_URL = (BACKEND && BACKEND.length > 0) ? `${BACKEND.replace(/\/$/, "")}/api/menu` : `/api/menu`;

function normalizeBackendItem(b: any): MenuItem {
  return {
    id: String(b.id ?? b.key ?? b.path ?? Math.random().toString(36).slice(2, 9)),
    key: b.key ?? b.id ?? b.path ?? undefined,
    label: b.label ?? b.name ?? b.title ?? "",
    url: b.url ?? b.path ?? b.route ?? null, // map 'path' -> url
    icon: b.icon ?? null,
    permission: b.permission_code ?? b.permission ?? null,
    children: Array.isArray(b.children) ? b.children.map(normalizeBackendItem) : [],
    sort_order: typeof b.sort_order === "number" ? b.sort_order : 0,
  };
}

export async function fetchMenu(): Promise<MenuResponse> {
  try {
    const res = await fetch(MENU_URL, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[fetchMenu] backend responded", res.status);
      return { ok: false, modules: [], items: [] };
    }

    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, modules: [], items: [] };

    // backend shapes handled:
    // 1) { menu: [...] }
    // 2) { items: [...] }
    // 3) [ ... ] directly
    const raw = data.menu ?? data.items ?? (Array.isArray(data) ? data : null);

    if (!raw || !Array.isArray(raw)) {
      // maybe wrapped: { ok: true, menu: [...] } or { ok: true, data: { menu: [...] } }
      const alt = data.data?.menu ?? data.data?.items;
      if (Array.isArray(alt)) {
        return {
          ok: true,
          modules: data.modules ?? [],
          items: alt.map(normalizeBackendItem),
        };
      }
      console.warn("[fetchMenu] unexpected menu shape:", data);
      return { ok: false, modules: [], items: [] };
    }

    const items = raw.map(normalizeBackendItem);
    return { ok: true, modules: data.modules ?? [], items };
  } catch (err) {
    console.error("[fetchMenu] network error:", err);
    return { ok: false, modules: [], items: [] };
  }
}

/** helper for clearing any client cache you use (if you use sessionStorage) */
export function clearMenuCache() {
  try {
    if (typeof window !== "undefined") sessionStorage.removeItem("erp:menu:v1");
  } catch {}
}
