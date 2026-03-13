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

function sendBeacon(url: string, data: object) {
  const body = JSON.stringify(data);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>("");
  const enterTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>("");

  // Initialize session ID once on mount
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  // Track page navigation
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    const now = Date.now();
    const prevPath = prevPathRef.current;
    const prevDuration =
      prevPath && enterTimeRef.current > 0
        ? Math.round((now - enterTimeRef.current) / 1000)
        : 0;

    const referrer = prevPath ? "" : document.referrer || "";

    // Track session journey (new system)
    fetch("/api/analytics/track-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        sessionId,
        path: pathname,
        title: document.title || pathname,
        referrer,
        prevPath: prevDuration > 0 ? prevPath : undefined,
        prevDuration: prevDuration > 0 ? prevDuration : undefined,
      }),
    }).catch(() => {});

    // Track aggregate analytics (existing system)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer, sessionId }),
    }).catch(() => {});

    prevPathRef.current = pathname;
    enterTimeRef.current = now;
  }, [pathname]);

  // Send final duration when user leaves
  useEffect(() => {
    const handleUnload = () => {
      const sessionId = sessionIdRef.current;
      const path = prevPathRef.current;
      const enterTime = enterTimeRef.current;
      if (!sessionId || !path || !enterTime) return;
      const duration = Math.round((Date.now() - enterTime) / 1000);
      if (duration <= 0) return;
      sendBeacon("/api/analytics/track-session", {
        type: "duration",
        sessionId,
        path,
        duration,
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") handleUnload();
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
