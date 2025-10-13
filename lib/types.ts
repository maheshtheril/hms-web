// =============================================================
// RBAC FRONTEND PACK — GeniusGrid (Next.js App Router)
// Pages: Users, Invite/Create User, Roles, Permissions, Audit Logs
// Components: reusable tables, drawers, forms (shadcn/ui), api client
// API endpoints expected (existing in your backend):
//   GET    /api/admin/users?search=&page=&pageSize=&role=&active=
//   POST   /api/admin/users
//   PATCH  /api/admin/users/:id
//   GET    /api/admin/roles
//   POST   /api/admin/roles
//   PATCH  /api/admin/roles/:id
//   GET    /api/admin/permissions
//   POST   /api/admin/roles/:id/permissions  (body: { permission_codes: string[] })
//   GET    /api/audit-logs?search=&action=&user_id=&date_from=&date_to=&page=&pageSize=
// Notes:
// - Uses shadcn/ui primitives via aliases like @/components/ui/button; adjust imports to your setup.
// - Uses axios apiClient (withCredentials) and SWR for data; compatible with SSR hydration.
// - Works with your Sidebar routes: /dashboard/rbac/users, /dashboard/rbac/users/new, /dashboard/rbac/roles,
//   /dashboard/rbac/permissions, /dashboard/rbac/audit
// - All files combined here — copy them into your repo as indicated by the path comments.
// =============================================================


// path: lib/types.ts
export type UUID = string;

export type Permission = {
  code: string;
  name: string;
  description?: string;
};

export type Role = {
  id: UUID;
  name: string;
  code: string;
  description?: string;
  permission_codes?: string[];
  created_at?: string;
};

export type User = {
  id: UUID;
  name: string;
  email: string;
  active?: boolean;
  is_admin?: boolean;
  is_tenant_admin?: boolean;
  is_platform_admin?: boolean;
  roles?: string[];          // role codes
  role_ids?: UUID[];         // optional ids if your API returns
  company_ids?: UUID[];      // multi-company support
  created_at?: string;
};

export type PageMeta = { page: number; pageSize: number; total: number };

