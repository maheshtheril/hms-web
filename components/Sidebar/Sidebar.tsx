"use client";

import React from "react";
import { useMenu } from "@/providers/MenuProvider";
import MenuTree from "./MenuTree";
import Link from "next/link";

export default function Sidebar() {
  const { items } = useMenu();

  return (
    <aside
      className="
        w-64 h-screen fixed left-0 top-0 z-40
        bg-[rgba(255,255,255,0.08)]
        backdrop-blur-2xl border-r border-white/10
        flex flex-col shadow-xl
      "
    >
      <div className="p-4 border-b border-white/10">
        <Link
          href="/dashboard"
          className="text-xl font-bold text-white tracking-wide"
        >
          ERP
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <MenuTree nodes={items} />
      </nav>
    </aside>
  );
}
