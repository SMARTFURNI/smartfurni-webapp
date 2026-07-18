"use client";

const SAFE_BACKGROUND_PATHS = new Set([
  "/api/bed/devices",
  "/api/bed/install",
]);

export interface BackgroundSyncRequest {
  url: string;
  method: "POST" | "PATCH";
  headers: Record<string, string>;
  body: string;
  dedupeKey: string;
}

async function queueRequest(request: BackgroundSyncRequest) {
  if (!SAFE_BACKGROUND_PATHS.has(new URL(request.url, window.location.origin).pathname)) return false;
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller || registration.active;
  if (!worker) return false;
  worker.postMessage({ type: "QUEUE_BACKGROUND_REQUEST", request });
  return true;
}

/** Send immediately; on network/server interruption, persist a safe request for later retry. */
export async function sendWithBackgroundSync(
  url: string,
  init: RequestInit & { method: "POST" | "PATCH" },
  dedupeKey: string,
) {
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  const body = typeof init.body === "string" ? init.body : "";
  try {
    const response = await fetch(url, { ...init, credentials: "include" });
    if (response.ok || (response.status >= 400 && response.status < 500)) return response;
  } catch {
    // The request is persisted below and retried when connectivity returns.
  }
  await queueRequest({ url, method: init.method, headers, body, dedupeKey });
  return null;
}

export async function requestBackgroundQueueFlush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  (navigator.serviceWorker.controller || registration.active)?.postMessage({ type: "PROCESS_SYNC_QUEUE" });
}
