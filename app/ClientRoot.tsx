// app/ClientRoot.tsx
"use client";

import React, { useEffect } from "react";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

/**
 * ClientRoot: client-side wrapper.
 * - neutralizes top-bar "Quick Lead" / "Detailed Lead" buttons safely (no node removals).
 * - logs all actions in console for verification.
 */
export default function ClientRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const phrases = ["quick lead", "detailed lead", "create lead", "create a lead"];
    const norm = (s: any) => String(s || "").trim().toLowerCase();

    // Non-destructive neutralize function:
    function neutralizeElement(el: HTMLElement) {
      try {
        // keep original attrs so it's reversible / auditable
        if (!el.hasAttribute("data-srclb-snapshot")) {
          const snapshot = {
            ariaHidden: el.getAttribute("aria-hidden"),
            tabindex: el.getAttribute("tabindex"),
            style: el.getAttribute("style") || "",
          };
          el.setAttribute("data-srclb-snapshot", JSON.stringify(snapshot));
        }

        // apply neutralization
        el.setAttribute("aria-hidden", "true");
        el.setAttribute("tabindex", "-1");
        el.style.pointerEvents = "none";
        el.style.opacity = "0";
        el.style.userSelect = "none";
        el.style.touchAction = "none";
        el.setAttribute("data-srclb-neutralized", "1");
        console.info("[srclb] neutralized:", el.tagName, `"${(el.innerText||el.textContent||'').trim()}"`, el);
      } catch (e) {
        // swallow errors to avoid breaking app
        console.warn("[srclb] neutralize failed", e);
      }
    }

    function shouldNeutralize(el: HTMLElement) {
      try {
        // don't touch inside forms
        if (el.closest("form")) return false;

        // only interactive-ish elements
        if (!/^(BUTTON|A)$/.test(el.tagName) && !el.getAttribute("role")) return false;

        const txt = norm(el.innerText || el.textContent || "");
        if (!txt) return false;
        if (!phrases.some(p => txt.includes(p))) return false;

        const rect = el.getBoundingClientRect();
        // restrict to header/top region (adjust if your header is taller)
        if (isNaN(rect.top) || rect.top > 260) return false;

        // avoid giant elements
        if (rect.height > 140 && rect.width > window.innerWidth * 0.8) return false;

        const cs = window.getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;

        return true;
      } catch {
        return false;
      }
    }

    // run scan and neutralize; returns number neutralized
    function scanOnce() {
      let count = 0;
      try {
        const candidates = Array.from(document.querySelectorAll("button, a, [role='button']")) as HTMLElement[];
        for (const el of candidates) {
          if (shouldNeutralize(el)) {
            // neutralize safely
            neutralizeElement(el);
            count++;
          }
        }
      } catch (e) {
        console.warn("[srclb] scan failed", e);
      }
      return count;
    }

    // run a few times (cover rehydration)
    let attempts = 0;
    const maxAttempts = 6;
    const interval = setInterval(() => {
      attempts++;
      const got = scanOnce();
      if (got > 0) {
        console.info(`[srclb] neutralized ${got} element(s) on attempt ${attempts}`);
      } else {
        console.info(`[srclb] scan attempt ${attempts}: nothing to neutralize`);
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 600);

    // as a safety, also run immediately once
    scanOnce();

    // cleanup on unmount: restore previous attributes/styles
    return () => {
      try {
        const neutralized = Array.from(document.querySelectorAll("[data-srclb-neutralized]")) as HTMLElement[];
        for (const el of neutralized) {
          try {
            const snap = el.getAttribute("data-srclb-snapshot");
            if (snap) {
              const obj = JSON.parse(snap);
              if (obj.ariaHidden == null || obj.ariaHidden === "null" || obj.ariaHidden === "undefined") el.removeAttribute("aria-hidden");
              else el.setAttribute("aria-hidden", obj.ariaHidden);
              if (obj.tabindex == null || obj.tabindex === "null" || obj.tabindex === "undefined") el.removeAttribute("tabindex");
              else el.setAttribute("tabindex", obj.tabindex);
              if (typeof obj.style === "string") el.setAttribute("style", obj.style);
              else el.removeAttribute("style");
            } else {
              // fallback: just un-neutralize conservatively
              el.removeAttribute("aria-hidden");
              el.removeAttribute("tabindex");
              el.style.pointerEvents = "";
              el.style.opacity = "";
              el.style.userSelect = "";
              el.style.touchAction = "";
            }
            el.removeAttribute("data-srclb-neutralized");
            el.removeAttribute("data-srclb-snapshot");
          } catch {}
        }
      } catch {}
    };
  }, []);

  return (
    <>
      <Providers>{children}</Providers>
      <Toaster />
    </>
  );
}
