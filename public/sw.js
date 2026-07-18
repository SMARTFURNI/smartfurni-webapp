/* SmartFurni shared service worker
 * - Static assets: stale-while-revalidate
 * - Public pages and smart-bed shell: network-first with offline fallback
 * - CRM/Admin/API/auth/payment data: never cached
 */

const VERSION = "2026-07-19-1";
const STATIC_CACHE = `smartfurni-static-${VERSION}`;
const MEDIA_CACHE = `smartfurni-media-${VERSION}`;
const PAGE_CACHE = `smartfurni-pages-${VERSION}`;
// Keep verified packages across service-worker UI/cache revisions. Firmware
// release metadata controls replacement, so a site deploy cannot discard a
// package while a physical device is waiting to install it.
const FIRMWARE_CACHE = "smartfurni-firmware-packages-v1";
const CACHE_PREFIX = "smartfurni-";
const PWA_DB = "smartfurni-pwa";
const PWA_DB_VERSION = 1;
const QUEUE_STORE = "requestQueue";
const CONFIG_STORE = "config";
const BACKGROUND_SYNC_TAG = "smartfurni-background-sync";
const FIRMWARE_SYNC_TAG = "smartfurni-firmware-check";

const PRECACHE_URLS = [
  "/smartfurni-favicon-v4.png",
  "/smartfurni-favicon-v4-32.png",
  "/smartfurni-logo.png",
  "/manifest.webmanifest",
  "/smart-bed-manifest.webmanifest",
  "/crm-manifest.webmanifest",
  "/admin-manifest.webmanifest",
];

const PRIVATE_OR_TRANSACTIONAL_PATHS = [
  "/admin",
  "/crm",
  "/crm-login",
  "/api",
  "/checkout",
  "/orders",
  "/cart",
  "/smart-bed/login",
];

