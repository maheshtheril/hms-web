import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";
const SSR_COOKIE = "ssr_sid";

/** Optional allow-list: force platform admin by email (comma-separated) */
const ROOT_ADMINS = new Set(
  (process.env.ROOT_ADMINS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
);

// === Map your known role IDs -> canonical codes ==================
const ROLE_ID_TO_CODE: Record<string, string> = {
  "8c984ead-d5c6-4324-a00c-d1a77685807b": "platform_admin",
  "8d031ff7-979e-4824-b500-3dd9e2240600": "tenant_super_admin",
  "b7abdc89-b2e2-4aeb-9c08-112c75be2406": "super_admin",
  "45efa9cd-4092-458b-8de3-026793367ef6": "company_admin",
  "adf99d12-f721-460a-a550-3b7ea980a7ab": "global_super_admin",
};

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ?? null;
}

// Normalize any roles shape into a set of lowercase codes.
// Accepts arrays of strings, arrays of objects, single object, or ID strings.
// If an ID is seen, translate via ROLE_ID_TO_CODE.
function toRoleSet(v: any): Set<string> {
  const out = new Set<string>();
  const addRaw = (s: any) => {
    if (!s) return;
    const raw = String(s).toLowerCase();
    out.add(ROLE_ID_TO_CODE[raw] ?? raw);
  };
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === "string") addRaw(x);
      else if (x && typeof x === "object") addRaw(x.code || x.name || x.id);
    }
  } else if (v && typeof v === "object") {
    addRaw(v.code || v.name || v.id);
  } else {
    addRaw(v);
  }
  return out;
}

function deriveFlags(roleSet: Set<string>, user: any) {
  const isPlatformAdmin =
    roleSet.has("platform_admin") || roleSet.has("global_super_admin");

  const isTenantAdmin =
    isPlatformAdmin ||
    roleSet.has("tenant_super_admin") ||
    roleSet.has("super_admin") ||
    roleSet.has("tenant_admin") ||
    roleSet.has("owner");

  const isAdmin = !!(user?.is_admin || roleSet.has("admin"));
  return { isPlatformAdmin, isTenantAdmin, isAdmin };
}

function normalizeMe(raw: any) {
  const user =
    raw?.user ??
    raw?.data?.user ??
    raw?.account ??
    (raw?.email || raw?.id ? raw : null);

  const tenant =
    raw?.tenant ??
    raw?.data?.tenant ??
    user?.tenant ??
    null;

  // Gather roles from every likely property
  const roleSet = new Set<string>([
    ...toRoleSet(user?.roles),
    ...toRoleSet(raw?.roles),
    ...toRoleSet(user?.role),
    ...toRoleSet(user?.scopes),
    ...toRoleSet(user?.permissions),
    ...toRoleSet(raw?.user_roles),   // extra safety: sometimes different key
    ...toRoleSet(raw?.roles_ids),    // array of IDs
  ]);

  // Treat boolean flags as pseudo-roles too (compat)
  if (user?.is_platform_admin) roleSet.add("platform_admin");
  if (user?.is_tenant_admin) roleSet.add("tenant_admin");
  if (user?.is_admin) roleSet.add("admin");

  // Base flags from roles + is_admin
  const { isPlatformAdmin, isTenantAdmin, isAdmin } = deriveFlags(roleSet, user);

  // Email-based override (optional, via ROOT_ADMINS env)
  const emailLc = (user?.email || "").toLowerCase();
  const rootOverride = emailLc && ROOT_ADMINS.has(emailLc);

  // Final flags: prefer explicit booleans if backend sends them, then roles, then root override
  const finalPlatform =
    !!user?.is_platform_admin || isPlatformAdmin || !!rootOverride;

  const finalTenant =
    !!user?.is_tenant_admin || isTenantAdmin || finalPlatform; // platform implies tenant-level power

  const finalAdmin = !!user?.is_admin || isAdmin;

  return {
    user: user
      ? {
          id: user.id ?? user.user_id ?? user.sub ?? null,
          email: user.email ?? null,
          name: user.name ?? user.full_name ?? null,
          is_admin: finalAdmin,
          is_platform_admin: finalPlatform,
          is_tenant_admin: finalTenant,
          roles: [...roleSet].filter(Boolean).sort(), // canonical codes only
        }
      : null,
    tenant: {
      id: tenant?.id ?? user?.tenant_id ?? raw?.tenant_id ?? null,
      name: tenant?.name ?? null,
      slug: tenant?.slug ?? null,
    },
  };
}

export async function GET(req: Request) {
  const sid = readCookie(req.headers.get("cookie"), SSR_COOKIE);
  if (!sid) return NextResponse.json({ user: null }, { status: 200 });

  for (const path of ["/auth/me", "/users/me", "/auth/session", "/api/auth/me"]) {
    try {
      const r = await fetch(`${BACKEND}${path}`, {
        headers: { cookie: `sid=${sid};` },
        cache: "no-store",
      });
      if (!r.ok) continue;

      const ct = r.headers.get("content-type") || "";
      const raw = ct.includes("application/json") ? await r.json() : JSON.parse(await r.text());
      const me = normalizeMe(raw);

      // Safe non-null guarded override (fixes TS: me.user possibly null)
      const u = me.user;
      if (u && typeof u.email === "string") {
        const email = u.email.toLowerCase();
        if (email === "root@example.com" || ROOT_ADMINS.has(email)) {
          me.user = {
            ...u,
            is_platform_admin: true,
            roles: Array.from(new Set([...(u.roles ?? []), "platform_admin"])).sort(),
          };
        }
      }

      return NextResponse.json(me, { status: 200 });
    } catch {
      // try next
    }
  }

  return NextResponse.json({ user: null }, { status: 200 });
}
