"use client";

export interface FirmwareReleaseClient {
  id: string;
  profileId: string;
  version: string;
  packageUrl: string;
  sha256: string;
  notes: string;
  mandatory: boolean;
  releasedAt: string;
}

export interface FirmwareCheckResult {
  configured: boolean;
  currentVersion: string;
  updateAvailable: boolean;
  release: FirmwareReleaseClient | null;
}

export async function checkFirmwareUpdate(profileId: string, currentVersion: string) {
  const query = new URLSearchParams({ profileId, currentVersion });
  const response = await fetch(`/api/bed/firmware?${query}`, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("Không thể kiểm tra firmware lúc này.");
  return response.json() as Promise<FirmwareCheckResult>;
}

export async function registerFirmwareBackgroundCheck(profileId: string, currentVersion: string) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  (navigator.serviceWorker.controller || registration.active)?.postMessage({
    type: "REGISTER_FIRMWARE_CHECK",
    config: { profileId, currentVersion },
  });

  const periodicRegistration = registration as ServiceWorkerRegistration & {
    periodicSync?: { register(tag: string, options: { minInterval: number }): Promise<void> };
  };
  try {
    await periodicRegistration.periodicSync?.register("smartfurni-firmware-check", {
      minInterval: 12 * 60 * 60 * 1000,
    });
  } catch {
    // iOS does not expose Periodic Background Sync; foreground/online checks remain active.
  }
}

export async function requestFirmwareDownload(release: FirmwareReleaseClient) {
  if (!("serviceWorker" in navigator)) throw new Error("Service worker chưa sẵn sàng.");
  const registration = await navigator.serviceWorker.ready;
  (navigator.serviceWorker.controller || registration.active)?.postMessage({
    type: "DOWNLOAD_FIRMWARE",
    release,
  });
}
