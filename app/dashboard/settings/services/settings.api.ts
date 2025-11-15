// web/app/dashboard/settings/services/settings.api.ts
/* Simple client API. Exposes:
   - list(): returns array of settings rows
   - update(payload): { key, value, tenant_id?, company_id? }
   - effective(key, companyId?): returns { key, value }
   - categorize(settings): helper to group into categories
   - localSchemas: simple local schemas for friendly forms
*/

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  try {
    // preferred small-surface ways your app might expose session
    const tenant = (window as any).__TENANT_ID__ || (window as any).__SESSION?.tenantId || localStorage.getItem("tenant_id") || localStorage.getItem("tenantId") || "";
    const user = (window as any).__USER_ID__ || (window as any).__SESSION?.userId || localStorage.getItem("user_id") || localStorage.getItem("userId") || "";

    if (tenant) headers["x-tenant-id"] = String(tenant);
    if (user) headers["x-user-id"] = String(user);

    // optional: meta tag fallback
    if (!headers["x-tenant-id"] && typeof document !== "undefined") {
      const meta = document.querySelector('meta[name="tenant-id"]');
      if (meta && meta.getAttribute) {
        const v = meta.getAttribute("content");
        if (v) headers["x-tenant-id"] = v;
      }
    }
  } catch (e) {
    // ignore header-building errors
  }

  return headers;
}

export const SettingsAPI = {
  async list(): Promise<any[]> {
    const res = await fetch("/api/settings", {
      credentials: "include",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load settings");
    return res.json();
  },

  async update(payload: { key: string; value: any; tenant_id?: string | null; company_id?: string | null }) {
    const res = await fetch("/api/settings", {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
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
      headers: getHeaders(),
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
 * Schema shape is minimal: properties: { k: { type, title } }, required: []
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

  // remove empty categories for UI
  for (const k of Object.keys(groups)) if (groups[k].length === 0) delete groups[k];
  return groups;
}
