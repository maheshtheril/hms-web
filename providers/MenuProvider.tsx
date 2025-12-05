"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MenuItem, MenuResponse } from "@/types/menu";
import { fetchMenu } from "@/lib/fetchMenu";
import { fetchCompanies } from "@/lib/fetchCompanies";
import { usePathname } from "next/navigation";

/** Basic Company type — extend with real fields if you have them. */
export interface Company {
  id: string;
  name: string;
  [key: string]: any;
}

interface MenuContextValue {
  // menu
  items: MenuItem[];
  modules: string[];
  reloadMenu: () => Promise<boolean>;

  // companies
  companies: Company[] | null;
  setCompanies: (c: Company[] | null) => void;
  addCompany?: (c: Company) => void;

  // extras
  isLoading: boolean;
  isError: boolean;
  clearCaches: () => void;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

interface MenuProviderProps {
  children: React.ReactNode;
  initialCompanies?: Company[] | null;
}

/**
 * Production-ready MenuProvider
 * - parallel initial load of menu + companies
 * - supports server-provided initialCompanies (SSR)
 * - exposes isLoading / isError and clearCaches()
 * - cross-tab cache invalidation via BroadcastChannel + storage fallback
 */
export function MenuProvider({ children, initialCompanies = null }: MenuProviderProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[] | null>(initialCompanies ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const pathname = usePathname();
  const bcRef = useRef<BroadcastChannel | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // normalize response into sorted items + modules
  function normalizeMenu(resp: MenuResponse | null) {
    if (!resp || !resp.ok) return { items: [] as MenuItem[], modules: [] as string[] };
    const normalized = (resp.items || []).slice().sort((a, b) => (Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999)));
    return { items: normalized, modules: resp.modules || [] };
  }

  // reloadMenu: public API
  async function reloadMenu(): Promise<boolean> {
    setIsLoading(true);
    setIsError(false);
    try {
      const resp = await fetchMenu();
      const { items: newItems, modules: newModules } = normalizeMenu(resp);
      if (!mountedRef.current) return false;
      setItems(newItems);
      setModules(newModules);
      return true;
    } catch (err) {
      console.error("MenuProvider.reloadMenu failed", err);
      if (!mountedRef.current) return false;
      setItems([]);
      setModules([]);
      setIsError(true);
      return false;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }

  // convenience helper to add company
  function addCompany(c: Company) {
    setCompanies((prev) => (prev ? [...prev, c] : [c]));
  }

  // clear caches (sessionStorage managed by fetch helpers)
  function clearCaches() {
    try {
      // modules / menu caches are managed by fetch helpers (e.g. sessionStorage)
      // notify other tabs to clear as well
      if (typeof BroadcastChannel !== "undefined") {
        if (!bcRef.current) bcRef.current = new BroadcastChannel("erp-menu");
        bcRef.current.postMessage({ type: "clear-cache" });
      } else {
        // storage fallback
        localStorage.setItem("erp:menu:clear", Date.now().toString());
      }
    } catch (err) {
      // ignore
    }
  }

  // cross-tab sync
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bcRef.current = new BroadcastChannel("erp-menu");
        bcRef.current.onmessage = (ev) => {
          if (ev.data?.type === "clear-cache") {
            // we don't block on reload
            reloadMenu().catch(() => {});
            setCompanies(null);
          }
        };
        return () => {
          try {
            bcRef.current?.close();
            bcRef.current = null;
          } catch {}
        };
      }

      const onStorage = (ev: StorageEvent) => {
        if (ev.key === "erp:menu:clear") {
          reloadMenu().catch(() => {});
          setCompanies(null);
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    } catch (err) {
      // if anything goes wrong, fail silently (do not crash UI)
      console.error("MenuProvider: cross-tab setup failed", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // initial load (parallel)
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        // if initialCompanies provided, avoid fetching companies
        const [menuResp, companiesResp] = await Promise.all([
          fetchMenu(),
          companies === null ? fetchCompanies() : Promise.resolve(companies),
        ]);

        if (!mountedRef.current) return;

        const norm = normalizeMenu(menuResp);
        setItems(norm.items);
        setModules(norm.modules);

        if (companies === null) {
          if (Array.isArray(companiesResp)) setCompanies(companiesResp);
          else setCompanies([]);
        }
      } catch (err) {
        console.error("MenuProvider: initial load failed", err);
        if (!mountedRef.current) return;
        setItems([]);
        setModules([]);
        if (companies === null) setCompanies([]);
        setIsError(true);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();

    // run this effect only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // optional: placeholder for pathname-driven sync (left intentionally minimal)
  useEffect(() => {
    // we intentionally do not auto-reload on every route change to avoid extra traffic
  }, [pathname]);

  const value = useMemo(
    () => ({
      items,
      modules,
      reloadMenu,
      companies,
      setCompanies,
      addCompany,
      isLoading,
      isError,
      clearCaches,
    }),
    [items, modules, companies, isLoading, isError]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

/** typed hook */
export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}
