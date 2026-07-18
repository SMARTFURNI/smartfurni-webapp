"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  EllipsisVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from "lucide-react";
import styles from "./SmartBedInstallPrompt.module.css";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const DISMISS_KEY = "sf-bed-install-dismissed-at";
const DISMISS_COOLDOWN = 3 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function getPlatform() {
  const userAgent = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

function trackEvent(eventType: string, platform: string) {
  void fetch("/api/bed/app-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, platform, source: "qr" }),
    keepalive: true,
  });
}

export default function SmartBedInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const trackedShown = useRef(false);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);

    const currentPlatform = getPlatform();
    setPlatform(currentPlatform);
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("install") === "1" || params.get("source") === "qr";
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    const coolingDown = Date.now() - dismissedAt < DISMISS_COOLDOWN;

    if (!isStandalone() && requested && !coolingDown) {
      const timer = window.setTimeout(() => setVisible(true), 650);
      window.history.replaceState(window.history.state, "", "/dashboard");
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  }, []);

  useEffect(() => {
    if (!visible || trackedShown.current) return;
    trackedShown.current = true;
    trackEvent("install_prompt_shown", platform);
  }, [platform, visible]);

  useEffect(() => {
    const installed = () => {
      trackEvent("installed", getPlatform());
      window.localStorage.removeItem(DISMISS_KEY);
      setVisible(false);
    };
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    trackEvent("install_dismissed", platform);
    setVisible(false);
  };

  const install = async () => {
    trackEvent("install_click", platform);
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={dismiss}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="bed-install-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Đóng hướng dẫn cài đặt"><X size={18} /></button>
        <span className={styles.icon}><Smartphone size={27} /></span>
        <span className={styles.kicker}>SMARTFURNI BED CONTROL</span>
        <h2 id="bed-install-title">Ghim ứng dụng lên màn hình chính</h2>
        <p>Mở ứng dụng điều khiển nhanh hơn, toàn màn hình và vẫn giữ phiên đăng nhập trên thiết bị này.</p>

        {platform === "ios" ? (
          <ol className={styles.steps}>
            <li><span><Share size={18} /></span><div><b>Chạm nút Chia sẻ</b><small>Trong thanh công cụ của Chrome hoặc Safari.</small></div></li>
            <li><span><PlusSquare size={18} /></span><div><b>Chọn “Thêm vào Màn hình chính”</b><small>Nếu chưa thấy, kéo danh sách thao tác xuống dưới.</small></div></li>
            <li><span><Check size={18} /></span><div><b>Chạm “Thêm”</b><small>Biểu tượng SmartFurni sẽ xuất hiện như một ứng dụng.</small></div></li>
          </ol>
        ) : deferredPrompt ? (
          <div className={styles.nativeInstall}>
            <Download size={22} />
            <div><b>Thiết bị đã sẵn sàng cài đặt</b><small>Không cần tải tệp APK và không làm mất dữ liệu đăng nhập.</small></div>
          </div>
        ) : (
          <ol className={styles.steps}>
            <li><span><EllipsisVertical size={18} /></span><div><b>Mở menu trình duyệt</b><small>Chạm biểu tượng ba chấm trên Chrome.</small></div></li>
            <li><span><Download size={18} /></span><div><b>Chọn “Cài đặt ứng dụng”</b><small>Hoặc “Thêm vào màn hình chính” tùy thiết bị.</small></div></li>
          </ol>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.later} onClick={dismiss}>Để sau</button>
          {platform !== "ios" && deferredPrompt && <button type="button" className={styles.primary} onClick={() => void install()}><Download size={17} /> Cài ứng dụng</button>}
          {platform === "ios" && <button type="button" className={styles.primary} onClick={() => { trackEvent("install_click", platform); setVisible(false); }}><Check size={17} /> Tôi đã hiểu</button>}
        </div>
      </section>
    </div>
  );
}
