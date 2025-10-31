// components/Sidebar.tsx — production-ready RBAC-aware sidebar (tenant-admin sees everything)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------------------------- Types ---------------------------- */
type Item = {
  label: string;
  href?: string;
  badge?: string;
  keywords?: string[];
  children?: Item[];
  header?: boolean;
  disabled?: boolean;
};
type Section = { id: string; label: string; icon?: React.ReactNode; items: Item[] };

type SessionMe = {
  user?: {
    is_platform_admin?: boolean;
    is_tenant_admin?: boolean;
    is_admin?: boolean;
    roles?: Array<string | { name?: string; code?: string }>;
    role?: string | { name?: string; code?: string };
    scopes?: string[];
    permissions?: string[];
    email?: string;
  };
  roles?: string[];
  tenant?: { id?: string; name?: string; slug?: string; modules?: string[] };
  permissions?: string[];
};

/* ---------------------------- Static Menu Tree ---------------------------- */
const SECTIONS: Section[] = [
  {
    id: "crm",
    label: "CRM",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 7h18M3 12h18M3 17h18" />
      </svg>
    ),
    items: [
      {
        label: "Leads",
        keywords: ["prospects", "pipeline", "kanban", "lifecycle"],
        children: [
          { label: "Capture & Create", header: true },
          { label: "All Leads", href: "/crm/leads", keywords: ["index", "list", "table"] },
          { label: "Import Leads", href: "/leads/import", keywords: ["csv", "xlsx", "bulk"] },
        ],
      },
      {
        label: "Activities",
        keywords: ["tasks", "calls", "meetings", "follow-ups"],
        children: [{ label: "Standard Level", header: true }, { label: "All Activities", href: "/crm/activities" }],
      },
    ],
  },


{
  id: "leads",
  label: "Leads",
  icon: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 7v6a2 2 0 0 0 2 2h3l4 3 4-3h3a2 2 0 0 0 2-2V7" />
      <path d="M12 3v8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  ),
  items: [
    {
      label: "Overview",
      children: [
        { label: "All Leads", href: "/leads", keywords: ["list", "pipeline", "contacts"] },
        { label: "Create Lead", href: "/leads/new", keywords: ["add", "new", "create"] },
        { label: "My Leads", href: "/leads/my", keywords: ["assigned", "mine"] },
      ],
    },
    {
      label: "Pipelines & Stages",
      children: [
        { label: "Pipelines", href: "/leads/pipelines", keywords: ["funnels", "flows"] },
        { label: "Stages", href: "/leads/stages", keywords: ["columns", "steps"] },
        { label: "Pipeline Templates", href: "/leads/pipeline-templates", keywords: ["templates", "defaults"] },
      ],
    },
    {
      label: "Lead Data",
      children: [
        { label: "Sources", href: "/leads/sources", keywords: ["origin", "channel"] },
        { label: "Tags", href: "/leads/tags", keywords: ["labels", "categorize"] },
        { label: "Custom Fields", href: "/leads/custom-fields", keywords: ["schema", "fields"] },
      ],
    },
    {
      label: "Activity",
      children: [
        { label: "Notes", href: "/leads/notes", keywords: ["comments", "internal"] },
        { label: "Tasks", href: "/leads/tasks", keywords: ["todos", "assignments"] },
        { label: "Follow-ups", href: "/leads/followups", keywords: ["callbacks", "reminders"] },
        { label: "Timeline", href: "/leads/timeline", keywords: ["history", "activity"] },
      ],
    },
    {
      label: "Assignments",
      keywords: ["routing", "rules", "auto"],
      children: [
        { label: "Assignment Rules", href: "/leads/assignment-rules", keywords: ["auto-assign", "round-robin"] },
        { label: "Assignment History", href: "/leads/assignment-history", keywords: ["audit", "changes"] },
        { label: "Duplicates", href: "/leads/duplicates", keywords: ["merge", "find duplicates"] },
      ],
    },
    {
      label: "Templates",
      children: [
        { label: "Lead Templates", href: "/leads/templates", keywords: ["email", "scenarios"] },
        { label: "Pipeline Templates", href: "/leads/template-pipelines", keywords: ["onboarding", "defaults"] },
      ],
    },
    {
      label: "Analytics",
      children: [
        { label: "Conversion Funnel", href: "/leads/analytics/funnel", keywords: ["conversion", "metrics"] },
        { label: "Lead Sources Report", href: "/leads/analytics/sources", keywords: ["roi", "channels"] },
        { label: "Forecast & Velocity", href: "/leads/analytics/forecast", keywords: ["forecast", "velocity"] },
      ],
    },
    {
      label: "Settings",
      children: [
        { label: "Lead Settings", href: "/leads/settings", keywords: ["preferences", "defaults"] },
        { label: "Import / Export", href: "/leads/import-export", keywords: ["csv", "bulk"] },
        { label: "Permissions", href: "/leads/settings/permissions", keywords: ["access", "roles"] },
      ],
    },
  ],
},




  {
    id: "admin",
    label: "Admin",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 15a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm7.4-3a7.4 7.4 0 0 0-.15-1.5l2.1-1.64-2-3.46-2.48 1a7.63 7.63 0 0 0-2.6-1.5l-.4-2.66h-4l-.4-2.66a7.63 7.63 0 0 0-2.6-1.5l-2.48-1-2 3.46 2.1 1.64A7.4 7.4 0 0 0 4.6 12a7.4 7.4 0 0 0 .15 1.5L2.65 15.14l2 3.46 2.48-1a7.63 7.63 0 0 0 2.6 1.5l.4 2.66h4l.4-2.66a7.63 7.63 0 0 0 2.6-1.5l2.48 1 2-3.46-2.1-1.64A7.4 7.4 0 0 0 19.4 12Z" />
      </svg>
    ),
    items: [
      {
        label: "Tenants",
        children: [
          { label: "All Tenants", href: "/dashboard/admin/tenants" },
          { label: "Create Tenant", href: "/dashboard/admin/tenants/new" },
        ],
      },
      {
        label: "Companies",
        keywords: ["clients", "organizations", "partners", "vendors"],
        children: [{ label: "Standard Level", header: true }, { label: "All Companies", href: "/tenant/companies" }],
      },
      {
        label: "RBAC",
        children: [
          { label: "Users", href: "/dashboard/rbac/users", keywords: ["accounts", "members", "admins"] },
          { label: "Invite/Create User", href: "/dashboard/rbac/users/new", keywords: ["invite", "add"] },
          { label: "Roles", href: "/dashboard/rbac/roles" },
          { label: "Permissions", href: "/dashboard/rbac/permissions", keywords: ["access", "acl", "rbac"] },
          { label: "Audit Logs", href: "/dashboard/rbac/audit", keywords: ["history", "trail", "security"] },
        ],
      },
      {
        label: "Settings",
        children: [
          { label: "General", href: "/dashboard/settings/general" },
          { label: "Billing", href: "/dashboard/settings/billing" },
          { label: "Teams", href: "/dashboard/settings/teams" },
          { label: "Custom Fields", href: "/dashboard/settings/custom-fields", keywords: ["dynamic", "fields", "definitions"] },
        ],
      },
    ],
  },
];

