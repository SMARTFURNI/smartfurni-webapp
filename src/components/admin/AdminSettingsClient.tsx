"use client";
import { useState, useEffect } from "react";

interface SettingSection {
  id: string;
  title: string;
  icon: string;
}

const SECTIONS: SettingSection[] = [
  { id: "account", title: "Tài khoản", icon: "👤" },
  { id: "website", title: "Website", icon: "🌐" },
  { id: "seo", title: "SEO", icon: "🔍" },
  { id: "email", title: "Email thông báo", icon: "📧" },
  { id: "security", title: "Bảo mật", icon: "🔐" },
];

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

  // Website settings state
  const [siteName, setSiteName] = useState("SmartFurni");
  const [siteTagline, setSiteTagline] = useState("Giường thông minh cho cuộc sống hiện đại");
  const [contactEmail, setContactEmail] = useState("info@smartfurni.vn");
  const [contactPhone, setContactPhone] = useState("1800 6789");
  const [facebookUrl, setFacebookUrl] = useState("https://facebook.com/smartfurni");
  const [instagramUrl, setInstagramUrl] = useState("https://instagram.com/smartfurni");

  // SEO settings
  const [metaTitle, setMetaTitle] = useState("SmartFurni - Giường Thông Minh Cao Cấp");
  const [metaDesc, setMetaDesc] = useState("SmartFurni cung cấp giường thông minh công thái học với điều khiển qua app, hỗ trợ giấc ngủ khoa học cho mọi gia đình Việt Nam.");
  const [googleAnalytics, setGoogleAnalytics] = useState("");

  // Email SMTP settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

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
    await fetch("/api/admin/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smtpHost, smtpPort, smtpUser, smtpPass, adminEmail, enabled: emailEnabled }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Account settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

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

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-3 h-fit">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeSection === section.id
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[rgba(255,200,100,0.22)]"
                  : "text-[rgba(245,237,214,0.70)] hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
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

          {/* Website Section */}
          {activeSection === "website" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Thông Tin Website</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Tên thương hiệu</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Email liên hệ</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Tagline</label>
                <input
                  type="text"
                  value={siteTagline}
                  onChange={(e) => setSiteTagline(e.target.value)}
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Số điện thoại</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Facebook URL</label>
                  <input
                    type="url"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>

              <button
                onClick={handleSave}
                className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          )}

          {/* SEO Section */}
          {activeSection === "seo" && (
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Cài Đặt SEO</h2>

              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Meta Title (trang chủ)</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
                <p className="text-xs text-[rgba(245,237,214,0.35)] mt-1">{metaTitle.length}/60 ký tự</p>
              </div>

              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Meta Description</label>
                <textarea
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none"
                />
                <p className="text-xs text-[rgba(245,237,214,0.35)] mt-1">{metaDesc.length}/160 ký tự</p>
              </div>

              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Google Analytics ID (tùy chọn)</label>
                <input
                  type="text"
                  value={googleAnalytics}
                  onChange={(e) => setGoogleAnalytics(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>

              {/* SEO Preview */}
              <div className="bg-[#1a1200] rounded-xl p-4 border border-[rgba(255,200,100,0.14)]">
                <p className="text-xs text-[rgba(245,237,214,0.45)] mb-2">Xem trước kết quả tìm kiếm Google:</p>
                <p className="text-blue-400 text-sm">{metaTitle || "Tiêu đề trang"}</p>
                <p className="text-green-600 text-xs">https://smartfurni.vn</p>
                <p className="text-[rgba(245,237,214,0.70)] text-xs mt-1 line-clamp-2">{metaDesc || "Mô tả trang..."}</p>
              </div>

              <button
                onClick={handleSave}
                className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors"
              >
                Lưu cài đặt SEO
              </button>
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
                <p className="text-blue-400 text-sm font-medium mb-1">📧 Cách hoạt động</p>
                <p className="text-[rgba(245,237,214,0.55)] text-xs leading-relaxed">
                  Khi khách hàng gửi form liên hệ, hệ thống sẽ tự động gửi email thông báo đến địa chỉ admin.
                  Cần cấu hình SMTP server để tính năng này hoạt động.
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
                  {testingEmail ? "Đang kiểm tra..." : "🔌 Kiểm tra kết nối"}
                </button>
                <button
                  onClick={handleSaveEmail}
                  className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors"
                >
                  Lưu cài đặt
                </button>
              </div>

              <div className="bg-[#1a1200] rounded-xl p-4 border border-[rgba(255,200,100,0.14)]">
                <p className="text-xs text-[rgba(245,237,214,0.45)] mb-2 font-medium">💡 Hướng dẫn Gmail:</p>
                <ol className="text-xs text-[rgba(245,237,214,0.35)] space-y-1 list-decimal list-inside">
                  <li>Bật xác minh 2 bước trong tài khoản Google</li>
                  <li>Vào Google Account → Security → App passwords</li>
                  <li>Tạo App Password cho "Mail" và dán vào ô mật khẩu SMTP</li>
                  <li>Dùng smtp.gmail.com, port 587</li>
                </ol>
              </div>
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
                    <p className="text-sm text-white">Bảo vệ CSRF</p>
                    <p className="text-xs text-[rgba(245,237,214,0.55)]">Chống tấn công Cross-Site Request Forgery</p>
                  </div>
                  <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">Đang hoạt động</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1a1200] rounded-xl">
                  <div>
                    <p className="text-sm text-white">Mã hóa mật khẩu</p>
                    <p className="text-xs text-[rgba(245,237,214,0.55)]">Session token được mã hóa Base64</p>
                  </div>
                  <span className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">Đang hoạt động</span>
                </div>

                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Lưu ý bảo mật</p>
                  <p className="text-[rgba(245,237,214,0.55)] text-xs">
                    Đây là môi trường demo. Trong production, hãy sử dụng biến môi trường cho thông tin đăng nhập và triển khai HTTPS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
