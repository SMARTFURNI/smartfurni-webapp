"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("_sf_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_sf_sid", sid);
  }
  return sid;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const sessionId = getOrCreateSessionId();
    const referrer = document.referrer || "";

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer, sessionId }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
