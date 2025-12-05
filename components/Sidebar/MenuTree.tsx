"use client";

import React, { useCallback, useMemo, useState } from "react";
import { MenuItem } from "@/types/menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

type Props = {
  nodes: MenuItem[];
  collapsed?: boolean; // optional: allow sidebar collapse to show initials
};

function hasActiveChild(node: MenuItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (node.url && pathname.startsWith(node.url)) return true;
  if (!node.children || node.children.length === 0) return false;
  return node.children.some((c) => hasActiveChild(c, pathname));
}

/**
 * MenuTree
 * - accessible, keyboard friendly recursive menu
 * - auto-opens nodes that contain the active route
 */
export default function MenuTree({ nodes, collapsed = false }: Props) {
  const pathname = usePathname() ?? null;

  // compute initial open set: open nodes that contain active path
  const initialOpenIds = useMemo(() => {
    const set = new Set<string>();
    function walk(arr: MenuItem[]) {
      for (const n of arr) {
        if (hasActiveChild(n, pathname)) {
          if (n.id) set.add(n.id);
        }
        if (n.children) walk(n.children);
      }
    }
    walk(nodes);
    return set;
  }, [nodes, pathname]);

  const [openIds, setOpenIds] = useState<Set<string>>(initialOpenIds);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // small renderer for icon/badge — keep minimal so no extra deps required
  const Icon = ({ name }: { name?: string | null }) => {
    if (!name) return null;
    // You can swap this for lucide/react or heroicons if available.
    return <span aria-hidden className="inline-block w-4 h-4 mr-2 text-white/80">{name[0].toUpperCase()}</span>;
  };

  return (
    <nav role="navigation" aria-label="Primary">
      <ul role="tree" className="space-y-1">
        {nodes.map((item) => (
          <MenuNode
            key={item.id}
            item={item}
            pathname={pathname}
            openIds={openIds}
            toggle={toggle}
            collapsed={collapsed}
            Icon={Icon}
          />
        ))}
      </ul>
    </nav>
  );
}

function MenuNode({
  item,
  pathname,
  openIds,
  toggle,
  collapsed,
  Icon,
}: {
  item: MenuItem;
  pathname: string | null;
  openIds: Set<string>;
  toggle: (id: string) => void;
  collapsed?: boolean;
  Icon: ({ name }: { name?: string | null }) => JSX.Element | null;
}) {
  const isActive = !!(item.url && pathname && pathname.startsWith(item.url));
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isOpen = item.id ? openIds.has(item.id) : false;
  const label = item.label ?? item.key;

  // key handlers for accessibility
  const onKeyToggle = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (item.id) toggle(item.id);
    }
  };

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} className="w-full">
      <div
        className={clsx(
          "flex items-center justify-between",
          hasChildren ? "group" : "",
          "rounded-xl"
        )}
      >
        {hasChildren ? (
          // Toggle row
          <div
            role="button"
            tabIndex={0}
            onClick={() => item.id && toggle(item.id)}
            onKeyDown={onKeyToggle}
            aria-pressed={isOpen}
            className={clsx(
              "flex items-center gap-2 w-full px-3 py-2 cursor-pointer select-none hover:bg-white/10 transition",
              isActive ? "bg-white/10 text-white shadow-inner" : "text-white/70"
            )}
          >
            <div className="flex items-center truncate">
              <Icon name={item.icon} />
              <span className="truncate">{collapsed ? label.slice(0, 1) : label}</span>
              {item.badge ? (
                <span className="ml-2 px-2 rounded bg-white/6 text-xs" aria-hidden>
                  {item.badge}
                </span>
              ) : null}
            </div>

            <div className="ml-auto opacity-70">
              {/* chevron — small visual cue */}
              <svg
                className={clsx("w-4 h-4 transform transition-transform", isOpen ? "rotate-90" : "rotate-0")}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        ) : (
          // Leaf node (link)
          <Link
            href={item.url ?? "#"}
            className={clsx(
              "block w-full px-3 py-2 rounded-xl hover:bg-white/10 transition",
              isActive ? "bg-white/10 text-white shadow-inner" : "text-white/70"
            )}
            aria-current={isActive ? "page" : undefined}
            title={label}
          >
            <div className="flex items-center gap-2 truncate">
              <Icon name={item.icon} />
              <span className="truncate">{collapsed ? label.slice(0, 1) : label}</span>
              {item.badge ? (
                <span className="ml-2 px-2 rounded bg-white/6 text-xs" aria-hidden>
                  {item.badge}
                </span>
              ) : null}
            </div>
          </Link>
        )}
      </div>

      {/* children */}
      {hasChildren && isOpen && (
        <ul role="group" className="ml-3 mt-2 space-y-1 border-l border-white/10 pl-3">
          {item.children!.map((child) => (
            <MenuNode
              key={child.id}
              item={child}
              pathname={pathname}
              openIds={openIds}
              toggle={toggle}
              collapsed={collapsed}
              Icon={Icon}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
