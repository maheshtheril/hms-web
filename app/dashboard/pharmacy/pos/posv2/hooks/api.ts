// /app/dashboard/pharmacy/pos/posv2/hooks/api.ts
export function timeoutPromise<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      clearTimeout(id);
      reject(e);
    });
  });
}

/**
 * helper to do fetch with AbortController and automatic timeout
 */
export async function safeFetch(input: RequestInfo, init?: RequestInit & { timeoutMs?: number; signal?: AbortSignal }) {
  const timeoutMs = init?.timeoutMs ?? 10000;
  const controller = new AbortController();
  const signal = init?.signal ?? controller.signal;
  const mergedInit = { ...init, signal };

  // start timeout
  const p = fetch(input, mergedInit);
  try {
    const res = await timeoutPromise(p as any, timeoutMs);
    return res;
  } catch (err) {
    // ensure abort
    try { controller.abort(); } catch {}
    throw err;
  }
}
