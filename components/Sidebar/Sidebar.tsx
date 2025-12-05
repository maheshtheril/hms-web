"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MenuTree from "./MenuTree";
import { useMenu } from "@/providers/MenuProvider";

/**
 * Sidebar (production-ready)
 * - responsive collapse based on (max-width: 1024px)
 * - safe feature detection for MediaQueryList APIs to avoid TS 'never' errors
 * - shows company name, loading skeleton, and account link
 */
export default function Sidebar() {
  const { items, isLoading, companies, reloadMenu, clearCaches } = useMenu();
  const [collapsed, setCollapsed] = useState(false);
  const mqlRef = useRef<MediaQueryList | null>(null);

  // Initialize collapse state and attach listeners safely (modern + legacy)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 1024px)");
    mqlRef.current = mql;

    const onChange = () => setCollapsed(mql.matches);

    // run once to set initial state
    onChange();

    // modern API
    if (typeof (mql as any).addEventListener === "function") {
      (mql as unknown as MediaQueryList).addEventListener("change", onChange);
      return () => {
        try {
          (mql as unknown as MediaQueryList).removeEventListener("change", onChange);
        } catch {}
      };
    }

    // legacy API fallback
    if (typeof (mql as any).addListener === "function") {
      (mql as any).addListener(onChange);
      return () => {
        try {
          (mql as any).removeListener(onChange);
        } catch {}
      };
    }

    // final fallback: nothing to clean up
    return () => {};
  }, []);

  const companyName = companies && companies.length > 0 ? companies[0].name : null;

  return (
    <>
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen transition-all duration-200 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
          bg-[rgba(255,255,255,0.08)] backdrop-blur-2xl border-r border-white/10
          flex flex-col shadow-xl
        `}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link href="/dashboard" className={`text-xl font-bold tracking-wide ${collapsed ? "text-center w-full" : ""}`}>
            <span className="sr-only">Go to dashboard</span>
            <span aria-hidden>{collapsed ? "E" : "ERP"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed((s) => !s)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Open navigation" : "Collapse navigation"}
              className="p-1 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {/* hamburger / close icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                {collapsed ? (
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-white/10">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className={`h-3 rounded ${collapsed ? "w-6 mx-auto" : "w-3/4" } bg-white/6`} />
              {!collapsed && <div className="h-2 w-1/2 rounded bg-white/6" />}
            </div>
          ) : (
            <div className={`text-sm ${collapsed ? "text-center" : ""} text-white/90`}>
              {collapsed ? (companyName ? companyName.slice(0, 1) : "—") : (companyName ?? "No company")}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary">
          <MenuTree nodes={items} collapsed={collapsed} />
        </nav>

        <div className="p-3 border-t border-white/10 flex items-center justify-between gap-2">
          <div>
            <Link href="/account" className="block text-sm hover:underline">
              {collapsed ? "A" : "Account"}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // quick refresh button for admins
                reloadMenu().catch(() => {});
              }}
              title="Refresh menu"
              className="p-1 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M21 12a9 9 0 1 1-3-6.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={() => {
                clearCaches();
              }}
              title="Clear menu cache"
              className="p-1 rounded hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* spacer to prevent content overlap when sidebar is visible (desktop) */}
      {!collapsed && <div className="hidden lg:block w-64" aria-hidden />}
    </>
  );
}