/* ---------------------- HMS Section (insert near SECTIONS) ---------------------- */
const HMS_SECTION: Section = {
  id: "hms",
  label: "HMS",
  icon: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  ),
  items: [
    {
      label: "Clinical",
      children: [
        { label: "Patients", href: "/hms/patients", keywords: ["patient", "demographics", "medical record"] },
        { label: "Appointments", href: "/hms/appointments", keywords: ["scheduling", "slots"] },
        { label: "Encounters", href: "/hms/encounters", keywords: ["consultation", "visit", "notes"] },
        { label: "Admissions", href: "/hms/admissions", keywords: ["ward", "bed", "inpatient"] },
      ],
    },
    {
      label: "Clinicians",
      children: [
        { label: "All Clinicians", href: "/hms/clinicians" },
        { label: "On-call Roster", href: "/hms/clinicians/roster" },
      ],
    },
    {
      label: "Pharmacy & Inventory",
      children: [
        { label: "Products", href: "/hms/products" },
        { label: "Stock Ledger", href: "/hms/stock" },
        { label: "Purchase Orders", href: "/hms/purchases" },
      ],
    },
    {
      label: "Billing",
      children: [
        { label: "Invoices", href: "/hms/invoices" },
        { label: "Payments", href: "/hms/payments" },
        { label: "Insurance Claims", href: "/hms/claims" },
      ],
    },
    {
      label: "Reports",
      children: [
        { label: "Clinical Reports", href: "/hms/reports/clinical" },
        { label: "Finance Reports", href: "/hms/reports/finance" },
      ],
    },
    {
      label: "Admin",
      children: [
        { label: "Services & Departments", href: "/hms/departments" },
        { label: "Settings", href: "/hms/settings" },
      ],
    },
  ],
};
// Ensure HMS is part of canonical sections so it behaves like CRM/Admin everywhere
if (!SECTIONS.some((s) => s.id === "hms")) {
  (SECTIONS as Section[]).push(HMS_SECTION);
}

