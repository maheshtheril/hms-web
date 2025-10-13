// In-memory mock DB for dev
export type Permission = { code: string; name: string; description?: string };
export type Role = {
  id: string; name: string; code: string; description?: string;
  permission_codes: string[]; created_at: string;
};
export type User = {
  id: string; name: string; email: string; active: boolean;
  is_admin?: boolean; is_tenant_admin?: boolean; is_platform_admin?: boolean;
  roles: string[]; created_at: string;
};
export type Audit = {
  id: string; user_email?: string; action: string;
  table_name?: string; row_id?: string; data?: any;
  ip?: string; user_agent?: string; created_at: string;
};

export const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const db = {
  permissions: [] as Permission[],
  roles: [] as Role[],
  users: [] as User[],
  audit: [] as Audit[],
};

// seed once
if (db.permissions.length === 0) {
  db.permissions.push(
    { code: "users.read", name: "Read Users" },
    { code: "users.write", name: "Manage Users" },
    { code: "roles.read", name: "Read Roles" },
    { code: "roles.write", name: "Manage Roles" },
    { code: "permissions.read", name: "Read Permissions" },
    { code: "audit.read", name: "Read Audit Logs" },
    { code: "crm.leads.read", name: "Read Leads" },
    { code: "crm.leads.write", name: "Manage Leads" },
  );

  const adminRole: Role = {
    id: makeId(),
    name: "Administrator",
    code: "admin",
    description: "Full access",
    permission_codes: db.permissions.map(p => p.code),
    created_at: new Date().toISOString(),
  };
  const tenantAdmin: Role = {
    id: makeId(),
    name: "Tenant Admin",
    code: "tenant_admin",
    description: "Tenant-scoped admin",
    permission_codes: ["users.read","users.write","roles.read","roles.write","permissions.read","audit.read"],
    created_at: new Date().toISOString(),
  };
  db.roles.push(adminRole, tenantAdmin);

  const adminUser: User = {
    id: makeId(),
    name: "Platform Admin",
    email: "admin@example.com",
    active: true,
    is_platform_admin: true,
    roles: [adminRole.code],
    created_at: new Date().toISOString(),
  };
  db.users.push(adminUser);

  db.audit.push({
    id: makeId(),
    user_email: adminUser.email,
    action: "login",
    table_name: undefined,
    row_id: undefined,
    data: { ok: true },
    ip: "127.0.0.1",
    user_agent: "mock",
    created_at: new Date().toISOString(),
  });
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);
  return { items, meta: { page, pageSize, total: rows.length } };
}
