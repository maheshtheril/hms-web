"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MenuItem, MenuResponse } from "@/types/menu";
import { fetchMenu } from "@/lib/fetchMenu";
import { fetchCompanies } from "@/lib/fetchCompanies";
import { usePathname } from "next/navigation";

/**
 * Basic Company type — extend with real fields if you have them.
 */
export interface Company {
  id: string;
  name: string;
  [key: string]: any;
}

interface MenuContextValue {
  // menu
  items: MenuItem[];
  modules: string[];
  reloadMenu: () => Promise<void>;

  // companies
  companies: Company[] | null;
  setCompanies: (c: Company[] | null) => void;
  addCompany?: (c: Company) => void;
}

const MenuContext = createContext<MenuContextValue>({
  items: [],
  modules: [],
  reloadMenu: async () => {},
  companies: null,
  setCompanies: () => {},
});

interface MenuProviderProps {
  children: React.ReactNode;
  initialCompanies?: Company[] | null;
}

/**
 * MenuProvider
 * - loads menu on mount (client-side)
 * - loads companies on mount if not provided by server (initialCompanies === null)
 * - exposes simple API for components to read/reload menu & companies
 */
export function MenuProvider({ children, initialCompanies = null }: MenuProviderProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[] | null>(initialCompanies);
  const pathname = usePathname();

  async function reloadMenu() {
    try {
      const data: MenuResponse = await fetchMenu();
      if (data?.ok) {
        setItems(data.items || []);
        setModules(data.modules || []);
      } else {
        // If backend responded but ok=false, clear menu to avoid stale UI
        setItems([]);
        setModules([]);
      }
    } catch (err) {
      console.error("reloadMenu error", err);
      setItems([]);
      setModules([]);
    }
  }

  // convenience helper to add a company into state
  function addCompany(c: Company) {
    setCompanies((prev) => (prev ? [...prev, c] : [c]));
  }

  useEffect(() => {
    // initial load of menu (client-side)
    reloadMenu();

    // initial load of companies only when server didn't provide them
    (async () => {
      if (companies === null) {
        try {
          const res = await fetchCompanies();
          // fetchCompanies returns object shape { ok: boolean, companies: [...] } or null fallback
          if (res && Array.isArray((res as any).companies)) {
            setCompanies((res as any).companies);
          } else if (Array.isArray(res)) {
            // in case fetchCompanies returns an array directly
            setCompanies(res as any);
          } else {
            setCompanies([]);
          }
        } catch (err) {
          console.error("MenuProvider: fetchCompanies failed:", err);
          setCompanies([]);
        }
      }
    })();
    // we intentionally run this once on mount (eslint-disable-next-line react-hooks/exhaustive-deps)
  }, []);

  // optional: could reload on pathname change if menu highlights depend on route
  useEffect(() => {
    // placeholder if you need to sync menu on route change
  }, [pathname]);

  return (
    <MenuContext.Provider value={{ items, modules, reloadMenu, companies, setCompanies, addCompany }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  return useContext(MenuContext);
}
