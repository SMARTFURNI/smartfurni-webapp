"use client";

export type PushPermissionState = "unsupported" | "default" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  if (await registration.pushManager.getSubscription()) return "subscribed";
  return Notification.permission === "default" ? "default" : "unsubscribed";
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Thiết bị hoặc trình duyệt này chưa hỗ trợ thông báo ứng dụng.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bạn chưa cho phép SmartFurni gửi thông báo.");
  const keyResponse = await fetch("/api/pwa/push", { cache: "no-store", credentials: "include" });
  const keyData = await keyResponse.json() as { publicKey?: string; error?: string };
  if (!keyResponse.ok || !keyData.publicKey) throw new Error(keyData.error || "Chưa lấy được khóa thông báo.");

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });
  const response = await fetch("/api/pwa/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!response.ok) throw new Error("Chưa lưu được đăng ký thông báo.");
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await fetch("/api/pwa/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
