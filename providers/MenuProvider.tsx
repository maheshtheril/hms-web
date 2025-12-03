"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MenuItem, MenuResponse } from "@/types/menu";
import { fetchMenu } from "@/lib/fetchMenu";
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
      }
    } catch (err) {
      console.error("reloadMenu error", err);
    }
  }

  // convenience helper to add a company into state
  function addCompany(c: Company) {
    setCompanies((prev) => (prev ? [...prev, c] : [c]));
  }

  useEffect(() => {
    // initial load of menu (client-side)
    reloadMenu();
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
