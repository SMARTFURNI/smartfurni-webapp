"use client";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { BellRing, CircleHelp, LoaderCircle, LockKeyhole, Mail, PlugZap, Send, UserRound } from "lucide-react";

interface SettingSection {
  id: string;
  title: string;
  icon: LucideIcon;
}

const SECTIONS: SettingSection[] = [
  { id: "account", title: "Tài khoản", icon: UserRound },
  { id: "email", title: "Email thông báo", icon: Mail },
  { id: "push", title: "Thông báo PWA", icon: BellRing },
  { id: "integrations", title: "Tích hợp hệ thống", icon: PlugZap },
  { id: "security", title: "Bảo mật", icon: LockKeyhole },
];

type SystemStatus = Record<"database" | "railwayMedia" | "githubMedia" | "resend" | "smtp" | "zalo" | "sessionSecret", boolean>;
type PushTestResult = {
  ok: boolean;
  message: string;
  matched?: number;
  sent?: number;
  removed?: number;
  failed?: number;
};
type MediaMigrationResult = {
  ok: boolean;
  uploadedFiles: number;
  uploadedBytes: number;
  totalFiles: number;
  preservedLegacyUrls: boolean;
  databaseChanged: boolean;
  githubFilesDeleted: boolean;
  failures?: string[];
};

