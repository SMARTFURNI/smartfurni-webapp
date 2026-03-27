"use client";

import React, { useState, useCallback } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, Copy, RefreshCw,
  ChevronRight, ExternalLink, Play, Loader2, Check,
  Eye, EyeOff, Save, ArrowRight, Info,
} from "lucide-react";
import type { CrmSettings } from "@/lib/crm-settings-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialSettings: CrmSettings;
}

interface TestResult {
  success: boolean;
  status?: number;
  webhookResponse?: {
    received?: boolean;
    created?: number;
    skipped?: boolean;
    errors?: string[];
  };
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: copied ? "rgba(34,197,94,0.1)" : "#f3f4f6",
        color: copied ? "#16a34a" : "#6b7280",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "#e5e7eb"}`,
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Đã sao chép" : label}
    </button>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
      style={{
        background: enabled ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)",
        color: enabled ? "#16a34a" : "#6b7280",
        border: `1px solid ${enabled ? "rgba(34,197,94,0.3)" : "#e5e7eb"}`,
      }}
    >
      {enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {enabled ? "Đang hoạt động" : "Chưa kết nối"}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FacebookIntegrationClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState<CrmSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const fb = settings.webhook;
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/facebook-lead`
    : "https://your-domain.com/api/webhooks/facebook-lead";

  const updateFb = useCallback((patch: Partial<typeof fb>) => {
    setSettings(prev => ({
      ...prev,
      webhook: { ...prev.webhook, ...patch },
    }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "webhook", value: settings.webhook }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/webhooks/facebook-lead/test", { method: "POST" });
      const data = await res.json();
      setTestResult({ success: res.ok, status: res.status, ...data });
    } catch (e) {
      setTestResult({ success: false, error: e instanceof Error ? e.message : "Lỗi không xác định" });
    } finally {
      setTesting(false);
    }
  };

  const regenerateVerifyToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
    const token = "smartfurni_" + Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    updateFb({ fbVerifyToken: token });
  };

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Facebook logo */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ background: "#1877F2" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#101828" }}>
                Facebook Lead Ads
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "#667085" }}>
                Tự động nhận lead từ Facebook vào Data Pool
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge enabled={fb.fbEnabled} />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: saved ? "rgba(34,197,94,0.1)" : "#101828",
                color: saved ? "#16a34a" : "#ffffff",
                border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? "Đang lưu..." : saved ? "Đã lưu!" : "Lưu cài đặt"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="xl:col-span-2 space-y-6">

          {/* Status Card */}
          <div className="rounded-2xl p-6 shadow-sm"
            style={{ background: "#ffffff", border: "1px solid #EAECF0" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "#101828" }}>
                Trạng thái kết nối
              </h2>
              <button
                onClick={() => updateFb({ fbEnabled: !fb.fbEnabled })}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: fb.fbEnabled ? "#1877F2" : "#d1d5db" }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: fb.fbEnabled ? "translateX(1.375rem)" : "translateX(0.25rem)" }}
                />
              </button>
            </div>

            {fb.fbEnabled ? (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: "rgba(24,119,242,0.05)", border: "1px solid rgba(24,119,242,0.15)" }}>
                <CheckCircle2 size={18} style={{ color: "#1877F2", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1877F2" }}>
                    Đang nhận lead từ Facebook
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#667085" }}>
                    {fb.fbPageName ? `Page: ${fb.fbPageName}` : "Mọi lead từ Facebook Lead Ads sẽ tự động vào Data Pool"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <AlertCircle size={18} style={{ color: "#9ca3af", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#374151" }}>
                    Tích hợp đang tắt
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                    Bật toggle để bắt đầu nhận lead từ Facebook
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Credentials */}
          <div className="rounded-2xl p-6 shadow-sm"
            style={{ background: "#ffffff", border: "1px solid #EAECF0" }}>
            <h2 className="text-base font-semibold mb-5" style={{ color: "#101828" }}>
              Thông tin Webhook
            </h2>
            <div className="space-y-4">
              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#667085" }}>
                  Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
                    style={{ background: "#f9fafb", border: "1px solid #EAECF0", color: "#1877F2" }}>
                    {webhookUrl}
                  </div>
                  <CopyButton text={webhookUrl} label="Sao chép" />
                </div>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  Dán URL này vào Facebook App → Webhooks → Callback URL
                </p>
              </div>

              {/* Verify Token */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#667085" }}>
                  Verify Token
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono"
                    style={{ background: "#f9fafb", border: "1px solid #EAECF0", color: "#374151" }}>
                    {fb.fbVerifyToken || "smartfurni_fb_webhook_2026"}
                  </div>
                  <button
                    onClick={regenerateVerifyToken}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-all"
                    style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
                    title="Tạo token mới"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <CopyButton text={fb.fbVerifyToken || "smartfurni_fb_webhook_2026"} />
                </div>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  Dán token này vào Facebook App → Webhooks → Verify Token
                </p>
              </div>
            </div>
          </div>

          {/* App Credentials */}
          <div className="rounded-2xl p-6 shadow-sm"
            style={{ background: "#ffffff", border: "1px solid #EAECF0" }}>
            <h2 className="text-base font-semibold mb-5" style={{ color: "#101828" }}>
              Thông tin Facebook App
            </h2>
            <div className="space-y-4">
              {/* App ID */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#667085" }}>
                  App ID
                </label>
                <input
                  type="text"
                  value={fb.fbAppId || ""}
                  onChange={e => updateFb({ fbAppId: e.target.value })}
                  placeholder="123456789012345"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "#f9fafb", border: "1px solid #EAECF0", color: "#101828" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#1877F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,119,242,0.1)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#EAECF0"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  Lấy từ Meta for Developers → App Dashboard → App ID
                </p>
              </div>

              {/* App Secret */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#667085" }}>
                  App Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={fb.fbAppSecret || ""}
                    onChange={e => updateFb({ fbAppSecret: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "#f9fafb", border: "1px solid #EAECF0", color: "#101828" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#1877F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,119,242,0.1)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#EAECF0"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={() => setShowSecret(v => !v)}
                    className="p-2.5 rounded-xl hover:bg-gray-100 transition-all"
                    style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  Dùng để xác thực chữ ký HMAC SHA256 từ Facebook (bảo mật cao)
                </p>
              </div>

              {/* Page Access Token */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#667085" }}>
                  Page Access Token <span style={{ color: "#9ca3af", fontWeight: 400 }}>(tùy chọn)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showToken ? "text" : "password"}
                    value={fb.fbPageAccessToken || ""}
                    onChange={e => updateFb({ fbPageAccessToken: e.target.value })}
                    placeholder="EAABsbCS..."
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: "#f9fafb", border: "1px solid #EAECF0", color: "#101828" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#1877F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,119,242,0.1)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#EAECF0"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    onClick={() => setShowToken(v => !v)}
                    className="p-2.5 rounded-xl hover:bg-gray-100 transition-all"
                    style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                  Dùng để lấy chi tiết lead qua Graph API (nếu cần)
                </p>
              </div>

              {/* Page Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#667085" }}>
                  Tên Facebook Page
                </label>
                <input
                  type="text"
                  value={fb.fbPageName || ""}
                  onChange={e => updateFb({ fbPageName: e.target.value })}
                  placeholder="SmartFurni Official"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "#f9fafb", border: "1px solid #EAECF0", color: "#101828" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#1877F2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,119,242,0.1)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#EAECF0"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          </div>

          {/* Test Section */}
          <div className="rounded-2xl p-6 shadow-sm"
            style={{ background: "#ffffff", border: "1px solid #EAECF0" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#101828" }}>
                  Kiểm tra kết nối
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#667085" }}>
                  Gửi một lead giả để kiểm tra luồng dữ liệu
                </p>
              </div>
              <button
                onClick={handleTest}
                disabled={testing || !fb.fbEnabled}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#1877F2", color: "#ffffff" }}
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {testing ? "Đang test..." : "Gửi lead thử"}
              </button>
            </div>

            {!fb.fbEnabled && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
                style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" }}>
                <AlertCircle size={14} />
                Bật tích hợp trước khi test
              </div>
            )}

            {testResult && (
              <div className="mt-3 p-4 rounded-xl"
                style={{
                  background: testResult.success ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                  border: `1px solid ${testResult.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success
                    ? <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                    : <XCircle size={16} style={{ color: "#dc2626" }} />}
                  <span className="text-sm font-semibold"
                    style={{ color: testResult.success ? "#16a34a" : "#dc2626" }}>
                    {testResult.success ? "Test thành công!" : "Test thất bại"}
                  </span>
                </div>
                {testResult.webhookResponse && (
                  <div className="text-xs space-y-1" style={{ color: "#6b7280" }}>
                    {testResult.webhookResponse.created !== undefined && (
                      <p>✅ Đã tạo <strong>{testResult.webhookResponse.created}</strong> lead trong Data Pool</p>
                    )}
                    {testResult.webhookResponse.skipped && (
                      <p>⚠️ Bị bỏ qua — tích hợp đang tắt</p>
                    )}
                    {testResult.webhookResponse.errors?.map((e, i) => (
                      <p key={i} style={{ color: "#dc2626" }}>❌ {e}</p>
                    ))}
                  </div>
                )}
                {testResult.error && (
                  <p className="text-xs" style={{ color: "#dc2626" }}>{testResult.error}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Step-by-step guide */}
        <div className="space-y-6">
          {/* Setup Guide */}
          <div className="rounded-2xl p-6 shadow-sm"
            style={{ background: "#ffffff", border: "1px solid #EAECF0" }}>
            <h2 className="text-base font-semibold mb-5" style={{ color: "#101828" }}>
              Hướng dẫn kết nối
            </h2>
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Tạo Facebook App",
                  desc: "Vào Meta for Developers → Tạo App mới → Chọn loại Business",
                  link: "https://developers.facebook.com/apps/",
                  linkLabel: "Mở Meta for Developers",
                },
                {
                  step: 2,
                  title: "Thêm Webhooks product",
                  desc: "Trong App Dashboard → Add Product → Webhooks → Subscribe to leadgen events",
                  link: null,
                },
                {
                  step: 3,
                  title: "Cấu hình Webhook",
                  desc: "Dán Webhook URL và Verify Token từ bảng bên trái vào Facebook",
                  link: null,
                },
                {
                  step: 4,
                  title: "Sao chép App credentials",
                  desc: "Lấy App ID và App Secret từ App Dashboard → Basic Settings",
                  link: null,
                },
                {
                  step: 5,
                  title: "Bật tích hợp & Lưu",
                  desc: "Bật toggle → Nhấn Lưu cài đặt → Test bằng nút Gửi lead thử",
                  link: null,
                },
                {
                  step: 6,
                  title: "Kiểm tra Data Pool",
                  desc: "Lead từ Facebook sẽ xuất hiện trong Data Pool với nhãn Facebook Lead",
                  link: "/crm/data-pool",
                  linkLabel: "Mở Data Pool",
                },
              ].map(({ step, title, desc, link, linkLabel }) => (
                <div key={step} className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(24,119,242,0.1)", color: "#1877F2" }}
                  >
                    {step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "#101828" }}>{title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#667085" }}>{desc}</p>
                    {link && (
                      <a
                        href={link}
                        target={link.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-1 hover:underline"
                        style={{ color: "#1877F2" }}
                      >
                        {linkLabel} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Field Mapping */}
          <div className="rounded-2xl p-6 shadow-sm"
            style={{ background: "#ffffff", border: "1px solid #EAECF0" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#101828" }}>
              Ánh xạ trường dữ liệu
            </h2>
            <p className="text-xs mb-3" style={{ color: "#667085" }}>
              Các trường trong Facebook Lead Form được tự động map vào CRM:
            </p>
            <div className="space-y-2">
              {[
                { fb: "full_name / first_name + last_name", crm: "Họ tên" },
                { fb: "phone_number / phone / mobile_phone", crm: "Số điện thoại" },
                { fb: "email", crm: "Email" },
                { fb: "message / note / ghi_chu / nhu_cau", crm: "Ghi chú" },
                { fb: "ad_name", crm: "Tên quảng cáo" },
                { fb: "campaign_name", crm: "Tên chiến dịch" },
                { fb: "form_name", crm: "Tên form" },
              ].map(({ fb: fbField, crm: crmField }) => (
                <div key={fbField} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 px-2 py-1 rounded font-mono"
                    style={{ background: "#f3f4f6", color: "#374151" }}>
                    {fbField}
                  </span>
                  <ArrowRight size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
                  <span className="flex-1 px-2 py-1 rounded font-medium"
                    style={{ background: "rgba(24,119,242,0.08)", color: "#1877F2" }}>
                    {crmField}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Info */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(79,70,229,0.04)", border: "1px solid rgba(79,70,229,0.15)" }}>
            <div className="flex items-start gap-2">
              <Info size={14} style={{ color: "#4F46E5", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#4F46E5" }}>Bảo mật</p>
                <p className="text-xs mt-1" style={{ color: "#667085" }}>
                  Khi cấu hình App Secret, hệ thống sẽ xác thực chữ ký HMAC SHA256 trên mọi request từ Facebook,
                  ngăn chặn giả mạo dữ liệu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
