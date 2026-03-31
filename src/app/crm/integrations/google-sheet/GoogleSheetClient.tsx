"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Database,
  Facebook,
  Globe,
  Play,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "facebook_lead" | "tiktok_lead" | "website" | "other";

interface SheetSource {
  id: string;
  label: string;
  enabled: boolean;
  spreadsheetId: string;
  sheetName: string;
  source: SourceType;
  color: string;
  lastSyncedAt: string;
  totalSynced: number;
}

interface GoogleSheetConfig {
  enabled: boolean;
  serviceAccountKey: string;
  sources: SheetSource[];
  idColumn: string;
  nameColumn: string;
  phoneColumn: string;
  emailColumn: string;
  adNameColumn: string;
  campaignNameColumn: string;
  formNameColumn: string;
  messageColumn: string;
  customerRoleColumn: string;
  totalSynced: number;
}

interface SyncSheetResult {
  sheetId: string;
  label: string;
  success: boolean;
  newLeads: number;
  skipped: number;
  errors: string[];
  syncedAt: string;
}

interface SyncResult {
  success: boolean;
  sheets: SyncSheetResult[];
  totalNew: number;
  totalSkipped: number;
  syncedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: SourceType; label: string; color: string }[] = [
  { value: "facebook_lead", label: "Facebook Lead Ads", color: "#1877f2" },
  { value: "tiktok_lead",   label: "TikTok Lead Ads",   color: "#010101" },
  { value: "website",       label: "Website / Landing Page", color: "#f97316" },
  { value: "other",         label: "Khác",              color: "#64748b" },
];

function SourceIcon({ source, size = 14 }: { source: SourceType; size?: number }) {
  if (source === "facebook_lead") return <Facebook size={size} style={{ color: "#1877f2" }} />;
  if (source === "tiktok_lead") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/>
    </svg>
  );
  if (source === "website") return <Globe size={size} style={{ color: "#f97316" }} />;
  return <Database size={size} style={{ color: "#64748b" }} />;
}

function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return "Chưa sync";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

