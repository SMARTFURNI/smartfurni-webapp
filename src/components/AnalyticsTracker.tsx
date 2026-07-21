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

const ATTRIBUTION_KEY = "_sf_attribution";
const INTERNAL_PATHS = ["/admin", "/api", "/crm", "/dashboard", "/smart-bed", "/choose-module"];

type Attribution = {
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  gclid: string;
  fbclid: string;
  ttclid: string;
  msclkid: string;
};

function isInternalPath(path: string): boolean {
  return INTERNAL_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function getAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const current: Attribution = {
    referrer: document.referrer || "",
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    utmTerm: params.get("utm_term") || "",
    utmContent: params.get("utm_content") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    ttclid: params.get("ttclid") || "",
    msclkid: params.get("msclkid") || "",
  };
  const hasCampaignSignal = Object.entries(current).some(([key, value]) => key !== "referrer" && Boolean(value));

  try {
    const stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "null") as Attribution | null;
    if (!hasCampaignSignal && stored) return stored;
  } catch {
    // A malformed browser value must never block analytics.
  }

  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
  return current;
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
  const safePathname = pathname || "";
  const prevPathRef = useRef<string>("");
  const prevFullUrlRef = useRef<string>("");
  const enterTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>("");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOfflineRef = useRef<boolean>(false);
  const trackedKeyRef = useRef<string>("");

  // Init session ID
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  // Track page navigation
  useEffect(() => {
    if (isInternalPath(safePathname)) return;

    const search = typeof window !== "undefined" ? window.location.search : "";
    const currentPath = search ? `${safePathname}${search}` : safePathname;
    const currentFullUrl = typeof window !== "undefined" ? window.location.href : currentPath;
    if (trackedKeyRef.current === currentPath) return;
    trackedKeyRef.current = currentPath;
    const attribution = getAttribution();

    const sessionId = sessionIdRef.current || getOrCreateSessionId();
    sessionIdRef.current = sessionId;
    isOfflineRef.current = false;

    const now = Date.now();
    const prevPath = prevPathRef.current;
    const prevDuration = prevPath && enterTimeRef.current > 0
      ? Math.round((now - enterTimeRef.current) / 1000)
      : 0;
    const referrer = attribution.referrer;

    // Track session journey
    fetch("/api/analytics/track-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        sessionId,
        path: currentPath,
        fullUrl: currentFullUrl,
        title: document.title || currentPath,
        referrerUrl: referrer,
        ...attribution,
        ua: navigator.userAgent,
        prevPath: prevDuration > 0 ? prevPath : undefined,
        prevFullUrl: prevDuration > 0 ? prevFullUrlRef.current : undefined,
        prevDuration: prevDuration > 0 ? prevDuration : undefined,
      }),
    }).catch(() => {});

    // Track aggregate analytics
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: currentPath,
        fullUrl: currentFullUrl,
        sessionId,
        ...attribution,
      }),
    }).catch(() => {});

    prevPathRef.current = currentPath;
    prevFullUrlRef.current = currentFullUrl;
    enterTimeRef.current = now;
  }, [safePathname]);

  // Heartbeat mỗi 5 giây — cập nhật URL hiện tại và last_seen_at
  useEffect(() => {
    if (isInternalPath(safePathname)) return;

    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(() => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || isOfflineRef.current) return;
      fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          currentPath: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : safePathname,
          currentFullUrl: typeof window !== "undefined" ? window.location.href : safePathname,
          currentTitle: document.title,
          action: "heartbeat",
        }),
      }).catch(() => {});
    }, 5000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [safePathname]);

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
