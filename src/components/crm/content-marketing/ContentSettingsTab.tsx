"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Bot, FileText, Palette, Sliders, Workflow,
  Save, RefreshCw, ChevronDown, ChevronUp, Info, Zap, Eye, EyeOff,
  AlertTriangle, CheckCircle2, Lock
} from "lucide-react";

interface ContentSettings {
  id: string;
  aiProvider: "gemini" | "openai" | "claude";
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  promptTemplate: string;
  promptSystemContext: string;
  brandName: string;
  brandDescription: string;
  brandUsp: string;
  brandProducts: string;
  brandTone: string;
  defaultPlatform: string;
  defaultTone: string;
  defaultDuration: number;
  autoSaveToKanban: boolean;
  requireApproval: boolean;
  maxGenerationsPerDay: number;
  updatedBy: string;
  updatedAt: string;
}

const AI_MODELS: Record<string, { label: string; models: { value: string; label: string; desc: string; badge?: string; badgeColor?: string }[] }> = {
  gemini: {
    label: "Google Gemini",
    models: [
      { value: "gemini-2.5-flash-preview-04-17", label: "Gemini 2.5 Flash", desc: "Model hiện tại — thông minh nhất, 20 kịch bản/ngày (free)", badge: "⭐ Đang dùng", badgeColor: "amber" },
      { value: "gemini-2.5-flash-lite-preview-06-17", label: "Gemini 2.5 Flash Lite", desc: "Không giới hạn số kịch bản/ngày — tốc độ cao, chất lượng tốt", badge: "⚡ Không giới hạn", badgeColor: "green" },
      { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", desc: "500 kịch bản/ngày (free) — giới hạn cao nhất trong free tier", badge: "🚀 500/ngày", badgeColor: "blue" },
      { value: "gemini-3.1-flash", label: "Gemini 3.1 Flash", desc: "Thế hệ mới nhất, 20 kịch bản/ngày — chất lượng vượt trội", badge: "🆕 Mới", badgeColor: "purple" },
      { value: "gemini-2.0-flash", label: "Gemini 2 Flash", desc: "Không giới hạn RPD — ổn định, phù hợp backup khi vượt giới hạn", badge: "∞ Không giới hạn", badgeColor: "green" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2 Flash Lite", desc: "Nhanh nhất, không giới hạn RPD — dùng khi cần tốc độ", badge: "⚡ Nhanh nhất", badgeColor: "green" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Chất lượng cao nhất — phù hợp kịch bản dài, phức tạp (cần trả phí)", badge: "💎 Premium", badgeColor: "rose" },
      { value: "gemini-3-flash", label: "Gemini 3 Flash", desc: "Tương đương 2.5 Flash, 20 kịch bản/ngày — thêm lựa chọn thay thế", badge: "🔄 Backup", badgeColor: "slate" },
      { value: "gemma-3-27b-it", label: "Gemma 4 26B", desc: "Open source, 1.500 kịch bản/ngày — phù hợp sản xuất hàng loạt", badge: "🌐 1.5K/ngày", badgeColor: "teal" },
      { value: "gemma-3-27b-it-large", label: "Gemma 4 31B", desc: "Mạnh nhất trong Gemma 4, 1.500 kịch bản/ngày — chất lượng cao", badge: "🌐 Mạnh nhất", badgeColor: "teal" },
    ],
  },
  openai: {
    label: "OpenAI GPT",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Nhanh và tiết kiệm" },
      { value: "gpt-4o", label: "GPT-4o", desc: "Chất lượng cao nhất từ OpenAI" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Mạnh mẽ, context dài" },
    ],
  },
  claude: {
    label: "Anthropic Claude",
    models: [
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "Nhanh và hiệu quả" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", desc: "Cân bằng tốt nhất" },
      { value: "claude-opus-4-5", label: "Claude Opus", desc: "Mạnh nhất, phù hợp kịch bản sáng tạo" },
    ],
  },
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  ai: <Bot size={18} className="text-purple-500" />,
  prompt: <FileText size={18} className="text-blue-500" />,
  brand: <Palette size={18} className="text-amber-500" />,
  defaults: <Sliders size={18} className="text-green-500" />,
  workflow: <Workflow size={18} className="text-rose-500" />,
};

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ id, title, subtitle, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            {SECTION_ICONS[id]}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-800">{title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-sm font-medium text-gray-700">{children}</label>
      {hint && (
        <div className="group relative">
          <Info size={13} className="text-gray-400 cursor-help" />
          <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-56 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg">
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentSettingsTab() {
  const [settings, setSettings] = useState<ContentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ai: true,
    prompt: false,
    brand: false,
    defaults: false,
    workflow: false,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/content/settings");
      if (res.status === 403) {
        setError("forbidden");
        return;
      }
      if (!res.ok) throw new Error("Lỗi tải cài đặt");
      const data = await res.json();
      setSettings(data.settings);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/crm/content/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi lưu cài đặt");
      }
      const data = await res.json();
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof ContentSettings, value: unknown) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  // ─── Forbidden ────────────────────────────────────────────────────────────
  if (error === "forbidden") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Chỉ Admin mới có quyền truy cập</h3>
          <p className="text-gray-500 text-sm">
            Tab Cài đặt chỉ dành cho tài khoản quản trị viên. Vui lòng liên hệ admin để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  const currentModels = AI_MODELS[settings.aiProvider]?.models || [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Cài đặt Content Marketing AI</h2>
            <p className="text-xs text-gray-500">
              Cập nhật lần cuối: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("vi-VN") : "Chưa có"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm shadow-sm hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>

      {/* Alerts */}
      {error && error !== "forbidden" && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle2 size={16} />
          Đã lưu cài đặt thành công!
        </div>
      )}

      {/* ── Section 1: AI Model ─────────────────────────────────────────────── */}
      <Section
        id="ai"
        title="Kết nối Model AI"
        subtitle="Chọn nhà cung cấp AI và model để tạo kịch bản"
        expanded={expandedSections.ai}
        onToggle={() => toggleSection("ai")}
      >
        {/* Provider */}
        <div>
          <Label hint="Nhà cung cấp AI sẽ xử lý yêu cầu tạo kịch bản">Nhà cung cấp AI</Label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(AI_MODELS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => {
                  update("aiProvider", key as ContentSettings["aiProvider"]);
                  update("aiModel", AI_MODELS[key].models[0].value);
                }}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  settings.aiProvider === key
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {info.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model selection */}
        <div>
          <Label hint="Model cụ thể trong nhà cung cấp đã chọn">Model AI</Label>
          <div className="space-y-2">
            {currentModels.map(m => {
              const badgeStyles: Record<string, { bg: string; text: string; border: string }> = {
                amber:  { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b",  border: "rgba(245,158,11,0.3)" },
                green:  { bg: "rgba(34,197,94,0.15)",   text: "#22c55e",  border: "rgba(34,197,94,0.3)" },
                blue:   { bg: "rgba(59,130,246,0.15)",  text: "#3b82f6",  border: "rgba(59,130,246,0.3)" },
                purple: { bg: "rgba(168,85,247,0.15)",  text: "#a855f7",  border: "rgba(168,85,247,0.3)" },
                rose:   { bg: "rgba(244,63,94,0.15)",   text: "#f43f5e",  border: "rgba(244,63,94,0.3)" },
                slate:  { bg: "rgba(148,163,184,0.15)", text: "#94a3b8",  border: "rgba(148,163,184,0.3)" },
                teal:   { bg: "rgba(20,184,166,0.15)",  text: "#14b8a6",  border: "rgba(20,184,166,0.3)" },
              };
              const bs = badgeStyles[m.badgeColor || "slate"];
              const isActive = settings.aiModel === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => update("aiModel", m.value)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                  style={isActive ? {
                    background: "rgba(245,158,11,0.1)",
                    border: "1.5px solid rgba(245,158,11,0.5)",
                  } : {
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-all"
                    style={isActive ? { borderColor: "#f59e0b", background: "#f59e0b" } : { borderColor: "rgba(255,255,255,0.25)", background: "transparent" }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: isActive ? "#f5edd6" : "rgba(255,255,255,0.75)" }}>{m.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{m.desc}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)" }}>
                        Đang dùng
                      </span>
                    )}
                    {m.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: bs.bg, color: bs.text, border: `1px solid ${bs.border}` }}>
                        {m.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temperature & Max Tokens */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label hint="Độ sáng tạo: 0 = chính xác, 1 = sáng tạo nhất. Khuyến nghị: 0.7">
              Temperature: <span className="text-amber-600 font-bold">{settings.aiTemperature}</span>
            </Label>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={settings.aiTemperature}
              onChange={e => update("aiTemperature", parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Chính xác</span>
              <span>Sáng tạo</span>
            </div>
          </div>
          <div>
            <Label hint="Giới hạn độ dài kịch bản. 8192 tokens ≈ ~6000 từ">Max Tokens</Label>
            <input
              type="number"
              value={settings.aiMaxTokens}
              onChange={e => update("aiMaxTokens", parseInt(e.target.value))}
              min={1024} max={32768} step={1024}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        {/* API Key note */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-blue-700 text-xs">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            API Key được cấu hình qua biến môi trường <code className="bg-blue-100 px-1 rounded">GEMINI_API_KEY</code> trên Railway.
            Để đổi sang OpenAI hoặc Claude, cần thêm key tương ứng vào Railway Environment Variables.
          </span>
        </div>
      </Section>

      {/* ── Section 2: Prompt Template ──────────────────────────────────────── */}
      <Section
        id="prompt"
        title="Cấu trúc Prompt"
        subtitle="Chỉnh sửa template và ngữ cảnh để AI hiểu đúng yêu cầu"
        expanded={expandedSections.prompt}
        onToggle={() => toggleSection("prompt")}
      >
        {/* System Context */}
        <div>
          <Label hint="Thông tin nền về thương hiệu, sản phẩm, khách hàng — AI sẽ dùng để hiểu ngữ cảnh">
            Ngữ cảnh thương hiệu (System Context)
          </Label>
          <textarea
            value={settings.promptSystemContext}
            onChange={e => update("promptSystemContext", e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y"
            placeholder="Mô tả thương hiệu, sản phẩm, đối tượng khách hàng..."
          />
        </div>

        {/* Prompt Template */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label hint="Template prompt chính. Dùng {{variable}} để chèn giá trị động">
              Prompt Template
            </Label>
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showPromptPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPromptPreview ? "Ẩn preview" : "Xem preview"}
            </button>
          </div>
          <textarea
            value={settings.promptTemplate}
            onChange={e => update("promptTemplate", e.target.value)}
            rows={12}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y"
            placeholder="Nhập template prompt..."
          />
          {/* Variable reference */}
          <div className="mt-2 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-medium text-gray-600 mb-2">Biến có thể dùng trong template:</p>
            <div className="flex flex-wrap gap-1.5">
              {["{{brandName}}", "{{platform}}", "{{topic}}", "{{duration}}", "{{tone}}", "{{productName}}", "{{targetAudience}}", "{{additionalNotes}}"].map(v => (
                <code key={v} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-mono">{v}</code>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Dùng <code className="bg-gray-200 px-1 rounded">{"{{#var}}...{{/var}}"}</code> cho nội dung điều kiện (chỉ hiện khi var có giá trị)
            </p>
          </div>
          {/* Preview */}
          {showPromptPreview && (
            <div className="mt-3 p-4 bg-gray-900 rounded-xl">
              <p className="text-xs text-gray-400 mb-2 font-medium">Preview (với dữ liệu mẫu):</p>
              <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono leading-relaxed">
                {settings.promptTemplate
                  .replace(/\{\{brandName\}\}/g, settings.brandName || "SmartFurni")
                  .replace(/\{\{platform\}\}/g, "TikTok (video ngắn 15-60 giây...)")
                  .replace(/\{\{topic\}\}/g, "[Chủ đề video]")
                  .replace(/\{\{duration\}\}/g, "30-60 giây")
                  .replace(/\{\{tone\}\}/g, "chuyên nghiệp, uy tín")
                  .replace(/\{\{productName\}\}/g, "[Tên sản phẩm]")
                  .replace(/\{\{targetAudience\}\}/g, "[Đối tượng]")
                  .replace(/\{\{additionalNotes\}\}/g, "")
                  .replace(/\{\{#\w+\}\}([\s\S]*?)\{\{\/\w+\}\}/g, "$1")}
              </pre>
            </div>
          )}
        </div>
      </Section>

      {/* ── Section 3: Brand Context ────────────────────────────────────────── */}
      <Section
        id="brand"
        title="Thông tin thương hiệu"
        subtitle="Dữ liệu về SmartFurni để AI tạo nội dung đúng brand"
        expanded={expandedSections.brand}
        onToggle={() => toggleSection("brand")}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tên thương hiệu</Label>
            <input
              type="text"
              value={settings.brandName}
              onChange={e => update("brandName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <Label hint="Giọng điệu tổng thể của thương hiệu">Giọng điệu thương hiệu</Label>
            <input
              type="text"
              value={settings.brandTone}
              onChange={e => update("brandTone", e.target.value)}
              placeholder="VD: Chuyên nghiệp, tin cậy, gần gũi"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>
        <div>
          <Label>Mô tả thương hiệu</Label>
          <textarea
            value={settings.brandDescription}
            onChange={e => update("brandDescription", e.target.value)}
            rows={2}
            placeholder="Mô tả ngắn về thương hiệu..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>
        <div>
          <Label hint="Unique Selling Proposition — điểm khác biệt cốt lõi">USP (Điểm khác biệt)</Label>
          <textarea
            value={settings.brandUsp}
            onChange={e => update("brandUsp", e.target.value)}
            rows={2}
            placeholder="VD: Chăm sóc sức khỏe cột sống, nâng cao chất lượng giấc ngủ..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>
        <div>
          <Label>Danh sách sản phẩm chính</Label>
          <textarea
            value={settings.brandProducts}
            onChange={e => update("brandProducts", e.target.value)}
            rows={2}
            placeholder="VD: Giường điều chỉnh điện, Bàn làm việc ergonomic, Ghế văn phòng..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
        </div>
      </Section>

      {/* ── Section 4: Defaults ─────────────────────────────────────────────── */}
      <Section
        id="defaults"
        title="Giá trị mặc định"
        subtitle="Cài đặt mặc định khi nhân viên mở form tạo kịch bản"
        expanded={expandedSections.defaults}
        onToggle={() => toggleSection("defaults")}
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Nền tảng mặc định</Label>
            <select
              value={settings.defaultPlatform}
              onChange={e => update("defaultPlatform", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
              <option value="all">Đa nền tảng</option>
            </select>
          </div>
          <div>
            <Label>Giọng điệu mặc định</Label>
            <select
              value={settings.defaultTone}
              onChange={e => update("defaultTone", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="professional">Chuyên nghiệp</option>
              <option value="casual">Thân thiện</option>
              <option value="humorous">Hài hước</option>
              <option value="emotional">Cảm xúc</option>
              <option value="educational">Giáo dục</option>
            </select>
          </div>
          <div>
            <Label hint="Thời lượng video mặc định (giây)">Thời lượng mặc định (giây)</Label>
            <input
              type="number"
              value={settings.defaultDuration}
              onChange={e => update("defaultDuration", parseInt(e.target.value))}
              min={15} max={600}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>
      </Section>

      {/* ── Section 5: Workflow ─────────────────────────────────────────────── */}
      <Section
        id="workflow"
        title="Quy trình làm việc"
        subtitle="Cài đặt luồng xử lý và giới hạn sử dụng"
        expanded={expandedSections.workflow}
        onToggle={() => toggleSection("workflow")}
      >
        <div className="space-y-3">
          {/* Auto save */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-medium text-gray-800 text-sm">Tự động lưu vào Kế hoạch</div>
              <div className="text-xs text-gray-500 mt-0.5">Kịch bản AI tạo xong sẽ tự động thêm vào Kanban</div>
            </div>
            <button
              onClick={() => update("autoSaveToKanban", !settings.autoSaveToKanban)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoSaveToKanban ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.autoSaveToKanban ? "translate-x-7" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* Require approval */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <div className="font-medium text-gray-800 text-sm">Yêu cầu duyệt kịch bản</div>
              <div className="text-xs text-gray-500 mt-0.5">Kịch bản cần admin duyệt trước khi chuyển sang sản xuất</div>
            </div>
            <button
              onClick={() => update("requireApproval", !settings.requireApproval)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.requireApproval ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.requireApproval ? "translate-x-7" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* Max generations */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-gray-800 text-sm">Giới hạn tạo kịch bản/ngày</div>
                <div className="text-xs text-gray-500 mt-0.5">Tổng số lần tạo kịch bản AI trong một ngày</div>
              </div>
              <span className="text-2xl font-bold text-amber-600">{settings.maxGenerationsPerDay}</span>
            </div>
            <input
              type="range"
              min={5} max={200} step={5}
              value={settings.maxGenerationsPerDay}
              onChange={e => update("maxGenerationsPerDay", parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5</span>
              <span>200</span>
            </div>
          </div>
        </div>

        {/* Usage tip */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-xs">
          <Zap size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Mỗi lần tạo kịch bản tiêu thụ khoảng 1,000–4,000 tokens tùy độ dài.
            Với Gemini 1.5 Flash, chi phí ước tính ~$0.001–0.004 mỗi kịch bản.
          </span>
        </div>
      </Section>

      {/* Save button bottom */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-sm hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Đang lưu..." : "Lưu tất cả cài đặt"}
        </button>
      </div>
    </div>
  );
}
