// web/app/dashboard/settings/services/settings.api.ts
/* Client API for settings (list / update / effective + helpers)
   - Uses the app's session surface (window.__SESSION__, meta tags)
   - Falls back to calling GET /api/session (should read from your session table)
   - No localStorage access anymore (server/session table is the source of truth)
*/

type SessionInfo = {
  // camelCase (preferred)
  tenantId?: string | null;
  userId?: string | null;

  // snake_case (backend DB / legacy APIs)
  tenant_id?: string | null;
  user_id?: string | null;
};

async function fetchSessionFromServer(): Promise<SessionInfo> {
  try {
    const res = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) return {};
    return (await res.json()) as SessionInfo;
  } catch (e) {
    return {};
  }
}

/**
 * Build headers from multiple trusted sources (in-preference order):
 * 1) window.__SESSION__ (recommended, server-injected on page render)
 * 2) window.__TENANT_ID__ / window.__USER_ID__ (legacy)
 * 3) meta tags: <meta name="tenant-id" content="...">
 * 4) GET /api/session (server endpoint that reads your session table)
 *
 * Important: this function is async because of the server fallback.
 */
async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  try {
    // Attempt to read session from global window surface
    const win = typeof window !== "undefined" ? (window as any) : undefined;
    let tenant: string | undefined | null = undefined;
    let user: string | undefined | null = undefined;

    if (win) {
      const session: any = win.__SESSION__ ?? null;
      if (session) {
        tenant = session.tenantId ?? session.tenant_id ?? session.tenant ?? tenant;
        user = session.userId ?? session.user_id ?? session.user ?? user;
      }

      // legacy top-level globals
      if (!tenant && (win.__TENANT_ID__ || win.__TENANT__)) {
        tenant = win.__TENANT_ID__ || win.__TENANT__;
      }
      if (!user && (win.__USER_ID__ || win.__USER__)) {
        user = win.__USER_ID__ || win.__USER__;
      }
    }

    // meta tag fallback (server-rendered HTML)
    if ((!tenant || !user) && typeof document !== "undefined") {
      try {
        if (!tenant) {
          const m = document.querySelector('meta[name="tenant-id"]');
          if (m && m.getAttribute) tenant = m.getAttribute("content") || undefined;
        }
        if (!user) {
          const m = document.querySelector('meta[name="user-id"]');
          if (m && m.getAttribute) user = m.getAttribute("content") || undefined;
        }
      } catch (e) {
        // ignore DOM access problems
      }
    }

    // server session fallback (only if we still don't have ids)
    if ((!tenant || !user) && typeof window !== "undefined") {
      const s = await fetchSessionFromServer();
      tenant = tenant ?? s.tenantId ?? s.tenant_id ?? undefined;
      user = user ?? s.userId ?? s.user_id ?? undefined;
    }

    if (tenant) headers["x-tenant-id"] = String(tenant);
    if (user) headers["x-user-id"] = String(user);

    // NOTE: intentionally no localStorage reads here.
  } catch (e) {
    // best-effort; keep base headers
  }

  return headers;
}

export const SettingsAPI = {
  async list(): Promise<any[]> {
    const res = await fetch("/api/settings", {
      credentials: "include",
      headers: await getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load settings");
    return res.json();
  },

  async update(payload: { key: string; value: any; tenant_id?: string | null; company_id?: string | null }) {
    const res = await fetch("/api/settings", {
      method: "POST",
      credentials: "include",
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Failed to save");
    }
    return res.json();
  },

  /**
   * GET /api/settings/effective?key=...&companyId=...
   * Returns e.g. { key: "...", value: {...} }
   */
  async effective(key: string, companyId?: string | undefined) {
    const params = new URLSearchParams();
    params.set("key", key);
    if (companyId) params.set("companyId", companyId);

    const url = `/api/settings/effective?${params.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to fetch effective setting: ${res.status} ${res.statusText} ${txt}`);
    }
    return res.json();
  },
};

/**
 * Very small local schema registry used to render friendly forms.
 * Expand as you add more keys.
 */
export const localSchemas: Record<string, any> = {
  "billing.currency": {
    properties: {
      code: { type: "string", title: "Currency Code (ISO)" },
      symbol: { type: "string", title: "Symbol" },
      precision: { type: "integer", title: "Precision (decimal places)" },
      locale: { type: "string", title: "Locale" },
    },
    required: ["code", "symbol", "precision"],
  },
  "locale.default": {
    properties: {
      locale: { type: "string", title: "Locale" },
      timezone: { type: "string", title: "Timezone" },
      first_day_of_week: { type: "integer", title: "First day of week (0 Sun..6 Sat)" },
    },
    required: ["locale", "timezone"],
  },
  "notification.email_provider": {
    properties: {
      provider: { type: "string", title: "Provider" },
      from: { type: "string", title: "From address" },
      provider_ref: { type: "string", title: "Secret ref (do not paste raw secrets)" },
    },
    required: ["provider", "from"],
  },
  "features": {
    properties: {
      multi_currency: { type: "boolean", title: "Multi-currency" },
      advanced_inventory: { type: "boolean", title: "Advanced inventory" },
      hr_payroll: { type: "boolean", title: "HR / Payroll" },
    },
  },
};

/**
 * Categorize settings into friendly groups.
 */
export function categorize(settings: any[]) {
  const groups: Record<string, any[]> = {
    Billing: [],
    Localization: [],
    Notifications: [],
    "Feature Flags": [],
    Taxes: [],
    HMS: [],
    Other: [],
  };

  for (const s of settings) {
    if (s.key.startsWith("billing.")) groups.Billing.push(s);
    else if (s.key.startsWith("locale.") || s.key.startsWith("localization.")) groups.Localization.push(s);
    else if (s.key.startsWith("notification.") || s.key.startsWith("notifications.")) groups.Notifications.push(s);
    else if (s.key.startsWith("features.") || s.key === "features") groups["Feature Flags"].push(s);
    else if (s.key.startsWith("billing.taxes") || s.key.startsWith("tax")) groups.Taxes.push(s);
    else if (s.key.startsWith("hms.")) groups.HMS.push(s);
    else groups.Other.push(s);
  }

  for (const k of Object.keys(groups)) if (groups[k].length === 0) delete groups[k];
  return groups;
}
