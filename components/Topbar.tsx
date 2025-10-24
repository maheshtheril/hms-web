// components/Topbar.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type TopbarProps = {
  user?: { name?: string; email?: string; avatarUrl?: string | null };
  onToggleSidebar?: () => void;
  initialNotifCount?: number;
  initialMessageCount?: number;
};

type MessageItem = {
  id: string;
  title?: string;
  body?: string;
  created_at?: string;
  from?: string;
  read?: boolean;
};

export function Topbar({
  user,
  onToggleSidebar,
  initialNotifCount = 0,
  initialMessageCount = 0,
}: TopbarProps) {
  console.info("[Topbar] mounted — components/Topbar.tsx", {
    initialNotifCount,
    initialMessageCount,
  });

  // Robust logout
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("[Topbar] logout request failed:", err);
    }

    try {
      localStorage.removeItem("gg.sidebar.openmap");
      localStorage.removeItem("gg.sidebar.openchildmap");
      localStorage.removeItem("gg.sidebar.pinned.sections");
      localStorage.removeItem("gg.sidebar.pinned");
      localStorage.removeItem("gg.sidebar.favorites");
      localStorage.removeItem("gg.sidebar.recents");
    } catch {}

    try {
      localStorage.setItem("gg.auth.updated", Date.now().toString());
      window.dispatchEvent(new Event("auth:update"));
    } catch {}

    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }, []);

  const displayInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  const [notifCount, setNotifCount] = useState<number>(initialNotifCount);
  const [messageCount, setMessageCount] = useState<number>(initialMessageCount);

  const detailsMsgRef = useRef<HTMLDetailsElement | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesErr, setMessagesErr] = useState<string | null>(null);

  // popup/toast — now supports React nodes for richer content
  const [popupContent, setPopupContent] = useState<React.ReactNode | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  function truncate(s: string, n = 140) {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function showPopupMessage(payload: { title?: string; body?: string; from?: string; created_at?: string }, ms = 4000) {
    // Build a compact card-like node
    const time = payload.created_at ? new Date(payload.created_at).toLocaleString() : "";
    const title = payload.title ?? (payload.body ? truncate(payload.body, 60) : "Message saved");
    const body = payload.body ? truncate(payload.body, 140) : "";
    const meta = [payload.from ? `From: ${payload.from}` : null, time || null].filter(Boolean).join(" • ");

    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }

    setPopupContent(
      <div>
        <div className="font-semibold">{title}</div>
        {body && <div className="text-[13px] mt-1 leading-snug opacity-90">{body}</div>}
        {meta && <div className="text-[11px] mt-1 opacity-70">{meta}</div>}
      </div>
    );

    popupTimerRef.current = window.setTimeout(() => {
      setPopupContent(null);
      popupTimerRef.current = null;
    }, ms) as unknown as number;
  }

  // Track whether we've already performed the initial read — suppress popups during that time
  const didInitialReadRef = useRef(false);

  // robust listeners — handle app:messages / app:notification and storage fallback
  useEffect(() => {
    const LOCAL_KEY = "gg:messages:latest";

    const handleEvent = (e: Event) => {
      try {
        const d = (e as CustomEvent).detail;
        if (!d) return;

        // counts
        if (typeof d.increment === "number") setNotifCount((c) => c + d.increment);
        if (typeof d.set === "number") setNotifCount(d.set);
        if (typeof d.decrement === "number") setNotifCount((c) => Math.max(0, c - d.decrement));

        if (typeof d.messagesIncrement === "number") setMessageCount((c) => c + d.messagesIncrement);
        if (typeof d.messagesSet === "number") setMessageCount(d.messagesSet);

        // messages array
        if (Array.isArray(d.messages) && d.messages.length) {
          const incoming = d.messages.map((m: any) => ({
            id: String(m.id ?? m.message_id ?? m.uuid ?? Math.random().toString(36).slice(2, 9)),
            title: m.title ?? m.subject ?? (m.body ? String(m.body).slice(0, 48) : "Message"),
            body: m.body ?? m.text ?? "",
            from: m.from ?? m.author ?? "",
            created_at: m.created_at ?? m.time ?? m.date ?? new Date().toISOString(),
            read: !!m.read,
          }));

          setMessages((prev) => {
            const map = new Map(prev.map((x) => [x.id, x]));
            // set or replace
            incoming.forEach((m: any) => map.set(m.id, m));
            // newest first (map preserves insertion order; rebuild with incoming first)
            const merged = Array.from(map.values());
            // put incoming first in result
            const uniq = new Map<string, MessageItem>();
            for (const it of [...incoming, ...merged]) uniq.set(it.id, it);
            return Array.from(uniq.values()).slice(0, 6);
          });

          const first = incoming[0];
          // Only show popup for real-time events (after initial load)
          if (first && didInitialReadRef.current) {
            showPopupMessage(first);
          }
        } else if (d.title || d.body || d.text) {
          const txt = {
            title: d.title ?? d.subject ?? (d.body ? String(d.body).slice(0, 200) : "Saved"),
            body: d.body ?? d.text ?? "",
            from: d.from ?? d.author ?? "",
            created_at: d.created_at ?? d.time ?? new Date().toISOString(),
          };
          if (didInitialReadRef.current) {
            showPopupMessage(txt);
          } else {
            // if initial read hasn't completed, merge silently
            setMessages((prev) => {
              const id = String(Math.random().toString(36).slice(2, 9));
              const item = { id, title: txt.title, body: txt.body, from: txt.from, created_at: txt.created_at, read: false };
              const map = new Map(prev.map((x) => [x.id, x]));
              map.set(item.id, item);
              return Array.from(map.values()).slice(0, 6);
            });
          }
        }
      } catch (err) {
        console.error("[Topbar] handleEvent error", err);
      }
    };

    const onStorage = (ev: StorageEvent) => {
      try {
        if (ev.key !== LOCAL_KEY) return;
        if (!ev.newValue) return;
        const obj = JSON.parse(ev.newValue);

        if (didInitialReadRef.current) {
          // normal behavior — re-dispatch so handleEvent shows popup
          window.dispatchEvent(new CustomEvent("app:messages", { detail: obj }));
        } else {
          // initial loader: populate silently then mark initial read done
          if (Array.isArray(obj.messages) && obj.messages.length) {
            const incoming = obj.messages.map((m: any) => ({
              id: String(m.id ?? m.message_id ?? m.uuid ?? Math.random().toString(36).slice(2, 9)),
              title: m.title ?? m.subject ?? (m.body ? String(m.body).slice(0, 48) : "Message"),
              body: m.body ?? m.text ?? "",
              from: m.from ?? m.author ?? "",
              created_at: m.created_at ?? m.time ?? m.date ?? new Date().toISOString(),
              read: !!m.read,
            }));
            setMessages((prev) => {
              const map = new Map(prev.map((x) => [x.id, x]));
              incoming.forEach((m: any) => map.set(m.id, m));
              return Array.from(map.values()).slice(0, 6);
            });
            if (typeof obj.unread === "number") setMessageCount(obj.unread);
          }
          didInitialReadRef.current = true;
        }
      } catch {
        // ignore parse problems
      }
    };

    window.addEventListener("app:messages", handleEvent as EventListener);
    window.addEventListener("app:notification", handleEvent as EventListener);
    window.addEventListener("storage", onStorage);

    // one-time initial read from localStorage: populate silently and set initial-flag
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (Array.isArray(obj.messages) && obj.messages.length) {
          const incoming = obj.messages.map((m: any) => ({
            id: String(m.id ?? m.message_id ?? m.uuid ?? Math.random().toString(36).slice(2, 9)),
            title: m.title ?? m.subject ?? (m.body ? String(m.body).slice(0, 48) : "Message"),
            body: m.body ?? m.text ?? "",
            from: m.from ?? m.author ?? "",
            created_at: m.created_at ?? m.time ?? m.date ?? new Date().toISOString(),
            read: !!m.read,
          }));
          setMessages((prev) => {
            const map = new Map(prev.map((x) => [x.id, x]));
            incoming.forEach((m: any) => map.set(m.id, m));
            return Array.from(map.values()).slice(0, 6);
          });
          if (typeof obj.unread === "number") setMessageCount(obj.unread);
        }
      }
    } catch {
      // ignore
    } finally {
      // mark that initial read is done — future events should show popups
      didInitialReadRef.current = true;
    }

    return () => {
      window.removeEventListener("app:messages", handleEvent as EventListener);
      window.removeEventListener("app:notification", handleEvent as EventListener);
      window.removeEventListener("storage", onStorage);
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
        popupTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // legacy/secondary handler kept for compatibility (merging behavior)
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      if (typeof d.increment === "number") setNotifCount((c) => c + d.increment);
      if (typeof d.set === "number") setNotifCount(d.set);
      if (typeof d.decrement === "number") setNotifCount((c) => Math.max(0, c - d.decrement));
      if (typeof d.messagesIncrement === "number") setMessageCount((c) => c + d.messagesIncrement);
      if (typeof d.messagesSet === "number") setMessageCount(d.messagesSet);

      if (Array.isArray(d.messages) && d.messages.length) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          d.messages.forEach((m: any) =>
            map.set(String(m.id ?? m.message_id ?? m.uuid), {
              id: String(m.id ?? m.message_id ?? m.uuid),
              title: m.title ?? m.subject ?? (m.body ? String(m.body).slice(0, 48) : "Message"),
              body: m.body ?? m.text ?? "",
              from: m.from ?? m.author ?? "",
              created_at: m.created_at ?? m.time ?? m.date ?? "",
              read: !!m.read,
            })
          );
          return Array.from(map.values()).slice(0, 6);
        });

        const first = Array.isArray((e as CustomEvent).detail.messages) ? (e as CustomEvent).detail.messages[0] : null;
        if (first && didInitialReadRef.current) {
          const title = first.title ?? first.subject ?? (first.body ? String(first.body).slice(0, 200) : "");
          showPopupMessage({ title, body: first.body ?? first.text ?? "", from: first.from, created_at: first.created_at });
        }
      }
    };

    window.addEventListener("app:notification", handler as EventListener);
    window.addEventListener("app:messages", handler as EventListener);
    return () => {
      window.removeEventListener("app:notification", handler as EventListener);
      window.removeEventListener("app:messages", handler as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch messages on demand (kept)
  async function fetchMessages() {
    if (messages.length > 0 || messagesLoading) return;
    setMessagesErr(null);
    setMessagesLoading(true);
    try {
      const res = await fetch("/api/messages?limit=6", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setMessagesErr(txt || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => null);
      const arr =
        Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.data) ? data.data : [];
      const mapped = (arr || []).slice(0, 6).map((m: any) => ({
        id: String(m.id ?? m.message_id ?? m.uuid ?? Math.random().toString(36).slice(2, 9)),
        title: m.title ?? m.subject ?? (m.body ? String(m.body).slice(0, 48) : "Message"),
        body: m.body ?? m.text ?? "",
        from: m.from ?? m.author ?? "",
        created_at: m.created_at ?? m.time ?? m.date ?? "",
        read: !!m.read,
      }));
      setMessages(mapped);
      const unread = typeof data?.unread === "number" ? data.unread : undefined;
      if (typeof unread === "number") setMessageCount(unread);
    } catch (err: any) {
      setMessagesErr(err?.message || "Could not load messages");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function markMessageRead(id: string) {
    try {
      await fetch(`/api/messages/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    } finally {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
      setMessageCount((c) => Math.max(0, c - 1));
    }
  }

  async function markAllRead() {
    try {
      await fetch(`/api/messages/mark-read-all`, { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    } finally {
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      setMessageCount(0);
    }
  }

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between gap-2 px-3 lg:px-6 relative">
        {/* Left: Hamburger (mobile) + Brand */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
            </svg>
          </button>

          <div className="flex items-center gap-3 rounded-lg px-2 py-1">
            <div className="hidden xs:block leading-tight">
              <div className="text-sm font-semibold">{user?.email ?? user?.name ?? "Signed in"}</div>
              <div className="text-[10px] opacity-70">GeniusGrid ERP • Agentic • AI</div>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search (Ctrl/Cmd + K)"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 active:scale-[.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.5 21.5 20zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z"
              />
            </svg>
            <span>Search</span>
          </button>

          <button
            type="button"
            aria-label="Toggle theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9a7 7 0 0 1-9-9z" />
            </svg>
          </button>

          <details className="relative">
            <summary className="list-none">
              <button
                type="button"
                aria-label="Account menu"
                className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/10 hover:ring-white/20 active:scale-95"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs">
                    {displayInitial}
                  </div>
                )}
              </button>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-2 shadow-xl backdrop-blur">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold text-white/90">{user?.name || user?.email || "User"}</div>
                {user?.email && <div className="text-xs opacity-70">{user.email}</div>}
              </div>
              <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" />
                </svg>
                Profile
              </Link>
              <Link href="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M12 8a4 4 0 1 1-4 4a4 4 0 0 1 4-4m8.94 4a7.94 7.94 0 0 0-.15-1.5l2.11-1.65l-2-3.46l-2.49 1a8.12 8.12 0 0 0-2.6-1.5L13.5 1h-4l-.31 2.89a8.12 8.12 0 0 0-2.6 1.5l-2.49-1l-2 3.46L3.7 10.5A7.94 7.94 0 0 0 3.56 12a7.94 7.94 0 0 0 .15 1.5L1.6 15.15l2 3.46l2.49-1a8.12 8.12 0 0 0 2.6 1.5L9.5 23h4l.31-2.89a8.12 8.12 0 0 0 2.6-1.5l2.49 1l2-3.46L20.3 13.5c.1-.49.16-.99.16-1.5Z" />
                </svg>
                Settings
              </Link>
              <button
                onClick={logout}
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M14 7v-2h-10v14h10v-2h2v4h-14v-18h14v4zm7 5l-5-5v3h-8v4h8v3l5-5z" />
                </svg>
                Logout
              </button>
            </div>
          </details>

          <button
            onClick={logout}
            type="button"
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl 
                       bg-gradient-to-r from-rose-500/90 via-fuchsia-500/80 to-indigo-500/80 
                       hover:from-rose-400 hover:via-fuchsia-400 hover:to-indigo-400
                       text-white text-sm font-semibold
                       border border-white/10
                       shadow-[0_0_0_1px_rgba(255,255,255,0.08)]
                       hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.35)]
                       active:scale-[.98]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden
              className="opacity-90 transition-transform group-hover:translate-x-[1px]"
            >
              <path
                fill="currentColor"
                d="M14 7v-2h-10v14h10v-2h2v4h-14v-18h14v4zM21 12l-5-5v3h-8v4h8v3l5-5z"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>

        {/* MESSAGE POPUP */}
        {popupContent && (
          <div
            className="absolute right-1/2 transform translate-x-1/2 top-3 z-50 max-w-xl
                       rounded-lg border border-white/10 bg-emerald-500/95 text-black px-4 py-2 text-sm shadow-lg
                       pointer-events-none"
            role="status"
            aria-live="polite"
          >
            {popupContent}
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
