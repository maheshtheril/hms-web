"use client";

import { useEffect, useRef, useState } from "react";
import Fireworks, { type FireworksHandle } from "@/app/components/effects/Fireworks";

function popCookie(name: string): boolean {
  try {
    const has = document.cookie.split("; ").some(c => c.startsWith(`${name}=`));
    if (has) {
      // clear it
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
    return has;
  } catch {
    return false;
  }
}

export default function FireworksOnce() {
  const [show, setShow] = useState(false);
  const ref = useRef<FireworksHandle>(null);

  // Decide whether to show exactly once after login
  useEffect(() => {
    let shouldShow = false;
    try {
      if (sessionStorage.getItem("celebrateLoginOnce") === "1") {
        sessionStorage.removeItem("celebrateLoginOnce");
        shouldShow = true;
      }
    } catch {/* ignore */}

    // Fallback for SSR redirects: look for a one-time cookie set by the server
    if (!shouldShow) {
      shouldShow = popCookie("flash_fx_login");
    }

    if (shouldShow) setShow(true);
  }, []);

  // Run a short fireworks sequence, then hide
  useEffect(() => {
    if (!show) return;
    ref.current?.burstCenter(90);
    const t1 = setTimeout(() => ref.current?.burstCenter(70), 250);
    const t2 = setTimeout(() => setShow(false), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show]);

  if (!show) return null;
  return <Fireworks ref={ref} zIndex={80} />;
}
