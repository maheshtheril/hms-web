// path: web/lib/usePaginatedList.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

function normalizePath(rawUrl: string): string {
  const base = (apiClient.defaults.baseURL || "").replace(/\/+$/, ""); // no trailing slash
  let path = (rawUrl || "").trim();

  // Absolute URLs: leave them alone
  if (/^https?:\/\//i.test(path)) return path;

  // Ensure leading slash for relative paths
  if (!path.startsWith("/")) path = "/" + path;

  // If baseURL already ends with /api and caller accidentally starts with /api/, strip one
  if (base.endsWith("/api") && path.startsWith("/api/")) {
    path = path.slice(4); // drop leading "/api"
  }

  // Collapse multiple slashes (except we don't have protocol here)
  path = path.replace(/\/{2,}/g, "/");

  return path;
}

export function usePaginatedList<T>(key: string, url: string, params: any) {
  const [data, setData] = useState<{ items: T[]; meta?: any } | T[] | null>(null);
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  const qs = useMemo(() => new URLSearchParams(params || {}).toString(), [params]);

  async function mutate() {
    // cancel any in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setIsLoading(true);
    setError(null);

    try {
      const path = normalizePath(url);
      const hasQuery = path.includes("?");
      const finalUrl = qs ? `${path}${hasQuery ? "&" : "?"}${qs}` : path;

      const r = await apiClient.get(finalUrl, { signal: ac.signal as any });
      setData(r.data);
    } catch (e: any) {
      // Ignore axios cancellation variants
      const name = e?.name || "";
      const msg = e?.message || "";
      if (name !== "CanceledError" && msg !== "canceled" && !e?.__CANCEL__) {
        setError(e);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    mutate();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, qs, url]);

  return {
    data,
    error,
    isLoading,
    mutate,
  } as {
    data: { items: T[]; meta?: any } | T[] | null;
    error: any;
    isLoading: boolean;
    mutate: () => Promise<void>;
  };
}
