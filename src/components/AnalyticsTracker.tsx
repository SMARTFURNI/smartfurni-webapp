"use client";
/**
 * AnalyticsTracker
 * - Tracks page views và session journeys
 * - Heartbeat mỗi 5 giây: cập nhật URL hiện tại, giữ session alive
 * - Beacon khi unload/visibilitychange=hidden: đánh dấu offline NGAY LẬP TỨC
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("_sf_sid");
  if (!sid) {
    sid = "s" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_sf_sid", sid);
  }
  return sid;
}

function sendBeaconData(url: string, data: object) {
  const body = JSON.stringify(data);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
  } else {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>("");
  const enterTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>("");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOfflineRef = useRef<boolean>(false);

  // Init session ID
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  // Track page navigation
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;
    isOfflineRef.current = false;

    const now = Date.now();
    const prevPath = prevPathRef.current;
    const prevDuration = prevPath && enterTimeRef.current > 0
      ? Math.round((now - enterTimeRef.current) / 1000)
      : 0;
    const referrer = prevPath ? "" : document.referrer || "";

    // Track session journey
    fetch("/api/analytics/track-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        sessionId,
        path: pathname,
        title: document.title || pathname,
        referrer,
        ua: navigator.userAgent,
        prevPath: prevDuration > 0 ? prevPath : undefined,
        prevDuration: prevDuration > 0 ? prevDuration : undefined,
      }),
    }).catch(() => {});

    // Track aggregate analytics
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer, sessionId }),
    }).catch(() => {});

    prevPathRef.current = pathname;
    enterTimeRef.current = now;
  }, [pathname]);

  // Heartbeat mỗi 5 giây — cập nhật URL hiện tại và last_seen_at
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || isOfflineRef.current) return;
      fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          currentPath: pathname,
          currentTitle: document.title,
          action: "heartbeat",
        }),
      }).catch(() => {});
    }, 5000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [pathname]);

  // Offline detection — gửi beacon NGAY KHI thoát
  useEffect(() => {
    const markOffline = () => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || isOfflineRef.current) return;
      isOfflineRef.current = true;

      // Gửi duration của trang hiện tại
      const path = prevPathRef.current;
      const enterTime = enterTimeRef.current;
      if (path && enterTime > 0) {
        const duration = Math.round((Date.now() - enterTime) / 1000);
        if (duration > 0) {
          sendBeaconData("/api/analytics/track-session", {
            type: "duration",
            sessionId,
            path,
            duration,
          });
        }
      }

      // Đánh dấu offline ngay lập tức
      sendBeaconData("/api/analytics/heartbeat", {
        sessionId,
        currentPath: prevPathRef.current,
        action: "offline",
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") markOffline();
      else {
        // Khách quay lại tab — reset offline flag và gửi heartbeat
        isOfflineRef.current = false;
      }
    };

    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
