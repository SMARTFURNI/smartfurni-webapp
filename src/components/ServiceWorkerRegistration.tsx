"use client";

import { useEffect } from "react";
import { requestBackgroundQueueFlush } from "@/lib/pwa-background-sync";

const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

/** Register the shared PWA worker and quietly check for new deployments. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;
    let intervalId: number | undefined;

    const checkForUpdate = () => {
      if (navigator.onLine) {
        void registration?.update().catch(() => undefined);
        void requestBackgroundQueueFlush();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((currentRegistration) => {
        registration = currentRegistration;
        checkForUpdate();
        intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

        currentRegistration.addEventListener("updatefound", () => {
          const installing = currentRegistration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        console.warn("[SmartFurni PWA] Không thể đăng ký service worker", error);
      });

    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
