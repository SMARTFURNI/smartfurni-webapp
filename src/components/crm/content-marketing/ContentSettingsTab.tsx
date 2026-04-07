"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Bot, FileText, Palette, Sliders, Workflow,
  Save, RefreshCw, ChevronDown, ChevronUp, Info, Zap, Eye, EyeOff,
  AlertTriangle, CheckCircle2, Lock, Plus, X, ArrowRight
} from "lucide-react";

interface ContentSettings {
  id: string;
  aiProvider: "gemini" | "openai" | "claude";
  aiModel: string;
  aiFallbackModels: string[];
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

const AI_MODELS: Record<string, { label: string; icon: string; models: { value: string; label: string; desc: string; badge?: string; badgeColor?: string }[] }> = {
  gemini: {
    label: "Google Gemini",
    icon: "G",
    models: [
      { value: "gemini-2.5-flash-preview-04-17", label: "Gemini 2.5 Flash", desc: "Thông minh nhất, 20 kịch bản/ngày (free)", badge: "Đang dùng", badgeColor: "amber" },
      { value: "gemini-2.5-flash-lite-preview-06-17", label: "Gemini 2.5 Flash Lite", desc: "Không giới hạn số kịch bản/ngày, tốc độ cao", badge: "Không giới hạn", badgeColor: "green" },
      { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", desc: "500 kịch bản/ngày — giới hạn cao nhất free tier", badge: "500/ngày", badgeColor: "blue" },
      { value: "gemini-3.1-flash", label: "Gemini 3.1 Flash", desc: "Thế hệ mới nhất, 20 kịch bản/ngày", badge: "Mới", badgeColor: "purple" },
      { value: "gemini-2.0-flash", label: "Gemini 2 Flash", desc: "Không giới hạn RPD, ổn định, phù hợp backup", badge: "Không giới hạn", badgeColor: "green" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2 Flash Lite", desc: "Nhanh nhất, không giới hạn RPD", badge: "Nhanh nhất", badgeColor: "green" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Chất lượng cao nhất, kịch bản dài phức tạp", badge: "Premium", badgeColor: "rose" },
      { value: "gemini-3-flash", label: "Gemini 3 Flash", desc: "Tương đương 2.5 Flash, 20 kịch bản/ngày", badge: "Backup", badgeColor: "slate" },
      { value: "gemma-3-27b-it", label: "Gemma 4 26B", desc: "Open source, 1.500 kịch bản/ngày", badge: "1.5K/ngày", badgeColor: "teal" },
      { value: "gemma-3-27b-it-large", label: "Gemma 4 31B", desc: "Mạnh nhất Gemma 4, 1.500 kịch bản/ngày", badge: "Mạnh nhất", badgeColor: "teal" },
    ],
  },
  openai: {
    label: "OpenAI GPT",
    icon: "O",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Nhanh và tiết kiệm" },
      { value: "gpt-4o", label: "GPT-4o", desc: "Chất lượng cao nhất từ OpenAI" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Mạnh mẽ, context dài" },
    ],
  },
  claude: {
    label: "Anthropic Claude",
    icon: "A",
    models: [
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "Nhanh và hiệu quả" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", desc: "Cân bằng tốt nhất" },
      { value: "claude-opus-4-5", label: "Claude Opus", desc: "Mạnh nhất, phù hợp kịch bản sáng tạo" },
    ],
  },
};

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  amber:  { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b",  border: "rgba(245,158,11,0.3)" },
  green:  { bg: "rgba(34,197,94,0.12)",   text: "#4ade80",  border: "rgba(74,222,128,0.25)" },
  blue:   { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa",  border: "rgba(96,165,250,0.25)" },
  purple: { bg: "rgba(168,85,247,0.12)",  text: "#c084fc",  border: "rgba(192,132,252,0.25)" },
  rose:   { bg: "rgba(244,63,94,0.12)",   text: "#fb7185",  border: "rgba(251,113,133,0.25)" },
  slate:  { bg: "rgba(148,163,184,0.1)",  text: "#94a3b8",  border: "rgba(148,163,184,0.2)" },
  teal:   { bg: "rgba(20,184,166,0.12)",  text: "#2dd4bf",  border: "rgba(45,212,191,0.25)" },
};

const SECTION_CONFIG = [
  { id: "ai",       icon: "🤖", title: "Kết nối Model AI",       subtitle: "Chọn nhà cung cấp và model để tạo kịch bản",       color: "#a855f7" },
  { id: "prompt",   icon: "📝", title: "Cấu trúc Prompt",        subtitle: "Chỉnh sửa template và ngữ cảnh cho AI",             color: "#3b82f6" },
  { id: "brand",    icon: "🏷️", title: "Thông tin thương hiệu",  subtitle: "Dữ liệu SmartFurni để AI tạo nội dung đúng brand",  color: "#f59e0b" },
  { id: "defaults", icon: "⚙️", title: "Giá trị mặc định",       subtitle: "Cài đặt mặc định khi mở form tạo kịch bản",         color: "#22c55e" },
  { id: "workflow", icon: "🔄", title: "Quy trình làm việc",      subtitle: "Luồng xử lý và giới hạn sử dụng",                  color: "#f87171" },
];

// ─── Dark input/textarea/select styles ──────────────────────────────────────
const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#f5edd6",
  borderRadius: "12px",
};
const inputClass = "w-full px-3 py-2.5 text-sm focus:outline-none transition-all";

function DarkInput({ value, onChange, placeholder, type = "text", min, max, step }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string;
  type?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max} step={step}
      className={inputClass} style={inputStyle}
    />
  );
}

function DarkTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className={`${inputClass} resize-y font-mono`} style={inputStyle}
    />
  );
}

function DarkSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className={`${inputClass} appearance-none pr-8`} style={{ ...inputStyle, paddingRight: "2rem" }}
      >
        {children}
      </select>
      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{children}</label>
      {hint && (
        <div className="group relative">
          <Info size={11} style={{ color: "rgba(255,255,255,0.25)", cursor: "help" }} />
          <div className="absolute left-5 top-0 z-20 hidden group-hover:block w-56 rounded-xl p-2.5 text-xs shadow-xl"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div>
        <div className="text-sm font-semibold" style={{ color: "#f5edd6" }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</div>
      </div>
      <button onClick={onChange}
        className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.1)" }}>
        <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: value ? "translateX(28px)" : "translateX(4px)" }} />
      </button>
    </div>
  );
}

interface SectionProps {
  id: string; title: string; subtitle: string; icon: string; color: string;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}

function Section({ id, title, subtitle, icon, color, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 transition-all"
        style={{ background: expanded ? "rgba(255,255,255,0.04)" : "transparent" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            {icon}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: "#f5edd6" }}>{title}</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{subtitle}</div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="pt-5 space-y-5">{children}</div>
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
    ai: true, prompt: false, brand: false, defaults: false, workflow: false,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/crm/content/settings");
      if (res.status === 403) { setError("forbidden"); return; }
      if (!res.ok) throw new Error("Lỗi tải cài đặt");
      const data = await res.json();
      setSettings(data.settings);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/crm/content/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi lưu cài đặt"); }
      const data = await res.json();
      setSettings(data.settings); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const update = (key: keyof ContentSettings, value: unknown) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(245,158,11,0.4)", borderTopColor: "#f59e0b" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  if (error === "forbidden") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <Lock size={28} style={{ color: "#f87171" }} />
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: "#f5edd6" }}>Chỉ Admin mới có quyền truy cập</h3>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Tab Cài đặt chỉ dành cho tài khoản quản trị viên.
          </p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  const currentModels = AI_MODELS[settings.aiProvider]?.models || [];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold" style={{ color: "#f5edd6" }}>Cài đặt Content Marketing AI</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Cập nhật lần cuối: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("vi-VN") : "Chưa có"}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: saving ? "none" : "0 4px 16px rgba(245,158,11,0.35)" }}>
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>

      {/* Alerts */}
      {error && error !== "forbidden" && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
          <CheckCircle2 size={14} /> Đã lưu cài đặt thành công!
        </div>
      )}

      {/* ── Section 1: AI Model ─────────────────────────────────────────────── */}
      <Section {...SECTION_CONFIG[0]} expanded={expandedSections.ai} onToggle={() => toggleSection("ai")}>
        {/* Provider selector */}
        <div>
          <FieldLabel hint="Nhà cung cấp AI sẽ xử lý yêu cầu tạo kịch bản">Nhà cung cấp AI</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(AI_MODELS).map(([key, info]) => {
              const isActive = settings.aiProvider === key;
              return (
                <button key={key}
                  onClick={() => { update("aiProvider", key as ContentSettings["aiProvider"]); update("aiModel", AI_MODELS[key].models[0].value); }}
                  className="py-3 px-4 rounded-xl text-sm font-semibold transition-all"
                  style={isActive ? {
                    background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.15))",
                    border: "1.5px solid rgba(245,158,11,0.5)", color: "#f59e0b",
                  } : {
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                  }}>
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Model selection */}
        <div>
          <FieldLabel hint="Model cụ thể trong nhà cung cấp đã chọn">Model AI</FieldLabel>
          <div className="space-y-2">
            {currentModels.map(m => {
              const bs = BADGE_STYLES[m.badgeColor || "slate"];
              const isActive = settings.aiModel === m.value;
              return (
                <button key={m.value} onClick={() => update("aiModel", m.value)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={isActive ? {
                    background: "rgba(245,158,11,0.1)", border: "1.5px solid rgba(245,158,11,0.4)",
                  } : {
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <div className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all"
                    style={isActive ? { borderColor: "#f59e0b", background: "#f59e0b" } : { borderColor: "rgba(255,255,255,0.2)" }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold" style={{ color: isActive ? "#f5edd6" : "rgba(255,255,255,0.65)" }}>{m.label}</span>
                    <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.35)" }}>{m.desc}</span>
                  </div>
                  {m.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: bs.bg, color: bs.text, border: `1px solid ${bs.border}` }}>
                      {m.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fallback chain */}
        <div>
          <FieldLabel hint="Khi model ưu tiên bị rate limit, hệ thống tự động thử lần lượt các model dưới đây">
            Chuỗi dự phòng tự động
          </FieldLabel>
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            {/* Primary model */}
            <div className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>1</div>
              <span className="text-sm font-semibold flex-1" style={{ color: "#f5edd6" }}>
                {AI_MODELS[settings.aiProvider]?.models.find(m => m.value === settings.aiModel)?.label || settings.aiModel}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                Ưu tiên
              </span>
            </div>
            {/* Fallback models */}
            {(settings.aiFallbackModels || []).map((fm, idx) => {
              const modelInfo = AI_MODELS[settings.aiProvider]?.models.find(m => m.value === fm);
              return (
                <div key={fm} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <ArrowRight size={10} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{idx + 2}</div>
                  <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {modelInfo?.label || fm}
                  </span>
                  <button onClick={() => update("aiFallbackModels", (settings.aiFallbackModels || []).filter(m => m !== fm))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                    <X size={10} />
                  </button>
                </div>
              );
            })}
            {(settings.aiFallbackModels || []).length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: "rgba(255,255,255,0.25)" }}>Chưa có model dự phòng</p>
            )}
          </div>
          {/* Add fallback */}
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <DarkSelect value="" onChange={val => {
                if (!val) return;
                const current = settings.aiFallbackModels || [];
                if (!current.includes(val) && val !== settings.aiModel) {
                  update("aiFallbackModels", [...current, val]);
                }
              }}>
                <option value="">+ Thêm model dự phòng...</option>
                {(AI_MODELS[settings.aiProvider]?.models || []).filter(m =>
                  m.value !== settings.aiModel && !(settings.aiFallbackModels || []).includes(m.value)
                ).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </DarkSelect>
            </div>
            <button onClick={() => update("aiFallbackModels", [])}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
              Reset
            </button>
          </div>
          <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
            Chỉ fallback khi gặp lỗi 429 / RESOURCE_EXHAUSTED (hết giới hạn ngày).
          </p>
        </div>

        {/* Temperature & Max Tokens */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="Độ sáng tạo: 0 = chính xác, 1 = sáng tạo nhất. Khuyến nghị: 0.7">
              Temperature: <span style={{ color: "#f59e0b" }}>{settings.aiTemperature}</span>
            </FieldLabel>
            <input type="range" min={0} max={1} step={0.05} value={settings.aiTemperature}
              onChange={e => update("aiTemperature", parseFloat(e.target.value))}
              className="w-full accent-amber-500 mt-1" />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>Chính xác</span><span>Sáng tạo</span>
            </div>
          </div>
          <div>
            <FieldLabel hint="Giới hạn độ dài kịch bản. 8192 tokens ≈ ~6000 từ">Max Tokens</FieldLabel>
            <DarkInput type="number" value={settings.aiMaxTokens}
              onChange={v => update("aiMaxTokens", parseInt(v))} min={1024} max={32768} step={1024} />
          </div>
        </div>

        {/* API Key note */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.8)" }}>
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>
            API Key được cấu hình qua biến môi trường <code className="px-1 rounded font-mono" style={{ background: "rgba(59,130,246,0.15)" }}>GEMINI_API_KEY</code> trên Railway.
            Để đổi sang OpenAI hoặc Claude, cần thêm key tương ứng vào Railway Environment Variables.
          </span>
        </div>
      </Section>

      {/* ── Section 2: Prompt Template ──────────────────────────────────────── */}
      <Section {...SECTION_CONFIG[1]} expanded={expandedSections.prompt} onToggle={() => toggleSection("prompt")}>
        <div>
          <FieldLabel hint="Thông tin nền về thương hiệu, sản phẩm — AI dùng để hiểu ngữ cảnh">
            Ngữ cảnh thương hiệu (System Context)
          </FieldLabel>
          <DarkTextarea value={settings.promptSystemContext}
            onChange={v => update("promptSystemContext", v)}
            placeholder="Mô tả thương hiệu, sản phẩm, đối tượng khách hàng..." rows={5} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <FieldLabel hint="Template prompt chính. Dùng {{variable}} để chèn giá trị động">
              Prompt Template
            </FieldLabel>
            <button onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="flex items-center gap-1 text-xs transition-all"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              {showPromptPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPromptPreview ? "Ẩn preview" : "Xem preview"}
            </button>
          </div>
          <DarkTextarea value={settings.promptTemplate}
            onChange={v => update("promptTemplate", v)}
            placeholder="Nhập template prompt..." rows={12} />
          <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[11px] font-semibold mb-2 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Biến có thể dùng:</p>
            <div className="flex flex-wrap gap-1.5">
              {["{{brandName}}", "{{platform}}", "{{topic}}", "{{duration}}", "{{tone}}", "{{productName}}", "{{targetAudience}}", "{{additionalNotes}}"].map(v => (
                <code key={v} className="text-[11px] px-2 py-0.5 rounded-md font-mono"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>{v}</code>
              ))}
            </div>
          </div>
          {showPromptPreview && (
            <div className="mt-3 p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[11px] uppercase tracking-widest mb-2 font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Preview (dữ liệu mẫu):</p>
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: "#4ade80" }}>
                {settings.promptTemplate
                  .replace(/\{\{brandName\}\}/g, settings.brandName || "SmartFurni")
                  .replace(/\{\{platform\}\}/g, "TikTok")
                  .replace(/\{\{topic\}\}/g, "[Chủ đề video]")
                  .replace(/\{\{duration\}\}/g, "30-60 giây")
                  .replace(/\{\{tone\}\}/g, "chuyên nghiệp")
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
      <Section {...SECTION_CONFIG[2]} expanded={expandedSections.brand} onToggle={() => toggleSection("brand")}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Tên thương hiệu</FieldLabel>
            <DarkInput value={settings.brandName} onChange={v => update("brandName", v)} />
          </div>
          <div>
            <FieldLabel hint="Giọng điệu tổng thể của thương hiệu">Giọng điệu thương hiệu</FieldLabel>
            <DarkInput value={settings.brandTone} onChange={v => update("brandTone", v)}
              placeholder="VD: Chuyên nghiệp, tin cậy, gần gũi" />
          </div>
        </div>
        <div>
          <FieldLabel>Mô tả thương hiệu</FieldLabel>
          <DarkTextarea value={settings.brandDescription} onChange={v => update("brandDescription", v)}
            placeholder="Mô tả ngắn về thương hiệu..." rows={2} />
        </div>
        <div>
          <FieldLabel hint="Unique Selling Proposition — điểm khác biệt cốt lõi">USP (Điểm khác biệt)</FieldLabel>
          <DarkTextarea value={settings.brandUsp} onChange={v => update("brandUsp", v)}
            placeholder="VD: Chăm sóc sức khỏe cột sống, nâng cao chất lượng giấc ngủ..." rows={2} />
        </div>
        <div>
          <FieldLabel>Danh sách sản phẩm chính</FieldLabel>
          <DarkTextarea value={settings.brandProducts} onChange={v => update("brandProducts", v)}
            placeholder="VD: Giường điều chỉnh điện, Bàn làm việc ergonomic, Ghế văn phòng..." rows={2} />
        </div>
      </Section>

      {/* ── Section 4: Defaults ─────────────────────────────────────────────── */}
      <Section {...SECTION_CONFIG[3]} expanded={expandedSections.defaults} onToggle={() => toggleSection("defaults")}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel>Nền tảng mặc định</FieldLabel>
            <DarkSelect value={settings.defaultPlatform} onChange={v => update("defaultPlatform", v)}>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
              <option value="all">Đa nền tảng</option>
            </DarkSelect>
          </div>
          <div>
            <FieldLabel>Giọng điệu mặc định</FieldLabel>
            <DarkSelect value={settings.defaultTone} onChange={v => update("defaultTone", v)}>
              <option value="professional">Chuyên nghiệp</option>
              <option value="casual">Thân thiện</option>
              <option value="humorous">Hài hước</option>
              <option value="emotional">Cảm xúc</option>
              <option value="educational">Giáo dục</option>
            </DarkSelect>
          </div>
          <div>
            <FieldLabel hint="Thời lượng video mặc định (giây)">Thời lượng (giây)</FieldLabel>
            <DarkInput type="number" value={settings.defaultDuration}
              onChange={v => update("defaultDuration", parseInt(v))} min={15} max={600} />
          </div>
        </div>
      </Section>

      {/* ── Section 5: Workflow ─────────────────────────────────────────────── */}
      <Section {...SECTION_CONFIG[4]} expanded={expandedSections.workflow} onToggle={() => toggleSection("workflow")}>
        <Toggle value={settings.autoSaveToKanban} onChange={() => update("autoSaveToKanban", !settings.autoSaveToKanban)}
          label="Tự động lưu vào Kế hoạch"
          desc="Kịch bản AI tạo xong sẽ tự động thêm vào Kanban" />
        <Toggle value={settings.requireApproval} onChange={() => update("requireApproval", !settings.requireApproval)}
          label="Yêu cầu duyệt kịch bản"
          desc="Kịch bản cần admin duyệt trước khi chuyển sang sản xuất" />
        <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: "#f5edd6" }}>Giới hạn tạo kịch bản/ngày</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Tổng số lần tạo kịch bản AI trong một ngày</div>
            </div>
            <span className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{settings.maxGenerationsPerDay}</span>
          </div>
          <input type="range" min={5} max={200} step={5} value={settings.maxGenerationsPerDay}
            onChange={e => update("maxGenerationsPerDay", parseInt(e.target.value))}
            className="w-full accent-amber-500" />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>5</span><span>200</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)", color: "rgba(251,191,36,0.7)" }}>
          <Zap size={13} className="mt-0.5 flex-shrink-0" />
          <span>Mỗi lần tạo kịch bản tiêu thụ khoảng 1,000–4,000 tokens tùy độ dài. Với Gemini Flash, chi phí ước tính ~$0.001–0.004 mỗi kịch bản.</span>
        </div>
      </Section>

      {/* Save button bottom */}
      <div className="flex justify-end pt-2 pb-6">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: saving ? "none" : "0 6px 20px rgba(245,158,11,0.35)" }}>
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Đang lưu..." : "Lưu tất cả cài đặt"}
        </button>
      </div>
    </div>
  );
}
