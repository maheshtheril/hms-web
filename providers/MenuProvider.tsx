"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MenuItem, MenuResponse } from "@/types/menu";
import { fetchMenu } from "@/lib/fetchMenu";
import { usePathname } from "next/navigation";

interface MenuContextValue {
  items: MenuItem[];
  modules: string[];
  reloadMenu: () => Promise<void>;
}

const MenuContext = createContext<MenuContextValue>({
  items: [],
  modules: [],
  reloadMenu: async () => {},
});

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const pathname = usePathname();

  async function reloadMenu() {
    const data: MenuResponse = await fetchMenu();
    if (data.ok) {
      setItems(data.items);
      setModules(data.modules);
    }
  }

  useEffect(() => {
    reloadMenu();
  }, []);

  // reload when route changes in case menu highlight changes
  useEffect(() => {
    // optional: hook for sync
  }, [pathname]);

  return (
    <MenuContext.Provider value={{ items, modules, reloadMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  return useContext(MenuContext);
}
