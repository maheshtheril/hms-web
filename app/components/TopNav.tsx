"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const path = usePathname();

  // active for exact match or any sub-route (e.g., /crm/leads/123)
  const isActive = (href: string) =>
    path === href || (href !== "/" && path.startsWith(href + "/"));

  const items = [
    { href: "/dashboard", label: "Dashboard", prefetch: true },
    { href: "/crm/leads", label: "Leads", prefetch: true },
    // These pages don’t exist yet → disable prefetch to avoid Next GET 404 prefetches
    { href: "/crm/companies", label: "Companies", prefetch: false },
    { href: "/reports", label: "Reports", prefetch: false },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto w-full max-w-screen-2xl h-14 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left: chip nav */}
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap" aria-label="Primary">
          {items.map(({ href, label, prefetch }) => {
            const active = isActive(href);
            const classes = [
              "px-3 py-1.5 rounded-full text-xs sm:text-sm transition",
              active ? "bg-white text-black" : "bg-white/5 hover:bg-white/10",
            ].join(" ");

            return (
              <Link
                key={href}
                href={href}
                prefetch={prefetch}
                className={classes}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: actions (add buttons/menus here as needed) */}
        <div className="flex items-center gap-2" />
      </div>
    </header>
  );
}
