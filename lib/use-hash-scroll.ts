"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const NAVBAR_HEIGHT = 96; // px — matches nav h-20 (80px) + comfortable gap

function scrollToHash(hash: string) {
  if (!hash) return;
  const id = decodeURIComponent(hash.replace("#", ""));
  const el = document.getElementById(id);
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

/**
 * Handles two scenarios:
 * 1. Page load with hash in URL (e.g. navigate from /diskusi → /#faq)
 *    → waits for DOM, then scrolls with navbar offset
 * 2. Same-page hash link click (e.g. clicking "Fitur" while already on /)
 *    → intercepts native anchor clicks, applies offset
 */
export function useHashScroll() {
  const pathname = usePathname();

  // Scenario 1: scroll on load/navigation when hash is present
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // Small delay to let dynamic sections finish rendering
    const timer = setTimeout(() => scrollToHash(hash), 120);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Scenario 2: intercept anchor clicks on the same page
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";

      // Only handle same-page hash links: "/#section" or "#section"
      const isSamePage =
        href.startsWith("#") ||
        href === `/${window.location.hash}` ||
        (href.startsWith("/#") && (window.location.pathname === "/" || href.startsWith(window.location.pathname + "#")));

      if (!isSamePage) return;

      const hash = href.includes("#") ? "#" + href.split("#")[1] : href;
      const el = document.getElementById(decodeURIComponent(hash.replace("#", "")));
      if (!el) return;

      e.preventDefault();
      scrollToHash(hash);
      // Update URL without triggering scroll
      history.pushState(null, "", href.startsWith("/") ? href : `/${href}`);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}
