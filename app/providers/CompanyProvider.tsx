"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Company = { id: string; name?: string } | null;

type CompanyContextValue = {
  company: Company;
  setCompany: (c: Company) => void;
  clearCompany: () => void;
};

const STORAGE_KEY = "hms:selected_company_v1";

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompanyState] = useState<Company>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) setCompanyState({ id: parsed.id, name: parsed.name });
      }
    } catch (e) {
      console.warn("CompanyProvider: failed to read storage", e);
    }
  }, []);

  const setCompany = (c: Company) => {
    setCompanyState(c);
    try {
      if (c) localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("CompanyProvider: failed to write storage", e);
    }
  };

  const clearCompany = () => {
    setCompanyState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  const value = useMemo(() => ({ company, setCompany, clearCompany }), [company]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