function extractSpreadsheetId(input: string): string {
  // Nếu là URL Google Sheet, extract ID
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GoogleSheetClient() {
  const [config, setConfig] = useState<GoogleSheetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null); // sheetId or "all"
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/google-sheet-sync");
      if (res.ok) {
        const data = await res.json();
        // Merge với settings đầy đủ
        const settingsRes = await fetch("/api/crm/settings");
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setConfig(settings.googleSheet);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/crm/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "googleSheet", value: config }),
      });
      if (res.ok) {
        setSaveMsg("✅ Đã lưu cấu hình");
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        const error = await res.json();
        setSaveMsg(`❌ Lỗi khi lưu: ${error.error}`);
      }
    } catch {
      setSaveMsg("❌ Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (sheetId?: string) => {
    const key = sheetId || "all";
    setSyncing(key);
    setSyncResult(null);
    try {
      const url = sheetId
        ? `/api/crm/google-sheet-sync?id=${sheetId}`
        : "/api/crm/google-sheet-sync";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      // Refresh config để cập nhật lastSyncedAt
      await fetchConfig();
    } catch (e) {
      setSyncResult({
        success: false,
        sheets: [],
        totalNew: 0,
        totalSkipped: 0,
        syncedAt: new Date().toISOString(),
      });
    } finally {
      setSyncing(null);
    }
  };

  const addSheet = () => {
    if (!config) return;
    const newSheet: SheetSource = {
      id: `sheet_${Date.now()}`,
      label: "Sheet mới",
      enabled: false,
      spreadsheetId: "",
      sheetName: "Trang tính1",
      source: "other",
      color: "#64748b",
      lastSyncedAt: "",
      totalSynced: 0,
    };
    setConfig({ ...config, sources: [...config.sources, newSheet] });
    setExpandedSheet(newSheet.id);
  };

  const removeSheet = (id: string) => {
    if (!config) return;
    setConfig({ ...config, sources: config.sources.filter(s => s.id !== id) });
  };

  const updateSheet = (id: string, updates: Partial<SheetSource>) => {
    if (!config) return;
    setConfig({
      ...config,
      sources: config.sources.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-gray-500">
        Không thể tải cấu hình. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#e8f5e9" }}>
            <Sheet size={20} style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Google Sheet Sync</h1>
            <p className="text-sm text-gray-500">Tự động đồng bộ lead từ nhiều Google Sheet vào Data Pool</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSync()}
            disabled={syncing !== null || !config.enabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#16a34a" }}
          >
            {syncing === "all" ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            Sync tất cả
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div
          className="rounded-xl p-4 border"
          style={{
            background: syncResult.success ? "#f0fdf4" : "#fef2f2",
            borderColor: syncResult.success ? "#bbf7d0" : "#fecaca",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {syncResult.success ? (
              <CheckCircle size={16} style={{ color: "#16a34a" }} />
            ) : (
              <XCircle size={16} style={{ color: "#dc2626" }} />
            )}
            <span className="font-semibold text-sm" style={{ color: syncResult.success ? "#15803d" : "#dc2626" }}>
              {syncResult.success
                ? `Sync thành công — ${syncResult.totalNew} lead mới, ${syncResult.totalSkipped} bỏ qua`
                : "Sync thất bại"}
            </span>
          </div>
          {syncResult.sheets.map(s => (
            <div key={s.sheetId} className="text-xs text-gray-600 ml-6">
              <span className="font-medium">{s.label}:</span>{" "}
              {s.success ? `+${s.newLeads} mới` : `Lỗi: ${s.errors[0] || "unknown"}`}
            </div>
          ))}
        </div>
      )}

      {/* Global Toggle + Service Account */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Cấu hình chung</h2>
            <p className="text-sm text-gray-500 mt-0.5">Service Account dùng chung cho tất cả sheet</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.enabled}
              onChange={e => setConfig({ ...config, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
          </label>
        </div>

        {/* Service Account Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Service Account JSON Key
          </label>
          <div className="relative">
            <textarea
              rows={config.serviceAccountKey && !showServiceKey ? 2 : 6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", ...}'
              value={showServiceKey ? config.serviceAccountKey : (config.serviceAccountKey ? "••••••••••••••••••••••••••••••••" : "")}
              onChange={e => {
                if (showServiceKey) setConfig({ ...config, serviceAccountKey: e.target.value });
              }}
              readOnly={!showServiceKey}
            />
            <button
              type="button"
              onClick={() => setShowServiceKey(v => !v)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              {showServiceKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Tạo Service Account tại Google Cloud Console → IAM → Service Accounts → Tạo key JSON
          </p>
        </div>

        {/* Column Mapping */}
        <div>
          <button
            onClick={() => setShowGuide(v => !v)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Cấu hình ánh xạ cột
          </button>
          {showGuide && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { key: "idColumn", label: "Cột ID (dedup)" },
                { key: "nameColumn", label: "Cột tên đầy đủ" },
                { key: "phoneColumn", label: "Cột số điện thoại" },
                { key: "emailColumn", label: "Cột email" },
                { key: "adNameColumn", label: "Cột tên quảng cáo" },
                { key: "campaignNameColumn", label: "Cột tên campaign" },
                { key: "formNameColumn", label: "Cột tên form" },
                { key: "messageColumn", label: "Cột ghi chú (tùy chọn)" },
                { key: "customerRoleColumn", label: "Cột vai trò / nhu cầu (tùy chọn)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                    value={(config as Record<string, unknown>)[key] as string || ""}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sheet Sources */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Danh sách Sheet nguồn</h2>
          <button
            onClick={addSheet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 border border-green-200 hover:bg-green-50 transition-colors"
          >
            <Plus size={14} />
            Thêm sheet
          </button>
        </div>

        {config.sources.map(sheet => (
          <div key={sheet.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Sheet header */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: sheet.color + "20" }}>
                <SourceIcon source={sheet.source} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{sheet.label}</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: sheet.color + "20", color: sheet.color }}
                  >
                    {SOURCE_OPTIONS.find(o => o.value === sheet.source)?.label || sheet.source}
                  </span>
                  {sheet.enabled ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Bật</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Tắt</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {formatRelativeTime(sheet.lastSyncedAt)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {sheet.totalSynced} lead đã sync
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); handleSync(sheet.id); }}
                  disabled={syncing !== null || !sheet.enabled || !sheet.spreadsheetId}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-30"
                  title="Sync sheet này"
                >
                  {syncing === sheet.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeSheet(sheet.id); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Xóa sheet này"
                >
                  <Trash2 size={14} />
                </button>
                {expandedSheet === sheet.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Sheet config (expanded) */}
            {expandedSheet === sheet.id && (
              <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  {/* Label */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tên hiển thị</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={sheet.label}
                      onChange={e => updateSheet(sheet.id, { label: e.target.value })}
                    />
                  </div>

                  {/* Source type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Kênh nguồn</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={sheet.source}
                      onChange={e => {
                        const opt = SOURCE_OPTIONS.find(o => o.value === e.target.value as SourceType);
                        updateSheet(sheet.id, {
                          source: e.target.value as SourceType,
                          color: opt?.color || "#64748b",
                        });
                      }}
                    >
                      {SOURCE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Spreadsheet ID / URL */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Google Sheet URL hoặc Spreadsheet ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="https://docs.google.com/spreadsheets/d/... hoặc ID"
                        value={sheet.spreadsheetId}
                        onChange={e => updateSheet(sheet.id, {
                          spreadsheetId: extractSpreadsheetId(e.target.value),
                        })}
                      />
                      {sheet.spreadsheetId && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Dán URL đầy đủ — hệ thống sẽ tự extract ID
                    </p>
                  </div>

                  {/* Sheet name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tên tab sheet</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Trang tính1"
                      value={sheet.sheetName}
                      onChange={e => updateSheet(sheet.id, { sheetName: e.target.value })}
                    />
                  </div>

                  {/* Enable toggle */}
                  <div className="flex items-center gap-3 pt-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={sheet.enabled}
                        onChange={e => updateSheet(sheet.id, { enabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
                    </label>
                    <span className="text-sm text-gray-700">Bật sync cho sheet này</span>
                  </div>
                </div>

                {/* Validation warning */}
                {!sheet.spreadsheetId && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle size={12} />
                    Chưa có Spreadsheet ID — sheet này sẽ bị bỏ qua khi sync
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {config.sources.length === 0 && (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <Sheet size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có sheet nào. Nhấn "Thêm sheet" để bắt đầu.</p>
          </div>
        )}
      </div>

      {/* Hướng dẫn */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle size={16} />
          Hướng dẫn cấu hình Google Service Account
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li><span className="font-bold">1.</span> Vào <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">Google Cloud Console</a> → Tạo project mới (hoặc dùng project có sẵn)</li>
          <li><span className="font-bold">2.</span> Bật API: <strong>Google Sheets API</strong> (APIs & Services → Enable APIs)</li>
          <li><span className="font-bold">3.</span> IAM & Admin → Service Accounts → Tạo Service Account mới</li>
          <li><span className="font-bold">4.</span> Trong Service Account → Keys → Add Key → JSON → Tải file JSON về</li>
          <li><span className="font-bold">5.</span> Mở file JSON → Copy toàn bộ nội dung → Dán vào ô Service Account Key ở trên</li>
          <li><span className="font-bold">6.</span> Mở Google Sheet → Share → Thêm email của Service Account (trong file JSON, trường <code>client_email</code>) với quyền <strong>Viewer</strong></li>
          <li><span className="font-bold">7.</span> Điền Spreadsheet ID cho từng sheet → Bật toggle → Lưu → Sync</li>
        </ol>
      </div>

      {/* Cron info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
          <Clock size={14} />
          Tự động sync định kỳ
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Cấu hình Railway Cron Job để tự động sync mỗi 15 phút:
        </p>
        <div className="space-y-1">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-700">
            URL: {typeof window !== "undefined" ? window.location.origin : "https://your-domain.railway.app"}/api/crm/google-sheet-sync/cron
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-700">
            Schedule: */15 * * * *
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between pt-2">
        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
            {saveMsg}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#16a34a" }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </div>
    </div>
  );
}
