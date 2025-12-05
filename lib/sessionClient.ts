// frontend: lib/sessionClient.ts
let _sid: string | null = null;
export const setSid = (s: string|null) => { _sid = s; };
export const getSid = () => _sid;
export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (_sid) headers.set("Authorization", `Bearer ${_sid}`);
  return fetch(input, { credentials: "include", ...init, headers });
}
