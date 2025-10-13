'use client';
// app/crm/leads/new/ClientEntry.tsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuickLeadDrawer from "@/app/components/leads/QuickLeadDrawer";
import DetailedLeadDrawer from "@/app/components/leads/DetailedLeadDrawer";
import { Button } from "@/app/components/ui/Button";

export default function ClientEntry() {
  const sp = useSearchParams();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const mode = sp.get("mode");
    setQuickOpen(mode === "quick");
    setDetailOpen(mode === "detailed");
  }, [sp]);

  const close = useCallback(() => {
    const ret = sp.get("return");
    if (ret && ret.startsWith("/")) router.replace(ret);
    else if (window.history.length > 1) router.back();
    else router.replace("/dashboard");
  }, [router, sp]);

  const afterCreate = useCallback((_lead: any) => close(), [close]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100 p-8">
      <h1 className="text-2xl font-semibold mb-4">Create Lead</h1>
      <div className="flex gap-3">
        <Button onClick={() => router.replace("/crm/leads/new?mode=quick")}>Quick Lead</Button>
        <Button onClick={() => router.replace("/crm/leads/new?mode=detailed")}>Detailed Lead</Button>
      </div>

      <QuickLeadDrawer open={quickOpen} onClose={close} onCreated={afterCreate} />
      <DetailedLeadDrawer open={detailOpen} onClose={close} onCreated={afterCreate} />
    </div>
  );
}
