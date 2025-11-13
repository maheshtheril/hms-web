"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

type CompanyCtx = {
  company: { id: string } | null;
  user: { id: string; email?: string; name?: string } | null;
  loading: boolean;
  refresh: () => Promise<void>;
  switchCompany: (id: string) => Promise<void>;
};

const CompanyContext = createContext<CompanyCtx>({
  company: null,
  user: null,
  loading: true,
  refresh: async () => {},
  switchCompany: async () => {},
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();
  const [company, setCompany] = useState<{ id: string } | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/session", { withCredentials: true });
      const s = res.data.session;
      setCompany(s?.active_company_id ? { id: s.active_company_id } : null);
      setUser({ id: s?.user_id, email: s?.email, name: s?.name });
    } catch (err: any) {
      console.error("CompanyProvider load error", err);
      setCompany(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchCompany = useCallback(
    async (id: string) => {
      try {
        await apiClient.post(
          "/api/company/switch",
          { company_id: id },
          { withCredentials: true }
        );
        toast.success("Company switched", "Active company changed successfully");
        await load();
      } catch (err: any) {
        console.error("switchCompany error", err);
        toast.error(err?.message ?? "Failed to switch company");
      }
    },
    [load, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CompanyContext.Provider value={{ company, user, loading, refresh: load, switchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
