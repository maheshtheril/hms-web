// /app/dashboard/hr/roles/page.tsx
"use client";

import TableCard from "../../components/TableCard";

export default function RolesPermissions() {
  return (
    <TableCard
      title="Role & Permissions"
      columns={[
        "Role",
        "Description",
        "Modules Allowed",
        "Users",
      ]}
    />
  );
}
