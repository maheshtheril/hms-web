"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


export default function TopNav() {
  const path = usePathname();
  const isActive = (href: string) => path === href;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto w-full max-w-screen-2xl h-14 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left: chip nav */}
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/crm/leads", label: "Leads" },
            { href: "/crm/companies", label: "Companies" },
            { href: "/reports", label: "Reports" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                "px-3 py-1.5 rounded-full text-xs sm:text-sm transition",
                isActive(href)
                  ? "bg-white text-black"
                  : "bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: actions */}
      
      </div>
    </header>
  );
}
