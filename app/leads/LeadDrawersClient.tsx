// app/crm/leads/LeadDrawersClient.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ⬇️ change these to relative imports
import EditLeadDrawer from "./EditLeadDrawer";
import AddLeadDrawer from "./AddLeadDrawer";

export default function LeadDrawersClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const isNew = sp.get("new") === "1";
  const editId = sp.get("edit");

  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(() => setOpenNew(isNew), [isNew]);
  useEffect(() => setOpenEdit(Boolean(editId)), [editId]);

  const closeParam = (key: string) => {
    const q = new URLSearchParams(sp.toString());
    q.delete(key);
    router.replace(`/leads${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  const closeNew = () => { setOpenNew(false); closeParam("new"); };
  const closeEdit = () => { setOpenEdit(false); closeParam("edit"); };

  const onCreated = () => { closeNew(); router.refresh(); };
  const onUpdated = () => { closeEdit(); router.refresh(); };

  return (
    <>
      <AddLeadDrawer open={openNew} onClose={closeNew} onCreated={onCreated} />
      {editId && (
        <EditLeadDrawer open={openEdit} id={editId} onClose={closeEdit} onUpdated={onUpdated} />
      )}
    </>
  );
}
