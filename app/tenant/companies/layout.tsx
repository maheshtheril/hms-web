// app/tenant/layout.tsx
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 antialiased">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white/6 focus:text-white focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen">
        {/* Sidebar wrapper — FIXED ➜ reserve collapsed width for hover */}
        <aside
          aria-label="Sidebar"
          className="relative w-16 shrink-0 border-r border-white/6"
        >
          <Sidebar />
        </aside>

        {/* Main area */}
        <div className="flex-1 min-h-screen flex flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 border-b border-white/6 backdrop-blur-md bg-white/3">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div className="h-14 flex items-center gap-4">
                <div className="flex-1">
                  <Topbar />
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main id="main-content" className="flex-1 py-6">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