/* ---------------------------- Utils ---------------------------- */
const STORAGE_KEYS = {
  pinnedSidebar: "gg.sidebar.pinned",
  openMap: "gg.sidebar.openmap",
  openChildMap: "gg.sidebar.openchildmap",
  pinnedSections: "gg.sidebar.pinned.sections",
  favorites: "gg.sidebar.favorites",
  recents: "gg.sidebar.recents",
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}
function fuzzyScore(query: string, text: string) {
  const q = normalize(query);
  const t = normalize(text);
  if (!q) return 0;
  let score = 0;
  if (t.startsWith(q)) score += 20;
  if (t.includes(q)) score += 5;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 2;
      qi++;
    }
  }
  if (qi === q.length) score += 10;
  return score;
}
function highlight(text: string, query: string) {
  if (!query) return text;
  const q = normalize(query);
  const n = normalize(text);
  const idx = n.indexOf(q);
  if (idx < 0) return text;
  const end = idx + q.length;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-white/20 rounded px-0.5">{text.slice(idx, end)}</mark>
      {text.slice(end)}
    </>
  );
}
const notNil = <T,>(x: T | null | undefined): x is T => x != null;

/* ---------------------------- Session / Roles ---------------------------- */
/**
 * useSessionMe
 * - Safe fetch handling
 * - Flexible role extraction and normalization
 * - Reacts to auth updates (auth:update event / storage)
 *
 * Returns normalized helper sets so UI and other components can rely on consistent role/perm strings.
 */
function useSessionMe() {
  const [me, setMe] = React.useState<SessionMe | null>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    let mounted = true;

    const doFetch = async () => {
      if (!mounted) return;
      try {
        setLoading(true);
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (r.status === 401) {
          if (mounted) setMe(null);
        } else {
          try {
            const body = await r.json();
            if (mounted) setMe(body);
          } catch {
            if (mounted) setMe({});
          }
        }
      } catch {
        if (mounted) setMe({});
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // initial fetch
    doFetch();

    // small debounced handler to re-fetch when auth changes
    let timer: any = null;
    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        doFetch();
        timer = null;
      }, 100);
    };

    // listen for custom event dispatched after login/logout
    window.addEventListener("auth:update", handler);

    // listen for storage key changes (cross-tab login/logout)
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "gg.auth.updated") handler();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("auth:update", handler);
      window.removeEventListener("storage", onStorage);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // normalize role candidate to canonical token: lowercase, underscores, no punctuation
  const normalizeRoleString = (s: any) => {
    if (s === null || s === undefined) return "";
    const raw = String(s);
    return raw.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^\w_]/g, "");
  };

  const toSetAny = (v: any) => {
    const out = new Set<string>();
    const add = (s: any) => {
      if (s === null || s === undefined) return;
      if (typeof s === "object") {
        const candidate = (s as any).name ?? (s as any).code ?? (s as any).id ?? (s as any).role ?? "";
        const n = normalizeRoleString(candidate);
        if (n) out.add(n);
        return;
      }
      if (typeof s === "string") {
        try {
          const maybe = JSON.parse(s);
          if (Array.isArray(maybe)) {
            for (const x of maybe) add(x);
            return;
          }
        } catch {}
        const parts = s.split(/[ ,|;]+/).filter(Boolean);
        if (parts.length > 1) {
          for (const p of parts) add(p);
          return;
        }
        const n = normalizeRoleString(s);
        if (n) out.add(n);
        return;
      }
      const n = normalizeRoleString(String(s));
      if (n) out.add(n);
    };
    if (Array.isArray(v)) for (const x of v) add(x);
    else add(v);
    return out;
  };

  // compute normalized sets (memoized to avoid re-creation on every render)
  const rolesSet = React.useMemo(() => {
    const s = new Set<string>();
    sForEach(toSetAny(me?.user?.roles), (x) => s.add(x));
    sForEach(toSetAny(me?.roles), (x) => s.add(x));
    sForEach(toSetAny(me?.user?.role), (x) => s.add(x));
    sForEach(toSetAny(me?.user?.scopes), (x) => s.add(x));
    sForEach(toSetAny(me?.user?.permissions), (x) => s.add(x));
    // map some owner-like aliases defensively
    const ownerLikeAliases = [
      "owner",
      "tenant_owner",
      "tenant_super_admin",
      "super_admin",
      "superadmin",
      "platform_owner",
    ];
    for (const a of ownerLikeAliases) if (s.has(a)) s.add("tenant_admin");
    // explicit backend flags if present (defensive)
    if ((me?.user as any)?.is_admin) s.add("admin");
    if ((me?.user as any)?.is_tenant_admin) s.add("tenant_admin");
    if ((me?.user as any)?.is_platform_admin) s.add("platform_admin");
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.user?.roles, me?.roles, me?.user?.role, me?.user?.scopes, me?.user?.permissions, me?.user?.is_admin, me?.user?.is_tenant_admin, me?.user?.is_platform_admin]);

  const permsSet = React.useMemo(() => {
    const s = new Set<string>();
    const pCandidates = (me?.user?.permissions as any) ?? (me?.permissions as any) ?? (me?.user?.scopes as any) ?? [];
    const parsed = toSetAny(pCandidates);
    parsed.forEach((x) => s.add(String(x).toLowerCase()));
    return s;
  }, [me?.user?.permissions, me?.permissions, me?.user?.scopes]);

  const tenantModulesSet = React.useMemo(() => {
    const mods = ((me?.tenant as any)?.modules as any[]) ?? [];
    const s = new Set<string>();
    for (const m of mods) {
      if (!m && m !== 0) continue;
      s.add(String(m).toLowerCase().trim());
    }
    return s;
  }, [me?.tenant?.modules]);

  // Map flags
  const u = me?.user || ({} as any);
  const isAdminFlag = (u as any).is_admin ?? (u as any).isAdmin ?? (u as any).admin ?? false;
  const isTenantAdminFlag = (u as any).is_tenant_admin ?? (u as any).isTenantAdmin ?? (u as any).tenant_admin ?? false;
  const isPlatformAdminFlag = (u as any).is_platform_admin ?? (u as any).isPlatformAdmin ?? (u as any).platform_admin ?? false;

  const isPlatformAdmin =
    !!isPlatformAdminFlag ||
    rolesSet.has("platform_admin") ||
    rolesSet.has("platformowner") ||
    rolesSet.has("platform_owner") ||
    rolesSet.has("global_super_admin");

  const isTenantAdmin = !!isTenantAdminFlag || rolesSet.has("tenant_admin");

  const isAdmin = !!isAdminFlag || rolesSet.has("admin") || rolesSet.has("company_admin") || rolesSet.has("system_admin");

  return { me, isAdmin, isPlatformAdmin, isTenantAdmin, loading, rolesSet, permsSet, tenantModulesSet };
}