export default function AdminSettingsClient() {
  const [activeSection, setActiveSection] = useState("account");
  const [saved, setSaved] = useState(false);
  // Admin profile state
  const [displayName, setDisplayName] = useState("Admin");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  useEffect(() => {
    fetch("/api/admin/change-password")
      .then(r => r.json())
      .then(d => { if (d.displayName) setDisplayName(d.displayName); })
      .catch(() => {});
  }, []);

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  // Email SMTP settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [adminPushSubscriptions, setAdminPushSubscriptions] = useState<number | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [pushTestResult, setPushTestResult] = useState<PushTestResult | null>(null);
  const [migratingMedia, setMigratingMedia] = useState(false);
  const [mediaMigrationResult, setMediaMigrationResult] = useState<MediaMigrationResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/email-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setSmtpHost(d.smtpHost || "");
        setSmtpPort(d.smtpPort || "587");
        setSmtpUser(d.smtpUser || "");
        setSmtpPass(d.smtpPass || "");
        setAdminEmail(d.adminEmail || "");
        setEmailEnabled(Boolean(d.enabled));
      })
      .catch(() => {});
    fetch("/api/admin/system-status")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setSystemStatus(d); })
      .catch(() => {});
    fetch("/api/pwa/push/send?ownerScope=admin&ownerId=admin", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && typeof d.subscriptions === "number") {
          setAdminPushSubscriptions(d.subscriptions);
        }
      })
      .catch(() => {});
  }, []);

  async function handleTestPush() {
    setTestingPush(true);
    setPushTestResult(null);
    try {
      const sentAt = new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date());
      const response = await fetch("/api/pwa/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerScope: "admin",
          ownerId: "admin",
          title: "Kiểm tra thông báo PWA Admin",
          body: `Đây là thông báo thử từ SmartFurni lúc ${sentAt}.`,
          url: "/admin/settings",
          tag: `admin-pwa-test-${Date.now()}`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể gửi thông báo thử.");
      setAdminPushSubscriptions(Number(result.matched || 0));
      setPushTestResult({
        ok: Number(result.sent || 0) > 0,
        message: Number(result.sent || 0) > 0
          ? `Dịch vụ Web Push đã nhận ${result.sent}/${result.matched} thông báo.`
          : "Không có thiết bị admin nào nhận được thông báo.",
        matched: Number(result.matched || 0),
        sent: Number(result.sent || 0),
        removed: Number(result.removed || 0),
        failed: Number(result.failed || 0),
      });
    } catch (error) {
      setPushTestResult({
        ok: false,
        message: error instanceof Error ? error.message : "Không thể gửi thông báo thử.",
      });
    } finally {
      setTestingPush(false);
    }
  }

  async function handleMigrateLegacyMedia() {
    setMigratingMedia(true);
    setMediaMigrationResult(null);
    try {
      const response = await fetch("/api/admin/media-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy-and-verify-legacy" }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.failures?.[0] || "Không thể sao chép ảnh");
      }
      setMediaMigrationResult(result);
    } catch (error) {
      setMediaMigrationResult({
        ok: false,
        uploadedFiles: 0,
        uploadedBytes: 0,
        totalFiles: 0,
        preservedLegacyUrls: true,
        databaseChanged: false,
        githubFilesDeleted: false,
        failures: [error instanceof Error ? error.message : "Không thể sao chép ảnh"],
      });
    } finally {
      setMigratingMedia(false);
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", smtpHost, smtpPort, smtpUser, smtpPass, adminEmail }),
      });
      const data = await res.json();
      if (res.ok) setTestResult({ ok: true, msg: data.message || "Kết nối thành công!" });
      else setTestResult({ ok: false, msg: data.error || "Kết nối thất bại" });
    } catch {
      setTestResult({ ok: false, msg: "Lỗi kết nối" });
    } finally {
      setTestingEmail(false);
    }
  }

  async function handleSaveEmail() {
    setTestResult(null);
    try {
      const response = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpHost, smtpPort, smtpUser, smtpPass, adminEmail, enabled: emailEnabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể lưu cấu hình");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setTestResult({ ok: false, msg: error instanceof Error ? error.message : "Không thể lưu cấu hình" });
    }
  }

  // Account settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handleUpdateProfile() {
    if (!displayName.trim()) {
      setProfileMsg("Tên hiển thị không được để trống");
      return;
    }
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", displayName }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg("✓ " + (data.message || "Đã cập nhật"));
      } else {
        setProfileMsg("✗ " + (data.error || "Lỗi cập nhật"));
      }
    } catch {
      setProfileMsg("✗ Lỗi kết nối");
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(""), 3000);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới không khớp.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setPasswordError(data.error || "Đổi mật khẩu thất bại");
      }
    } catch {
      setPasswordError("Lỗi kết nối server");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cài Đặt</h1>
          <p className="text-[rgba(245,237,214,0.55)] text-sm mt-1">Quản lý cấu hình hệ thống</p>
        </div>
        {saved && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-xl">
            ✓ Đã lưu thay đổi
          </div>
        )}
      </div>

      <div className="admin-settings-workspace grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="admin-settings-nav bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-3 h-fit">
          {SECTIONS.map((section) => (
            (() => {
              const SectionIcon = section.icon;
              return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeSection === section.id
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[rgba(255,200,100,0.22)]"
                  : "text-[rgba(245,237,214,0.70)] hover:text-white hover:bg-white/5"
              }`}
            >
              <SectionIcon className="h-4 w-4" />
              <span>{section.title}</span>
            </button>
              );
            })()
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Account Section */}
          {activeSection === "account" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Thông Tin Tài Khoản</h2>

              <div className="flex items-center gap-4 p-4 bg-[#1a1200] rounded-xl">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center text-[#0D0B00] font-bold text-xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{displayName}</p>
                  <p className="text-[rgba(245,237,214,0.55)] text-sm">Quản trị viên</p>
                </div>
              </div>

              {/* Chỉnh sửa tên hiển thị */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Tên Hiển Thị</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="flex-1 bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                  />
                  <button
                    onClick={handleUpdateProfile}
                    disabled={profileSaving}
                    className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors disabled:opacity-50"
                  >
                    {profileSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
                {profileMsg && (
                  <p className={`text-xs ${profileMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{profileMsg}</p>
                )}
              </div>

              <div className="border-t border-[rgba(255,200,100,0.14)] pt-6">
                <h3 className="text-sm font-semibold text-white mb-4">Đổi Mật Khẩu</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-red-400 text-xs">{passwordError}</p>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={passwordSaving}
                    className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors disabled:opacity-50"
                  >
                    {passwordSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Section */}
          {activeSection === "email" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Cài Đặt Email Thông Báo</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setEmailEnabled(!emailEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors ${emailEnabled ? "bg-[#C9A84C]" : "bg-gray-700"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${emailEnabled ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                  <span className="text-sm text-[rgba(245,237,214,0.70)]">{emailEnabled ? "Đã bật" : "Đã tắt"}</span>
                </label>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-medium text-blue-400"><Mail className="h-4 w-4" />Cách hoạt động</p>
                <p className="text-[rgba(245,237,214,0.55)] text-xs leading-relaxed">
                  Form website được lưu vào CRM và ưu tiên gửi thông báo qua Resend. SMTP là kênh kiểm tra/gửi bổ sung khi bạn cần dùng máy chủ email riêng.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">SMTP Port</label>
                  <select
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                  >
                    <option value="587">587 (TLS - Khuyến nghị)</option>
                    <option value="465">465 (SSL)</option>
                    <option value="25">25 (Không mã hóa)</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Email đăng nhập SMTP</label>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="your@gmail.com"
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Mật khẩu SMTP / App Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Email nhận thông báo (Admin)</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@smartfurni.vn"
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
                <p className="text-xs text-[rgba(245,237,214,0.35)] mt-1">Email này sẽ nhận thông báo khi có liên hệ mới từ khách hàng</p>
              </div>

              {testResult && (
                <div className={`rounded-xl p-3 text-sm ${testResult.ok ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                  {testResult.ok ? "✓" : "✗"} {testResult.msg}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail || !smtpHost || !smtpUser}
                  className="border border-[rgba(255,200,100,0.30)] text-[#C9A84C] px-5 py-2 rounded-xl font-medium text-sm hover:bg-[#C9A84C]/10 transition-colors disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">
                    {testingEmail ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                    {testingEmail ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                  </span>
                </button>
                <button
                  onClick={handleSaveEmail}
                  className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors"
                >
                  Lưu cài đặt
                </button>
              </div>

              <div className="bg-[#1a1200] rounded-xl p-4 border border-[rgba(255,200,100,0.14)]">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[rgba(245,237,214,0.45)]"><CircleHelp className="h-4 w-4" />Hướng dẫn Gmail:</p>
                <ol className="text-xs text-[rgba(245,237,214,0.35)] space-y-1 list-decimal list-inside">
                  <li>Bật xác minh 2 bước trong tài khoản Google</li>
                  <li>Vào Google Account → Security → App passwords</li>
                  <li>Tạo App Password cho "Mail" và dán vào ô mật khẩu SMTP</li>
                  <li>Dùng smtp.gmail.com, port 587</li>
                </ol>
              </div>
            </div>
          )}

          {activeSection === "push" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Thông báo PWA Admin</h2>
                <p className="text-xs text-[rgba(245,237,214,0.55)] mt-1">
                  Gửi thông báo thử tới tất cả điện thoại và trình duyệt đang đăng ký bằng tài khoản admin.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(255,200,100,0.14)] bg-black/15 p-4">
                <div>
                  <p className="text-sm font-medium text-white">Thiết bị admin đã đăng ký</p>
                  <p className="mt-1 text-xs text-[rgba(245,237,214,0.50)]">
                    Subscription hết hạn sẽ tự được loại bỏ khi gửi thử.
                  </p>
                </div>
                <span className="min-w-10 rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-3 py-1.5 text-center text-sm font-bold text-[#E2C97E]">
                  {adminPushSubscriptions === null ? "…" : adminPushSubscriptions}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handleTestPush()}
                disabled={testingPush || adminPushSubscriptions === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-[#0D0B00] transition-colors hover:bg-[#E2C97E] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {testingPush ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {testingPush ? "Đang gửi…" : "Gửi thông báo thử"}
              </button>

              {pushTestResult && (
                <div className={`rounded-xl border p-4 text-sm ${
                  pushTestResult.ok
                    ? "border-green-500/30 bg-green-500/10 text-green-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}>
                  <p className="font-medium">{pushTestResult.ok ? "✓" : "✗"} {pushTestResult.message}</p>
                  {pushTestResult.matched !== undefined && (
                    <p className="mt-2 text-xs opacity-80">
                      Khớp: {pushTestResult.matched} · Gửi thành công: {pushTestResult.sent}
                      {" · "}Hết hạn đã xoá: {pushTestResult.removed} · Lỗi: {pushTestResult.failed}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Trạng thái tích hợp</h2>
                <p className="text-xs text-[rgba(245,237,214,0.55)] mt-1">Chỉ hiển thị trạng thái cấu hình, không công khai khóa bí mật.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["database", "PostgreSQL", "Dữ liệu sản phẩm, đơn hàng và cấu hình"],
                  ["railwayMedia", "Railway Media Bucket", "Kho ảnh và tệp chính của CRM"],
                  ["githubMedia", "GitHub Media (dự phòng)", "Chỉ dùng khi Railway Bucket chưa cấu hình"],
                  ["resend", "Resend", "Email thông báo khách hàng tiềm năng"],
                  ["smtp", "SMTP", "Kênh email dự phòng"],
                  ["zalo", "Zalo OA", "Thông báo và đồng bộ Zalo"],
                  ["sessionSecret", "Bảo mật phiên", "Khóa ký phiên tối thiểu 32 ký tự"],
                ].map(([key, label, description]) => {
                  const ok = systemStatus?.[key as keyof SystemStatus];
                  return (
                    <div key={key} className="p-4 rounded-xl border border-[rgba(255,200,100,0.14)] bg-black/15 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-[rgba(245,237,214,0.50)] mt-1">{description}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full border ${ok ? "text-green-400 border-green-400/25 bg-green-400/10" : "text-yellow-300 border-yellow-300/25 bg-yellow-300/10"}`}>
                        {ok ? "Đã kết nối" : "Chưa cấu hình"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-[rgba(255,200,100,0.14)] bg-black/15 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Sao lưu ảnh cũ sang Railway</p>
                    <p className="mt-1 text-xs text-[rgba(245,237,214,0.50)]">
                      Chỉ sao chép và xác minh; giữ nguyên URL, database và toàn bộ ảnh GitHub.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleMigrateLegacyMedia()}
                    disabled={migratingMedia || !systemStatus?.railwayMedia}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0D0B00] transition-colors hover:bg-[#E2C97E] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {migratingMedia && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {migratingMedia ? "Đang sao chép và xác minh…" : "Sao chép ảnh cũ"}
                  </button>
                </div>
                {mediaMigrationResult && (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                    mediaMigrationResult.ok
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}>
                    {mediaMigrationResult.ok
                      ? `Đã xác minh ${mediaMigrationResult.uploadedFiles}/${mediaMigrationResult.totalFiles} tệp (${(mediaMigrationResult.uploadedBytes / 1024 / 1024).toFixed(1)} MB). URL cũ và bản GitHub được giữ nguyên.`
                      : `Migration thất bại: ${mediaMigrationResult.failures?.[0] || "Lỗi không xác định"}`}
                  </div>
                )}
              </div>
              <p className="text-xs text-[rgba(245,237,214,0.45)]">Các khóa bí mật được quản lý bằng biến môi trường Railway. Cấu hình nghiệp vụ CRM và Google Sheets tiếp tục được quản lý trong module CRM.</p>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Bảo Mật</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-[#1a1200] rounded-xl">
                  <div>
                    <p className="text-sm text-white">Phiên đăng nhập</p>
                    <p className="text-xs text-[rgba(245,237,214,0.55)]">Tự động đăng xuất sau 24 giờ</p>
                  </div>
                  <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">Đang hoạt động</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1a1200] rounded-xl">
                  <div>
                    <p className="text-sm text-white">Cookie phiên an toàn</p>
                    <p className="text-xs text-[rgba(245,237,214,0.55)]">HttpOnly, SameSite=Lax và chỉ truyền qua HTTPS trong production</p>
                  </div>
                  <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">Đang hoạt động</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1a1200] rounded-xl">
                  <div>
                    <p className="text-sm text-white">Mật khẩu và chữ ký phiên</p>
                    <p className="text-xs text-[rgba(245,237,214,0.55)]">Mật khẩu mới dùng scrypt; token phiên được ký HMAC-SHA256</p>
                  </div>
                  <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">Đang hoạt động</span>
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <p className="text-blue-300 text-sm font-medium mb-1">Bảo mật môi trường production</p>
                  <p className="text-[rgba(245,237,214,0.55)] text-xs">Khóa phiên và mật khẩu gốc phải được quản lý trong Railway. Không lưu khóa bí mật trong mã nguồn hoặc phần giao diện.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
