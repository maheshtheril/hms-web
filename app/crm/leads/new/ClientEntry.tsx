// app/crm/leads/new/ClientEntry.tsx
"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

/**
 * Use dynamic imports with ssr:false for portal-based drawers
 * to avoid any SSR mismatches during export/build.
 */
const QuickLeadDrawer = dynamic(
  () => import("@/app/components/leads/QuickLeadDrawer"),
  { ssr: false }
);
const DetailedLeadDrawer = dynamic(
  () => import("@/app/components/leads/DetailedLeadDrawer"),
  { ssr: false }
);

export default function ClientEntry() {
  const sp = useSearchParams();
  const router = useRouter();

  // read params
  const mode = useMemo(() => sp.get("mode") ?? "quick", [sp]);
  const ret = useMemo(() => sp.get("return") ?? "", [sp]);

  // drawer state from mode
  const [quickOpen, setQuickOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setQuickOpen(mode === "quick");
    setDetailOpen(mode === "detailed");
  }, [mode]);

  const withReturn = useCallback(
    (url: string) => {
      // preserve ?return=... if present (only allow internal paths)
      if (ret && ret.startsWith("/")) {
        const sep = url.includes("?") ? "&" : "?";
        return `${url}${sep}return=${encodeURIComponent(ret)}`;
      }
      return url;
    },
    [ret]
  );

  const close = useCallback(() => {
    if (ret && ret.startsWith("/")) {
      router.replace(ret);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace("/dashboard");
    }
  }, [ret, router]);

  const afterCreate = useCallback((_lead: any) => {
    close();
  }, [close]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100 p-8">
      <h1 className="text-2xl font-semibold mb-4">Create Lead</h1>

      <div className="flex gap-3 mb-6">
        <Button
          type="button"
          onClick={() => router.replace(withReturn("/crm/leads/new?mode=quick"))}
          aria-pressed={mode === "quick"}
          variant={mode === "quick" ? "default" : "secondary"}
        >
          Quick Lead
        </Button>
        <Button
          type="button"
          onClick={() => router.replace(withReturn("/crm/leads/new?mode=detailed"))}
          aria-pressed={mode === "detailed"}
          variant={mode === "detailed" ? "default" : "secondary"}
        >
          Detailed Lead
        </Button>
      </div>

      {/* Drawers render hidden when not open; dynamic(ssr:false) avoids SSR issues */}
      <QuickLeadDrawer open={quickOpen} onClose={close} onCreated={afterCreate} />
      <DetailedLeadDrawer open={detailOpen} onClose={close} onCreated={afterCreate} />
    </div>
  );
}
