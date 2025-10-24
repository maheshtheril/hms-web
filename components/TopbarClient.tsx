// components/TopbarClient.tsx
"use client";

import React from "react";
import { Topbar } from "./Topbar"; // <-- named import! adjust path if your folder layout differs

type Props = {
  user?: { name?: string; email?: string; avatarUrl?: string | null };
  onToggleSidebar?: () => void;
  initialNotifCount?: number;
  initialMessageCount?: number;
};

export default function TopbarClient(props: Props) {
  return <Topbar {...props} />;
}
