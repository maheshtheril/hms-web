// web/app/dashboard/settings/services/settings.api.ts
/* Simple client API. Exposes:
   - list(): returns array of settings rows
   - update(payload): { key, value, tenant_id?, company_id? }
   - categorize(settings): helper to group into categories
   - localSchemas: simple local schemas for friendly forms
*/

export const SettingsAPI = {
  async list(): Promise<any[]> {
    const res = await fetch("/api/settings", {
      credentials: "include",
      headers: {
        "x-tenant-id": (window as any).__TENANT_ID__ || "",
        "x-user-id": (window as any).__USER_ID__ || "",
      },
    });
    if (!res.ok) throw new Error("Failed to load settings");
    return res.json();
  },

  async update(payload: { key: string; value: any; tenant_id?: string | null; company_id?: string | null }) {
    const res = await fetch("/api/settings", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": (window as any).__TENANT_ID__ || "",
        "x-user-id": (window as any).__USER_ID__ || "",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Failed to save");
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