const OFFLINE_HTML = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0B111B">
  <title>Đang ngoại tuyến | SmartFurni</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;color:#f5edd6;background:radial-gradient(circle at 10% 10%,#172238 0,transparent 42%),radial-gradient(circle at 90% 90%,#3b2b0d 0,transparent 40%),#0b111b}
    main{width:min(100%,460px);padding:32px 24px;text-align:center;border:1px solid rgba(215,185,87,.25);border-radius:28px;background:linear-gradient(145deg,rgba(23,31,46,.96),rgba(35,27,15,.94));box-shadow:0 24px 80px rgba(0,0,0,.42)}
    img{width:86px;height:86px;object-fit:contain;border-radius:22px}h1{margin:22px 0 10px;font-size:26px}p{margin:0 auto 24px;max-width:360px;color:rgba(245,237,214,.62);line-height:1.65}button{min-height:48px;padding:0 24px;border:0;border-radius:15px;font-weight:750;font-size:15px;color:#171105;background:linear-gradient(135deg,#eed366,#c99a28);box-shadow:0 10px 28px rgba(201,154,40,.2)}
    small{display:block;margin-top:18px;color:rgba(245,237,214,.35)}
  </style>
</head>
<body>
  <main>
    <img src="/smartfurni-favicon-v4.png" alt="SmartFurni">
    <h1>Không có kết nối mạng</h1>
    <p>Giao diện SmartFurni vẫn được giữ trên thiết bị. Hãy kết nối Wi-Fi hoặc dữ liệu di động để đồng bộ thông tin mới nhất.</p>
    <button type="button" onclick="location.reload()">Thử kết nối lại</button>
    <small>Dữ liệu quản trị và tài khoản không được lưu ngoại tuyến để bảo đảm an toàn.</small>
  </main>
</body>
</html>`;

function isPrivateOrTransactional(pathname) {
  return PRIVATE_OR_TRANSACTIONAL_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function canStore(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const cacheControl = response.headers.get("cache-control") || "";
  return !/no-store|private/i.test(cacheControl) && !response.headers.has("set-cookie");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess > 0) {
    await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
  }
}

async function putSafe(cacheName, request, response, maxEntries) {
  if (!canStore(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cacheName, maxEntries);
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await putSafe(cacheName, request, response, maxEntries);
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const cacheKey = new Request(`${url.origin}${url.pathname}`, {
    method: "GET",
    headers: { accept: "text/html" },
  });

  try {
    const response = await fetch(request);
    await putSafe(PAGE_CACHE, cacheKey, response, 24);
    return response;
  } catch {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

function openPwaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PWA_DB, PWA_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        database.createObjectStore(QUEUE_STORE, { keyPath: "dedupeKey" });
      }
      if (!database.objectStoreNames.contains(CONFIG_STORE)) {
        database.createObjectStore(CONFIG_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeRecord(storeName, value) {
  const database = await openPwaDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function readRecord(storeName, key) {
  const database = await openPwaDb();
  const value = await new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

async function readAllRecords(storeName) {
  const database = await openPwaDb();
  const values = await new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return values;
}

async function deleteRecord(storeName, key) {
  const database = await openPwaDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function queueBackgroundRequest(request) {
  const pathname = new URL(request.url, self.location.origin).pathname;
  if (!["/api/bed/devices", "/api/bed/install"].includes(pathname)) return;
  await writeRecord(QUEUE_STORE, { ...request, queuedAt: Date.now() });
  try {
    await self.registration.sync.register(BACKGROUND_SYNC_TAG);
  } catch {
    // Background Sync is optional on iOS; the client also flushes on `online`.
  }
}

async function processBackgroundQueue() {
  const records = await readAllRecords(QUEUE_STORE);
  for (const record of records) {
    try {
      const response = await fetch(record.url, {
        method: record.method,
        headers: record.headers,
        body: record.body,
        credentials: "include",
        cache: "no-store",
      });
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        await deleteRecord(QUEUE_STORE, record.dedupeKey);
      }
    } catch {
      // Keep the request for the next connectivity event.
    }
  }
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function downloadFirmwareRelease(release, notify = true) {
  if (!release?.id || !release.packageUrl) return false;
  if (!/^[a-f0-9]{64}$/i.test(release.sha256 || "")) {
    throw new Error("Firmware checksum is required");
  }
  const response = await fetch(release.packageUrl, { cache: "no-store" });
  if (!response.ok || response.type === "opaque") throw new Error("Firmware download failed");
  const buffer = await response.clone().arrayBuffer();
  if ((await sha256Hex(buffer)) !== release.sha256.toLowerCase()) {
    throw new Error("Firmware checksum mismatch");
  }
  const cache = await caches.open(FIRMWARE_CACHE);
  await cache.put(`/__smartfurni-firmware/${encodeURIComponent(release.id)}`, new Response(buffer, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "X-SmartFurni-Firmware-Version": release.version,
      "X-SmartFurni-Firmware-Sha256": release.sha256 || "",
    },
  }));
  await writeRecord(CONFIG_STORE, { key: "firmware-ready", release, downloadedAt: Date.now() });
  if (notify) {
    try {
      await self.registration.showNotification("Firmware SmartFurni đã tải xong", {
        body: `Phiên bản ${release.version} sẵn sàng. Mở ứng dụng và kết nối giường để xác nhận cài đặt.`,
        icon: "/smartfurni-favicon-v4.png",
        badge: "/smartfurni-favicon-v4-32.png",
        tag: `firmware-ready-${release.id}`,
        data: { url: "/dashboard?firmware=ready", releaseId: release.id },
      });
    } catch {
      // The verified package stays cached when notification permission is off.
    }
  }
  return true;
}

async function checkFirmwareInBackground() {
  const saved = await readRecord(CONFIG_STORE, "firmware-check");
  if (!saved?.profileId) return;
  const params = new URLSearchParams({
    profileId: saved.profileId,
    currentVersion: saved.currentVersion || "",
  });
  const response = await fetch(`/api/bed/firmware?${params}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) return;
  const result = await response.json();
  if (result.updateAvailable && result.release?.packageUrl) {
    await downloadFirmwareRelease(result.release, true);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.allSettled(
      PRECACHE_URLS.map(async (url) => {
        const response = await fetch(url, { cache: "reload" });
        if (canStore(response)) {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(url, response);
        }
      })
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, MEDIA_CACHE, PAGE_CACHE, FIRMWARE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_RUNTIME_CACHES") {
    event.waitUntil(Promise.all([caches.delete(MEDIA_CACHE), caches.delete(PAGE_CACHE)]));
  }
  if (event.data?.type === "QUEUE_BACKGROUND_REQUEST" && event.data.request) {
    event.waitUntil(queueBackgroundRequest(event.data.request));
  }
  if (event.data?.type === "PROCESS_SYNC_QUEUE") {
    event.waitUntil(processBackgroundQueue());
  }
  if (event.data?.type === "REGISTER_FIRMWARE_CHECK" && event.data.config?.profileId) {
    event.waitUntil(
      writeRecord(CONFIG_STORE, { key: "firmware-check", ...event.data.config, updatedAt: Date.now() })
        .then(() => checkFirmwareInBackground())
    );
  }
  if (event.data?.type === "DOWNLOAD_FIRMWARE" && event.data.release) {
    event.waitUntil(downloadFirmwareRelease(event.data.release, true));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) event.waitUntil(processBackgroundQueue());
  if (event.tag === FIRMWARE_SYNC_TAG) event.waitUntil(checkFirmwareInBackground());
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === FIRMWARE_SYNC_TAG) event.waitUntil(checkFirmwareInBackground());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "Bạn có cập nhật mới từ SmartFurni." };
  }
  const tasks = [self.registration.showNotification(payload.title || "SmartFurni", {
    body: payload.body || "Bạn có cập nhật mới.",
    icon: "/smartfurni-favicon-v4.png",
    badge: "/smartfurni-favicon-v4-32.png",
    tag: payload.tag || "smartfurni-update",
    renotify: Boolean(payload.renotify),
    data: { ...(payload.data || {}), url: payload.url || payload.data?.url || "/" },
  })];
  if (payload.data?.type === "firmware-available") {
    tasks.push(checkFirmwareInBackground());
  }
  event.waitUntil(Promise.allSettled(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => client.url === targetUrl || new URL(client.url).pathname === new URL(targetUrl).pathname);
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(targetUrl);
      return;
    }
    await self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Streaming/range requests should always go directly to the network.
  if (request.headers.has("range") || ["audio", "video"].includes(request.destination)) return;

  if (request.mode === "navigate") {
    if (isPrivateOrTransactional(url.pathname)) {
      event.respondWith(
        fetch(request).catch(() => new Response(OFFLINE_HTML, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        }))
      );
    } else {
      event.respondWith(networkFirstPage(request));
    }
    return;
  }

  if (url.pathname.startsWith("/api/") || isPrivateOrTransactional(url.pathname)) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    ["script", "style", "font", "worker"].includes(request.destination)
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, 160));
    return;
  }

  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE, 120));
    return;
  }

  if (url.pathname.endsWith(".webmanifest") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, 160));
  }
});
