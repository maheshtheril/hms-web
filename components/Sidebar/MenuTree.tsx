"use client";

import React from "react";
import { MenuItem } from "@/types/menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function MenuTree({ nodes }: { nodes: MenuItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {nodes.map((item) => {
        const isActive =
          item.url && pathname.startsWith(item.url)
            ? "bg-white/10 text-white shadow-inner"
            : "text-white/70";

        return (
          <li key={item.id} className="w-full">
            {item.children && item.children.length > 0 ? (
              <details className="group">
                <summary
                  className={clsx(
                    "cursor-pointer px-3 py-2 rounded-xl select-none hover:bg-white/10 transition",
                    isActive
                  )}
                >
                  {item.label}
                </summary>
                <div className="ml-3 mt-2 space-y-1 border-l border-white/10 pl-3">
                  <MenuTree nodes={item.children} />
                </div>
              </details>
            ) : (
              <Link
                href={item.url ?? "#"}
                className={clsx(
                  "block px-3 py-2 rounded-xl hover:bg-white/10 transition",
                  isActive
                )}
              >
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