/* small helper to iterate sets (keeps code compact) */
function sForEach(s: Set<string>, fn: (v: string) => void) {
  if (!s) return;
  for (const v of s) fn(v);
}

/* ---------------------------- Sidebar ---------------------------- */
export default function Sidebar() {
  const pathname = usePathname();
  const { me, isPlatformAdmin, isTenantAdmin, isAdmin, loading, rolesSet, permsSet, tenantModulesSet } = useSessionMe();

  /**
   * Important: This logic intentionally grants full menu visibility to tenant admins.
   * - If isTenantAdmin true, we simply return the full canonical set of sections.
   * - This does NOT bypass backend RBAC; server must still check permissions.
   */
  const sections = React.useMemo(() => {
    // If still loading, don't show anything yet (prevents flicker)
    if (loading) return [];

    // If tenant admin OR platform admin OR system admin -> show everything
    if (isTenantAdmin || isPlatformAdmin || isAdmin) {
      // Return canonical SECTIONS plus HMS_SECTION (ensure no duplicate)
      const base = SECTIONS.slice();
      if (!base.some((s) => s.id === "hms")) {
        base.push(HMS_SECTION);
      }
      // Guarantee Admin present for tenant admin (sometimes filtered above)
      if (!base.some((s) => s.id === "admin")) {
        const adminSec = SECTIONS.find((s) => s.id === "admin");
        if (adminSec) base.push(adminSec);
      }
      return base;
    }

    // Non-admin users: default filtered view by admin visibility and by HMS gating rules
    const filterSectionsForRBAC = (src: Section[]) => {
      const canSeeAdmin = isTenantAdmin || isPlatformAdmin || isAdmin;
      return src
        .filter((s) => (s.id !== "admin" ? true : canSeeAdmin))
        .map((s) =>
          s.id !== "admin"
            ? s
            : {
                ...s,
                items: s.items.filter((it) => (it.label === "Tenants" ? isPlatformAdmin : true)),
              }
        );
    };

    const filtered = filterSectionsForRBAC(SECTIONS);

    // Decide whether the current user should see HMS menus:
    // - explicit permissions like 'hms.access' or 'hms.*'
    // - tenant-level module flag: tenantModulesSet includes 'hms'
    // - role-based tokens 'hms_user' or 'hms_admin'
       // Always show HMS section in the sidebar (no DB migration / tenant module required)
    // NOTE: this only changes UI visibility — backend must still enforce RBAC for API access.
    if (!filtered.some((s) => s.id === "hms")) {
      filtered.push(HMS_SECTION);
    }


    return filtered;
  }, [loading, isPlatformAdmin, isTenantAdmin, isAdmin, rolesSet, permsSet, tenantModulesSet]);

  // Sidebar state
  const [pinnedSidebar, setPinnedSidebar] = useState(false);
  const [hoveringAside, setHoveringAside] = useState(false);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [openChildMap, setOpenChildMap] = useState<Record<string, boolean>>({});
  const [flyout, setFlyout] = useState<{ id: string; top: number } | null>(null);

  const [pinnedSections, setPinnedSections] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const asideRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isExpanded = pinnedSidebar || hoveringAside;
  const textVisibility = isExpanded ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100";

  // Persist UI state
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.pinnedSidebar);
      if (p) setPinnedSidebar(p === "1");
      const raw = localStorage.getItem(STORAGE_KEYS.openMap);
      if (raw) setOpenMap(JSON.parse(raw));
      const rawChild = localStorage.getItem(STORAGE_KEYS.openChildMap);
      if (rawChild) setOpenChildMap(JSON.parse(rawChild));
      const pins = localStorage.getItem(STORAGE_KEYS.pinnedSections);
      if (pins) setPinnedSections(JSON.parse(pins));
      const fav = localStorage.getItem(STORAGE_KEYS.favorites);
      if (fav) setFavorites(JSON.parse(fav));
      const rec = localStorage.getItem(STORAGE_KEYS.recents);
      if (rec) setRecents(JSON.parse(rec));
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.pinnedSidebar, pinnedSidebar ? "1" : "0");
    } catch {}
  }, [pinnedSidebar]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.openMap, JSON.stringify(openMap));
    } catch {}
  }, [openMap]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.openChildMap, JSON.stringify(openChildMap));
    } catch {}
  }, [openChildMap]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.pinnedSections, JSON.stringify(pinnedSections));
    } catch {}
  }, [pinnedSections]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.recents, JSON.stringify(recents.slice(0, 20)));
    } catch {}
  }, [recents]);

  // Auto-open active section (use filtered sections)
  useEffect(() => {
    if (!pathname || sections.length === 0) return;
    const match = sections.find((s) =>
      s.items.some((it) => (it.href && pathname.startsWith(it.href)) || it.children?.some((ch) => ch.href && pathname.startsWith(ch.href)))
    );
    if (match && !openMap[match.id]) setOpenMap((m) => ({ ...m, [match.id]: true }));
    if (match) {
      const parentWithChild = match.items.find((it) => it.children?.some((ch) => ch.href && pathname.startsWith(ch.href)));
      if (parentWithChild) {
        const childKey = `${match.id}:${parentWithChild.label}`;
        if (!openChildMap[childKey]) setOpenChildMap((m) => ({ ...m, [childKey]: true }));
      }
    }
    if (pathname && !recents.includes(pathname)) {
      setRecents((r) => [pathname, ...r.filter((p) => p !== pathname)].slice(0, 20));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, sections]);

  // Cmd/Ctrl-K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setPaletteOpen((s) => !s);
        setQuery("");
        setActiveIdx(0);
      } else if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Flyout (collapsed)
  function handleParentHover(id: string) {
    if (isExpanded) return;
    const btn = btnRefs.current[id];
    const asideTop = asideRef.current?.getBoundingClientRect().top ?? 0;
    const top = (btn?.getBoundingClientRect().top ?? 0) - asideTop - 4;
    setFlyout({ id, top });
  }
  function clearFlyoutSoon() {
    setTimeout(() => setFlyout((f) => (f ? { ...f, id: "" } : null)), 80);
  }

  function toggleSection(id: string) {
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  }
  function toggleChild(sectionId: string, itemLabel: string) {
    const key = `${sectionId}:${itemLabel}`;
    setOpenChildMap((m) => ({ ...m, [key]: !m[key] }));
  }
  function togglePinSection(id: string) {
    setPinnedSections((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }
  function toggleFavorite(href: string) {
    setFavorites((arr) => (arr.includes(href) ? arr.filter((x) => x !== href) : [...arr, href]));
  }

  // Flatten (filtered sections) for palette
  const FLAT = useMemo(() => {
    const out: Array<{ sectionId: string; section: string; label: string; href: string; badge?: string; keywords?: string[] }> = [];
    for (const s of sections) {
      for (const it of s.items) {
        if (it.href)
          out.push({
            sectionId: s.id,
            section: s.label,
            label: it.label,
            href: it.href,
            badge: it.badge,
            keywords: it.keywords,
          });
        if (it.children) {
          for (const ch of it.children) {
            if (ch.href && !ch.header) {
              out.push({
                sectionId: s.id,
                section: `${s.label} › ${it.label}`,
                label: ch.label,
                href: ch.href,
                badge: ch.badge,
                keywords: ch.keywords,
              });
            }
          }
        }
      }
    }
    return out;
  }, [sections]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const favItems = FLAT.filter((x) => favorites.includes(x.href));
      const recentItems = recents.map((href) => FLAT.find((x) => x.href === href)).filter(notNil);
      const seen = new Set(favItems.map((x) => x.href));
      const rec = recentItems.filter((x) => !seen.has(x.href));
      return [...favItems, ...rec].slice(0, 30);
    }
    const q = query.trim();
    const scored = FLAT.map((x) => {
      const base = `${x.section} ${x.label} ${x.href} ${(x.keywords || []).join(" ")}`;
      return { item: x, score: Math.max(fuzzyScore(q, base), fuzzyScore(q, x.label), fuzzyScore(q, x.section)) };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
    return scored.slice(0, 50);
  }, [query, FLAT, favorites, recents]);

  const onPaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!paletteOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choice = results[activeIdx];
      if (choice) {
        setRecents((r) => [choice.href, ...r.filter((p) => p !== choice.href)].slice(0, 20));
        const anchor = document.querySelector<HTMLAnchorElement>(`a[data-href="${choice.href}"]`);
        anchor?.click();
        setPaletteOpen(false);
        setQuery("");
      }
    } else if (e.key === "Escape") setPaletteOpen(false);
  };

  // Loading skeleton
  if (loading) {
    return (
      <aside className="sticky top-0 z-40 h-screen w-16 shrink-0 bg-black text-white border-r border-white/10" aria-label="Primary navigation (loading)">
        <div className="h-14 border-b border-white/10" />
      </aside>
    );
  }

  // Render sidebar (UI preserved from your original file)
  return (
    <>
      {/* Command Palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setPaletteOpen(false)} aria-hidden>
          <div className="mx-auto mt-24 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }} onKeyDown={onPaletteKeyDown} placeholder="Search CRM or Admin menus…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40" aria-label="Search menus" />
              <div className="text-[10px] text-white/40 hidden sm:block">Esc</div>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-white/50">No matches. Try a different keyword.</li>}
              {results.map((r, idx) => {
                const active = idx === activeIdx;
                return (
                  <li key={`palette::${r.href}::${idx}`} className={`rounded-xl ${active ? "bg-white/10" : "hover:bg-white/5"}`} onMouseEnter={() => setActiveIdx(idx)}>
                    <Link href={r.href} data-href={r.href} className="flex items-center gap-3 px-3 py-2 text-sm" onClick={() => { setRecents((arr) => [r.href, ...arr.filter((x) => x !== r.href)].slice(0, 20)); setPaletteOpen(false); setQuery(""); }}>
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/10">
                        <span className="h-1.5 w-1.5 rounded-sm bg-white/70" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate">{highlight(r.label, query)} <span className="text-white/40">·</span> <span className="text-white/60">{highlight(r.section, query)}</span></div>
                        <div className="text-[11px] text-white/40 truncate">{r.href}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-[11px] text-white/40">
              <div className="hidden sm:flex items-center gap-3">
                <span>Navigate:</span>
                <kbd className="px-1.5 py-0.5 rounded border border-white/15">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-white/15">↓</kbd>
                <span>Open:</span>
                <kbd className="px-1.5 py-0.5 rounded border border-white/15">Enter</kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:block">Open palette:</span>
                <kbd className="px-1.5 py-0.5 rounded border border-white/15">Ctrl/⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-white/15">K</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar body */}
      <aside ref={asideRef} onMouseEnter={() => setHoveringAside(true)} onMouseLeave={() => { setHoveringAside(false); setFlyout(null); }} className={`group/sidebar sticky top-0 z-40 h-screen shrink-0 bg-[radial-gradient(1200px_600px_at_-200px_-200px,rgba(255,255,255,0.06),transparent_60%)] bg-black text-white border-r border-white/10 ${isExpanded ? "w-72" : "w-16"} transition-[width] duration-200 ease-out`} aria-label="Primary navigation">
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 h-14 px-3 border-b border-white/10">
            <button aria-label={pinnedSidebar ? "Collapse sidebar" : "Expand sidebar"} aria-pressed={pinnedSidebar} onClick={() => setPinnedSidebar((s) => !s)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10" title={pinnedSidebar ? "Unpin" : "Pin open"} type="button">
              <div className="space-y-1.5">
                <span className="block h-0.5 w-4 bg-white" />
                <span className="block h-0.5 w-4 bg-white" />
                <span className="block h-0.5 w-4 bg-white" />
              </div>
            </button>
            <span className={`text-sm font-semibold tracking-wide ${textVisibility} transition-opacity`}>GeniusGrid</span>
            <button type="button" onClick={() => { setPaletteOpen(true); setQuery(""); setActiveIdx(0); }} className={`ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/10 ${isExpanded ? "" : "hidden"}`} title="Search (Ctrl/⌘ + K)">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Search…</span>
              <span className="ml-2 hidden sm:flex items-center gap-1 text-[10px] text-white/40">
                <kbd className="px-1 rounded border border-white/15">Ctrl/⌘</kbd>
                <kbd className="px-1 rounded border border-white/15">K</kbd>
              </span>
            </button>
          </div>

          {/* Pinned sections */}
          {pinnedSections.length > 0 && (
            <div className="px-2 py-2 border-b border-white/10">
              <div className={`text-[10px] uppercase tracking-wider text-white/45 ${isExpanded ? "" : "sr-only"}`}>Pinned</div>
              <div className="mt-1 flex gap-1.5">
                {pinnedSections.map((id) => {
                  const sec = sections.find((s) => s.id === id);
                  if (!sec) return null;
                  return (
                    <button key={`pinrib::${id}`} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] hover:bg-white/10" onClick={() => setOpenMap((m) => ({ ...m, [id]: true }))} title={sec.label} type="button">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/5 border border-white/10">
                        <span className="h-1 w-1 rounded-sm bg-white/70" />
                      </span>
                      <span className={`${textVisibility}`}>{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main nav tree */}
          <nav role="tree" aria-label="Main" className="py-2 overflow-y-auto flex-1">
            {sections.map((section) => {
              const isOpen = !!openMap[section.id] || pinnedSections.includes(section.id);
              const gridState = isExpanded ? (isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]") : "grid-rows-[0fr]";
              const pinned = pinnedSections.includes(section.id);

              return (
                <div key={`sec::${section.id}`} className="px-2 relative">
                  <button ref={(el) => (btnRefs.current[section.id] = el)} role="treeitem" aria-expanded={isOpen} aria-controls={`sub-${section.id}`} onClick={() => (isExpanded ? toggleSection(section.id) : undefined)} onMouseEnter={() => handleParentHover(section.id)} onMouseLeave={clearFlyoutSoon} className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-white/90 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20" title={!isExpanded ? section.label : undefined} type="button">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">{section.icon ?? <span className="h-3 w-3 bg-white/70 rounded-sm" />}</span>
                    <span className={`${textVisibility} transition-opacity`}>{section.label}</span>
                    <span className={`ml-auto flex items-center gap-2 ${textVisibility}`} aria-hidden>
                      <span role="button" tabIndex={0} title={pinned ? "Unpin section" : "Pin section"} className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/10 select-none" onClick={(e) => { e.stopPropagation(); togglePinSection(section.id); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); togglePinSection(section.id); } }} aria-label={pinned ? `Unpin ${section.label}` : `Pin ${section.label}`}>{pinned ? "📌" : "📍"}</span>
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : "rotate-0"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
                    </span>
                  </button>

                  <div id={`sub-${section.id}`} role="group" className={`grid ${gridState} transition-[grid-template-rows] duration-200 ease-out`}>
                    <ul className="overflow-hidden pl-2">
                      {section.items.map((item, itemIdx) => {
                        const active = item.href ? pathname?.startsWith(item.href) : false;
                        const fav = item.href ? favorites.includes(item.href) : false;
                        const hasChildren = !!item.children?.length;
                        const childKey = `${section.id}:${item.label}`;
                        const childOpen = !!openChildMap[childKey];

                        return (
                          <li key={`secitem::${section.id}::${item.href ?? item.label}::${itemIdx}`}>
                            <div className="flex items-center">
                              {!hasChildren && item.href ? (
                                <Link href={item.href} role="treeitem" aria-current={active ? "page" : undefined} className={`flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"}`} title={!isExpanded ? item.label : undefined} onClick={() => setRecents((r) => [item.href!, ...r.filter((p) => p !== item.href)].slice(0, 20))}>
                                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/10"><span className="h-1.5 w-1.5 rounded-sm bg-white/70" /></span>
                                  <span className={`${textVisibility} transition-opacity ${item.disabled ? "opacity-50" : ""}`}>{item.label}</span>
                                  {item.badge && <span className={`ml-auto text-[10px] rounded-full px-2 py-0.5 bg-white/10 border border-white/10 ${textVisibility}`}>{item.badge}</span>}
                                </Link>
                              ) : (
                                <button type="button" onClick={() => (hasChildren ? toggleChild(section.id, item.label) : undefined)} className={`flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-sm ${hasChildren ? "text-white/85 hover:bg-white/5" : "text-white/60"}`} title={hasChildren ? `${childOpen ? "Collapse" : "Expand"} ${item.label}` : item.label}>
                                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/10"><span className="h-1.5 w-1.5 rounded-sm bg-white/70" /></span>
                                  <span className={`${textVisibility} transition-opacity`}>{item.label}</span>
                                  {hasChildren && <svg viewBox="0 0 24 24" className={`ml-auto h-4 w-4 ${childOpen ? "rotate-90" : "rotate-0"} transition-transform`} aria-hidden><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>}
                                </button>
                              )}

                              {item.href && <button type="button" className={`ml-1 mr-2 text-[11px] rounded-md border border-white/10 px-1.5 py-0.5 hover:bg-white/10 ${isExpanded ? "" : "hidden"}`} title={fav ? "Unfavorite" : "Favorite"} onClick={() => toggleFavorite(item.href!)} aria-label={fav ? `Unfavorite ${item.label}` : `Favorite ${item.label}`}>{fav ? "★" : "☆"}</button>}
                            </div>

                            {hasChildren && (
                              <div className={`grid ${isExpanded && childOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} transition-[grid-template-rows] duration-200 ease-out`}>
                                <ul className="overflow-hidden pl-6">
                                  {item.children!.map((ch, cIdx) => {
                                    const chActive = ch.href ? pathname?.startsWith(ch.href) : false;
                                    const chFav = ch.href ? favorites.includes(ch.href) : false;
                                    if (ch.header) {
                                      return <li key={`hdr::${section.id}::${item.label}::${ch.label}::${cIdx}`}><div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/40">{ch.label}</div></li>;
                                    }
                                    return (
                                      <li key={`child::${section.id}::${item.label}::${ch.href ?? ch.label}::${cIdx}`} className="flex items-center">
                                        {ch.href ? (
                                          <Link href={ch.href} role="treeitem" aria-current={chActive ? "page" : undefined} className={`flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-sm ${chActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"} ${ch.disabled ? "opacity-50 cursor-default" : ""}`} title={ch.disabled ? "Template route" : ch.label} onClick={() => !ch.disabled && setRecents((r) => [ch.href!, ...r.filter((p) => p !== ch.href)].slice(0, 20))}>
                                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/10"><span className="h-1 w-1 rounded-sm bg-white/70" /></span>
                                            <span className={`${textVisibility} transition-opacity`}>{ch.label}</span>
                                          </Link>
                                        ) : (
                                          <div className="flex-1 px-2 py-2 text-sm text-white/60">{ch.label}</div>
                                        )}
                                        {ch.href && <button type="button" className={`ml-1 mr-2 text-[11px] rounded-md border border-white/10 px-1.5 py-0.5 hover:bg-white/10 ${isExpanded ? "" : "hidden"}`} title={chFav ? "Unfavorite" : "Favorite"} onClick={() => toggleFavorite(ch.href!)} aria-label={chFav ? `Unfavorite ${ch.label}` : `Favorite ${ch.label}`}>{chFav ? "★" : "☆"}</button>}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Flyout (collapsed) */}
                  {!isExpanded && flyout?.id === section.id && (
                    <div onMouseEnter={() => setFlyout(flyout)} onMouseLeave={() => setFlyout(null)} className="absolute left-full ml-2 min-w-64 rounded-xl border border-white/10 bg-black/95 shadow-xl backdrop-blur p-2" style={{ top: flyout.top }} role="menu" aria-label={`${section.label} flyout`}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/50 flex items-center justify-between">
                        <span>{section.label}</span>
                        <button type="button" className="text-[10px] rounded-md border border-white/10 px-1.5 py-0.5 hover:bg-white/10" onClick={() => togglePinSection(section.id)} title={pinnedSections.includes(section.id) ? "Unpin section" : "Pin section"} aria-label={pinnedSections.includes(section.id) ? `Unpin ${section.label}` : `Pin ${section.label}`}>{pinnedSections.includes(section.id) ? "📌" : "📍"}</button>
                      </div>
                      <ul className="space-y-1">
                        {section.items.map((item, flyIdx) => {
                          const hasChildren = !!item.children?.length;
                          return (
                            <li key={`fly::${section.id}::${item.href ?? item.label}::${flyIdx}`} className="rounded-xl">
                              {item.href ? (
                                <Link href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm whitespace-nowrap text-white/85 hover:bg-white/5">
                                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 border border-white/10"><span className="h-1.5 w-1.5 rounded-sm bg-white/70" /></span>
                                  <span>{item.label}</span>
                                </Link>
                              ) : (
                                <div className="px-2 py-2 text-sm text-white/80">{item.label}</div>
                              )}

                              {hasChildren && (
                                <ul className="mt-1 ml-8 space-y-0.5">
                                  {item.children!.map((ch, cIdx) =>
                                    ch.header ? (
                                      <li key={`fly-hdr::${section.id}::${item.label}::${ch.label}::${cIdx}`} className="text-[10px] uppercase tracking-wider text-white/40 px-1 pt-2">{ch.label}</li>
                                    ) : ch.href ? (
                                      <li key={`fly-child::${section.id}::${item.label}::${ch.href}::${cIdx}`}><Link href={ch.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-white/85 hover:bg-white/5"><span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white/5 border border-white/10"><span className="h-0.5 w-0.5 rounded-sm bg-white/70" /></span><span className="whitespace-nowrap">{ch.label}</span></Link></li>
                                    ) : (
                                      <li key={`fly-sp::${section.id}::${item.label}::${ch.label}::${cIdx}`} className="px-2 py-1.5 text-[13px] text-white/60">{ch.label}</li>
                                    )
                                  )}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="h-10 px-3 border-t border-white/10 flex items-center text-[11px] text-white/45">
            <span className={`${isExpanded ? "" : "sr-only"}`}>Tip: Press </span>
            <span className={`${isExpanded ? "ml-1" : ""} hidden sm:flex items-center gap-1`}>
              <kbd className="px-1 rounded border border-white/15">Ctrl/⌘</kbd>
              <kbd className="px-1 rounded border border-white/15">K</kbd>
              <span> to search</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
