"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type {
  SiteTheme,
  ThemeColors,
  PageProducts,
  PageAbout,
  PageContact,
  PageBlog,
  PageCart,
  PageCheckout,
  PageWarranty,
  PageReturns,
  TextBlock,
  HomepageFeatureItem,
} from "@/lib/theme-store";

interface PresetTheme {
  id: string;
  name: string;
  preview: string;
  colors: ThemeColors;
  isCustom?: boolean;
}

interface ThemeEditorProps {
  initialTheme: SiteTheme;
  presets: PresetTheme[];
  fontOptions: string[];
  borderRadiusOptions: { value: string; label: string }[];
}

// ─── Sections ────────────────────────────────────────────────────────────────
const SECTION_GROUPS = [
  {
    label: "🎨 Giao diện",
    items: [
      { id: "presets", label: "Giao diện mẫu", icon: "🎨" },
      { id: "colors", label: "Màu sắc", icon: "🖌️" },
      { id: "typography", label: "Kiểu chữ", icon: "Aa" },
      { id: "logo", label: "Logo & Thương hiệu", icon: "🏷️" },
      { id: "banner", label: "Banner thông báo", icon: "📢" },
      { id: "hero", label: "Trang chủ (Hero)", icon: "🏠" },
      { id: "navbar", label: "Thanh điều hướng", icon: "☰" },
      { id: "footer", label: "Chân trang", icon: "📋" },
      { id: "layout", label: "Bố cục & Hiệu ứng", icon: "⚡" },
      { id: "seo", label: "SEO & Analytics", icon: "📈" },
      { id: "video", label: "Section Video", icon: "🎥" },
      { id: "homepageFeatures", label: "Section Tính năng", icon: "⚙️" },
      { id: "homepageTestimonials", label: "Section Đánh giá", icon: "⭐" },
      { id: "homepageDownload", label: "Section Tải app", icon: "📱" },
    ],
  },
  {
    label: "📄 Nội dung trang",
    items: [
      { id: "pageProducts", label: "Trang Sản phẩm", icon: "🛍️" },
      { id: "pageAbout", label: "Trang Giới thiệu", icon: "ℹ️" },
      { id: "pageContact", label: "Trang Liên hệ", icon: "📞" },
      { id: "pageBlog", label: "Trang Blog", icon: "📝" },
      { id: "pageCart", label: "Trang Giỏ hàng", icon: "🛒" },
      { id: "pageCheckout", label: "Trang Đặt hàng", icon: "💳" },
      { id: "pageWarranty", label: "Trang Bảo hành", icon: "🛡️" },
      { id: "pageReturns", label: "Trang Đổi trả", icon: "↩️" },
    ],
  },
];

// Map section id to preview URL
const SECTION_PREVIEW_URL: Record<string, string> = {
  presets: "/", colors: "/", typography: "/", logo: "/", banner: "/",
  hero: "/", navbar: "/", footer: "/", layout: "/", seo: "/",
  pageProducts: "/products", pageAbout: "/about", pageContact: "/contact",
  pageBlog: "/blog", pageCart: "/cart", pageCheckout: "/checkout",
  pageWarranty: "/warranty", pageReturns: "/returns",
  video: "/",
  homepageFeatures: "/",
  homepageTestimonials: "/",
  homepageDownload: "/",
};

// ─── WCAG Contrast Ratio Calculator ──────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function contrastRatio(hex1: string, hex2: string): number | null {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Color Picker Input ───────────────────────────────────────────────────────
function ColorInput({
  label,
  value,
  onChange,
  contrastWith,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  contrastWith?: string;
}) {
  const ratio = contrastWith ? contrastRatio(value, contrastWith) : null;
  const contrastBadge = ratio !== null ? (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-mono ${
        ratio >= 4.5 ? "bg-green-500/20 text-green-400" :
        ratio >= 3.0 ? "bg-yellow-500/20 text-yellow-400" :
        "bg-red-500/20 text-red-400"
      }`}
      title={`Tỷ lệ tương phản WCAG: ${ratio.toFixed(1)}:1`}
    >
      {ratio >= 4.5 ? "✓" : ratio >= 3.0 ? "⚠" : "✗"} {ratio.toFixed(1)}:1
    </span>
  ) : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-[rgba(245,237,214,0.70)] flex-1">{label}</label>
        {contrastBadge}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-[rgba(255,200,100,0.22)] cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-xs font-mono focus:outline-none focus:border-[#C9A84C]/40"
        />
      </div>
    </div>
  );
}

// ─── Text Input ───────────────────────────────────────────────────────────────
function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-[rgba(245,237,214,0.70)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 placeholder-[rgba(245,237,214,0.30)]"
      />
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-white">{label}</div>
        {description && <div className="text-xs text-[rgba(245,237,214,0.55)] mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#C9A84C]" : "bg-gray-700"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

// ─── Number Slider ────────────────────────────────────────────────────────────
function SliderInput({
  label, value, onChange, min, max, step = 1, unit = "",
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[rgba(245,237,214,0.70)]">{label}</label>
        <span className="text-sm text-[#C9A84C] font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-700 accent-[#C9A84C] cursor-pointer"
      />
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
function SelectInput({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-[rgba(245,237,214,0.70)]">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── TextBlock Editor ───────────────────────────────────────────────────────
function TextBlockEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TextBlock;
  onChange: (v: TextBlock) => void;
}) {
  const fontWeightOptions = [
    { value: "light", label: "Light (300)" },
    { value: "normal", label: "Normal (400)" },
    { value: "medium", label: "Medium (500)" },
    { value: "semibold", label: "Semibold (600)" },
    { value: "bold", label: "Bold (700)" },
  ];
  return (
    <div className="p-3 rounded-xl border border-[rgba(255,200,100,0.18)] bg-[#1a1200] space-y-3">
      <div className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">{label}</div>
      <TextInput
        label="Nội dung chữ"
        value={value.text}
        onChange={(v) => onChange({ ...value, text: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <SliderInput
          label="Cỡ chữ (px)"
          value={value.fontSize}
          onChange={(v) => onChange({ ...value, fontSize: v })}
          min={10}
          max={72}
          unit="px"
        />
        <ColorInput
          label="Màu chữ"
          value={value.color}
          onChange={(v) => onChange({ ...value, color: v })}
        />
      </div>
      <SelectInput
        label="Độ đậm chữ"
        value={value.fontWeight}
        onChange={(v) => onChange({ ...value, fontWeight: v as TextBlock["fontWeight"] })}
        options={fontWeightOptions}
      />
    </div>
  );
}

// ─── Image Upload Input ───────────────────────────────────────────────────────
function ImageUploadInput({
  label, value, onChange, hint,
}: {
  label: string; value: string; onChange: (url: string) => void; hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Chỉ chấp nhận file ảnh"); return; }
    if (file.size > 2 * 1024 * 1024) { setError("File tối đa 2MB"); return; }
    setError(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload thất bại");
      const data = await res.json();
      onChange(data.url);
    } catch {
      setError("Upload thất bại, thử lại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-[rgba(245,237,214,0.70)]">{label}</label>
      {value && (
        <div className="relative w-full h-16 rounded-xl overflow-hidden border border-[rgba(255,200,100,0.22)] bg-[#1a1200]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Logo preview" className="h-full mx-auto object-contain p-2" />
          <button
            onClick={() => onChange("")}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center hover:bg-red-500"
          >✕</button>
        </div>
      )}
      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          uploading ? "border-[#C9A84C]/40 bg-[#C9A84C]/5" : "border-[rgba(255,200,100,0.22)] hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {uploading ? (
          <div className="text-xs text-[#C9A84C]">⏳ Đang tải lên...</div>
        ) : (
          <>
            <div className="text-2xl mb-1">📁</div>
            <div className="text-xs text-[rgba(245,237,214,0.70)]">Kéo thả hoặc click để chọn ảnh</div>
            {hint && <div className="text-xs text-[rgba(245,237,214,0.45)] mt-0.5">{hint}</div>}
          </>
        )}
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="text-xs text-[rgba(245,237,214,0.45)]">Hoặc nhập URL trực tiếp:</div>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/logo.png"
        className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 placeholder-[rgba(245,237,214,0.30)]"
      />
    </div>
  );
}

// ─── Website Preview (mini) ───────────────────────────────────────────────────
function WebsitePreview({ theme }: { theme: SiteTheme }) {
  const { colors, navbar, hero, banner, footer, layout } = theme;
  const borderRadiusMap: Record<string, string> = {
    none: "0px", sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px",
  };
  const br = borderRadiusMap[layout.borderRadius] || "12px";
  return (
    <div className="w-full overflow-hidden text-xs" style={{ background: colors.background, color: colors.text, fontFamily: theme.typography.fontFamily + ", sans-serif", fontSize: "11px", borderRadius: "12px", border: `1px solid ${colors.border}` }}>
      {banner.enabled && (
        <div className="px-4 py-1.5 text-center font-medium" style={{ background: banner.bgColor, color: banner.textColor }}>
          {banner.text} <span className="underline cursor-pointer">{banner.linkText}</span>
        </div>
      )}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: navbar.bgColor, borderBottom: navbar.borderBottom ? `1px solid ${colors.border}` : "none", height: `${Math.round(navbar.height * 0.5)}px` }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold" style={{ background: colors.primary, color: "#000" }}>SF</div>
          {theme.logo.showText && <span className="font-bold text-xs" style={{ color: theme.logo.textColor }}>{theme.logo.altText}</span>}
        </div>
        <div className="flex items-center gap-3" style={{ color: navbar.textColor }}>
          <span className="opacity-70">Sản phẩm</span>
          <span className="px-3 py-1 font-semibold" style={{ background: colors.primary, color: "#000", borderRadius: layout.buttonStyle === "pill" ? "9999px" : br }}>{hero.ctaText}</span>
        </div>
      </div>
      <div className="px-6 py-8 text-center" style={{ background: `linear-gradient(135deg, ${hero.bgGradientFrom}, ${hero.bgGradientTo})` }}>
        <h1 className="font-bold mb-2 leading-tight" style={{ fontSize: "16px", fontFamily: theme.typography.headingFont + ", sans-serif", color: colors.text }}>{hero.title}</h1>
        <p className="mb-4 opacity-70 text-xs leading-relaxed" style={{ color: colors.textMuted }}>{hero.subtitle.slice(0, 80)}...</p>
        <div className="flex items-center justify-center gap-2">
          <span className="px-4 py-1.5 font-semibold text-xs" style={{ background: colors.primary, color: "#000", borderRadius: layout.buttonStyle === "pill" ? "9999px" : br }}>{hero.ctaText}</span>
          <span className="px-4 py-1.5 text-xs border" style={{ borderColor: colors.border, color: colors.text, borderRadius: layout.buttonStyle === "pill" ? "9999px" : br }}>{hero.ctaSecondaryText}</span>
        </div>
      </div>
      <div className="px-4 py-4 grid grid-cols-3 gap-2">
        {["Điều chỉnh tư thế", "Theo dõi giấc ngủ", "Kết nối app"].map((title) => (
          <div key={title} className="p-3 text-center" style={{ background: colors.surface, borderRadius: br, border: `1px solid ${colors.border}` }}>
            <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs" style={{ background: colors.primary + "20", color: colors.primary }}>✦</div>
            <div className="font-medium text-xs" style={{ color: colors.text }}>{title}</div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: footer.bgColor, borderTop: `1px solid ${colors.border}`, color: footer.textColor }}>
        <div>
          <div className="font-bold text-xs" style={{ color: colors.primary }}>{footer.companyName}</div>
          <div className="opacity-60 text-xs">{footer.tagline}</div>
        </div>
        <div className="opacity-50 text-xs">{footer.copyrightText.slice(0, 30)}...</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ThemeEditorClient({
  initialTheme,
  presets,
  fontOptions,
  borderRadiusOptions,
}: ThemeEditorProps) {
  const [theme, setTheme] = useState<SiteTheme>(initialTheme);
  const [activeSection, setActiveSection] = useState("presets");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "tablet">("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Sprint 1: Undo/Redo ──────────────────────────────────────────────────
  const [historyStack, setHistoryStack] = useState<SiteTheme[]>([initialTheme]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  // ── Sprint 1: Dirty state (unsaved changes) ──────────────────────────────
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<string>(JSON.stringify(initialTheme));

  // ── Sprint 1: Autosave draft to localStorage ─────────────────────────────
  const [draftBanner, setDraftBanner] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sprint 2: Search ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Sprint 3: Custom presets ─────────────────────────────────────────────
  const [customPresets, setCustomPresets] = useState<PresetTheme[]>([]);
  const [savePresetModal, setSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // ── Sprint 4: Version history ────────────────────────────────────────────
  const [versionHistory, setVersionHistory] = useState<{ ts: string; label: string; theme: SiteTheme }[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // ── Sprint 4: Before/After comparison ───────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<SiteTheme | null>(null);
  const [compareSlider, setCompareSlider] = useState(50);

  // ── Sprint 4: Section analytics ─────────────────────────────────────────
  const [sectionLastEdited, setSectionLastEdited] = useState<Record<string, string>>({});

  // Load custom presets and version history from localStorage on mount
  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem("sf_custom_presets");
      if (storedPresets) setCustomPresets(JSON.parse(storedPresets));
      const storedHistory = localStorage.getItem("sf_version_history");
      if (storedHistory) setVersionHistory(JSON.parse(storedHistory));
      const storedSectionEdits = localStorage.getItem("sf_section_last_edited");
      if (storedSectionEdits) setSectionLastEdited(JSON.parse(storedSectionEdits));
    } catch { /* ignore */ }
  }, []);

  // Check for draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem("sf_theme_draft");
      const draftTs = localStorage.getItem("sf_theme_draft_ts");
      if (draft && draftTs) {
        const draftTheme = JSON.parse(draft) as SiteTheme;
        const savedTs = new Date(initialTheme.updatedAt || "").getTime();
        const draftTime = parseInt(draftTs);
        if (draftTime > savedTs) {
          setDraftBanner(true);
          // Store draft for potential restore
          (window as Window & { _sfDraft?: SiteTheme })._sfDraft = draftTheme;
        }
      }
    } catch { /* ignore */ }
  }, [initialTheme.updatedAt]);

  // Autosave to localStorage with debounce
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem("sf_theme_draft", JSON.stringify(theme));
        localStorage.setItem("sf_theme_draft_ts", Date.now().toString());
      } catch { /* ignore */ }
    }, 3000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [theme]);

  // Warn before unload if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      if (meta && e.key === "s") { e.preventDefault(); handleSave(); }
      if (meta && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "f" && !meta && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        setIsFullscreen((v) => !v);
      }
      if (e.key === "Escape") { setIsFullscreen(false); setCompareMode(false); setShowVersionHistory(false); setSavePresetModal(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, historyStack]);

  const pushHistory = useCallback((newTheme: SiteTheme) => {
    setHistoryStack((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      const next = [...truncated, newTheme].slice(-30); // max 30 steps
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updateSection = useCallback(
    <K extends keyof SiteTheme>(section: K, updates: Partial<SiteTheme[K]>) => {
      setTheme((prev) => {
        const newTheme = { ...prev, [section]: { ...(prev[section] as object), ...(updates as object) } };
        pushHistory(newTheme);
        setIsDirty(JSON.stringify(newTheme) !== lastSavedRef.current);
        // Track section last edited
        const now = new Date().toISOString();
        setSectionLastEdited((s) => {
          const updated = { ...s, [section as string]: now };
          try { localStorage.setItem("sf_section_last_edited", JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
        return newTheme;
      });
    },
    [pushHistory]
  );

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setTheme(historyStack[newIndex]);
    setIsDirty(JSON.stringify(historyStack[newIndex]) !== lastSavedRef.current);
  }, [canUndo, historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setTheme(historyStack[newIndex]);
    setIsDirty(JSON.stringify(historyStack[newIndex]) !== lastSavedRef.current);
  }, [canRedo, historyIndex, historyStack]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: theme }),
      });
      if (res.ok) {
        setSaved(true);
        setIsDirty(false);
        lastSavedRef.current = JSON.stringify(theme);
        setTimeout(() => setSaved(false), 3000);
        // Clear draft
        try {
          localStorage.removeItem("sf_theme_draft");
          localStorage.removeItem("sf_theme_draft_ts");
        } catch { /* ignore */ }
        // Add to version history
        const entry = { ts: new Date().toISOString(), label: `Lưu lúc ${new Date().toLocaleTimeString("vi-VN")}`, theme: { ...theme } };
        setVersionHistory((prev) => {
          const updated = [entry, ...prev].slice(0, 10);
          try { localStorage.setItem("sf_version_history", JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async (presetId: string, customPreset?: PresetTheme) => {
    const preset = customPreset || presets.find((p) => p.id === presetId);
    if (!preset) return;
    const newTheme = { ...theme, colors: { ...preset.colors } };
    setTheme(newTheme);
    pushHistory(newTheme);
    setIsDirty(true);
    if (!customPreset) {
      await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_preset", data: { presetId } }),
      });
    }
  };

  const handleReset = async () => {
    if (!confirm("Đặt lại về giao diện mặc định? Các thay đổi sẽ bị mất.")) return;
    const res = await fetch("/api/admin/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (res.ok) {
      const data = await res.json();
      setTheme(data.theme);
      pushHistory(data.theme);
      setIsDirty(false);
      lastSavedRef.current = JSON.stringify(data.theme);
    }
  };

  // ── Sprint 2: Export/Import ──────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartfurni-theme-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as SiteTheme;
        if (!imported.colors || !imported.typography) {
          alert("File không hợp lệ — thiếu trường bắt buộc.");
          return;
        }
        if (confirm(`Import theme "${imported.name || "Không tên"}"?\nCác thay đổi hiện tại sẽ bị thay thế.`)) {
          setTheme(imported);
          pushHistory(imported);
          setIsDirty(true);
        }
      } catch {
        alert("Không thể đọc file JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Sprint 3: Custom Preset ──────────────────────────────────────────────
  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: PresetTheme = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      preview: theme.colors.primary,
      colors: { ...theme.colors },
      isCustom: true,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    try { localStorage.setItem("sf_custom_presets", JSON.stringify(updated)); } catch { /* ignore */ }
    setSavePresetModal(false);
    setNewPresetName("");
  };

  const handleDeleteCustomPreset = (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try { localStorage.setItem("sf_custom_presets", JSON.stringify(updated)); } catch { /* ignore */ }
  };

  // ── Sprint 4: Color Extraction from Logo ────────────────────────────────
  const extractColorsFromLogo = useCallback(() => {
    if (!theme.logo.url) { alert("Vui lòng upload logo trước."); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colorMap: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const a = data[i + 3];
        if (a < 128) continue; // skip transparent
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }
      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
      const topColors = sorted.slice(0, 5).map(([k]) => {
        const [r, g, b] = k.split(",").map(Number);
        return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      });
      if (topColors.length > 0 && confirm(`Áp dụng màu chính từ logo: ${topColors[0]}?`)) {
        updateSection("colors", { primary: topColors[0] });
      }
    };
    img.onerror = () => alert("Không thể đọc ảnh. Hãy dùng ảnh từ cùng domain.");
    img.src = theme.logo.url;
  }, [theme.logo.url, updateSection]);

  // ── Sprint 4: Restore version ────────────────────────────────────────────
  const handleRestoreVersion = (entry: { ts: string; label: string; theme: SiteTheme }) => {
    if (!confirm(`Khôi phục phiên bản "${entry.label}"? Thay đổi hiện tại sẽ bị mất.`)) return;
    setTheme(entry.theme);
    pushHistory(entry.theme);
    setIsDirty(true);
    setShowVersionHistory(false);
  };

  // ── Sprint 3: Compare snapshot ───────────────────────────────────────────
  const handleStartCompare = () => {
    setCompareSnapshot({ ...theme });
    setCompareMode(true);
  };

  // ── Filtered sections for search ─────────────────────────────────────────
  const filteredGroups = searchQuery.trim()
    ? SECTION_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.id.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((g) => g.items.length > 0)
    : SECTION_GROUPS;

  // ── Format relative time ─────────────────────────────────────────────────
  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  // ─── Panel renderers ───────────────────────────────────────────────────────
  const renderPanel = () => {
    switch (activeSection) {
      case "presets":
        return (
          <div className="space-y-5">
            <p className="text-sm text-[rgba(245,237,214,0.70)]">Chọn giao diện mẫu để áp dụng nhanh bảng màu.</p>

            {/* Custom presets */}
            {customPresets.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-2">Preset của bạn</div>
                <div className="grid grid-cols-2 gap-2">
                  {customPresets.map((preset) => (
                    <div key={preset.id} className="relative group">
                      <button
                        onClick={() => handleApplyPreset(preset.id, preset)}
                        className="w-full p-3 rounded-xl border text-left transition-all hover:border-[rgba(255,200,100,0.08)]0"
                        style={{ background: "#130e00", borderColor: "rgba(201,168,76,0.3)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: preset.preview }} />
                          <span className="text-xs font-medium text-white truncate">{preset.name}</span>
                        </div>
                        <div className="flex gap-1">
                          {Object.values(preset.colors).slice(0, 6).map((color, i) => (
                            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: color as string }} />
                          ))}
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteCustomPreset(preset.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-xs items-center justify-center hidden group-hover:flex"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSavePresetModal(true)}
              className="w-full py-2 rounded-xl border border-[rgba(255,200,100,0.30)] text-[#C9A84C] text-sm hover:bg-[#C9A84C]/10 transition-colors"
            >
              + Lưu bộ màu hiện tại làm preset
            </button>

            <div className="text-xs font-semibold text-[rgba(245,237,214,0.55)] uppercase tracking-wider">Preset có sẵn</div>
            <div className="grid grid-cols-2 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className="p-3 rounded-xl border text-left transition-all hover:border-[rgba(255,200,100,0.08)]0"
                  style={{ background: "#130e00", borderColor: theme.colors.primary === preset.colors.primary ? "#C9A84C" : "rgba(201,168,76,0.1)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full border-2 border-white/10" style={{ background: preset.preview }} />
                    <span className="text-sm font-medium text-white">{preset.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {Object.values(preset.colors).slice(0, 6).map((color, i) => (
                      <div key={i} className="flex-1 h-2 rounded-full" style={{ background: color as string }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case "colors":
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[rgba(245,237,214,0.55)]">Kiểm tra tương phản WCAG tự động</span>
              <button
                onClick={extractColorsFromLogo}
                className="text-xs text-[#C9A84C] hover:underline"
                title="Trích xuất màu từ logo"
              >🎨 Lấy màu từ logo</button>
            </div>
            <SectionCard title="Màu chính">
              <ColorInput label="Màu chính (Primary)" value={theme.colors.primary} onChange={(v) => updateSection("colors", { primary: v })} contrastWith={theme.colors.background} />
              <ColorInput label="Màu phụ (Secondary)" value={theme.colors.secondary} onChange={(v) => updateSection("colors", { secondary: v })} contrastWith={theme.colors.background} />
              <ColorInput label="Màu nhấn (Accent)" value={theme.colors.accent} onChange={(v) => updateSection("colors", { accent: v })} contrastWith={theme.colors.background} />
            </SectionCard>
            <SectionCard title="Nền & Bề mặt">
              <ColorInput label="Nền trang" value={theme.colors.background} onChange={(v) => updateSection("colors", { background: v })} />
              <ColorInput label="Nền card/section" value={theme.colors.surface} onChange={(v) => updateSection("colors", { surface: v })} />
              <ColorInput label="Màu viền" value={theme.colors.border} onChange={(v) => updateSection("colors", { border: v })} />
            </SectionCard>
            <SectionCard title="Chữ">
              <ColorInput label="Chữ chính" value={theme.colors.text} onChange={(v) => updateSection("colors", { text: v })} contrastWith={theme.colors.background} />
              <ColorInput label="Chữ phụ (muted)" value={theme.colors.textMuted} onChange={(v) => updateSection("colors", { textMuted: v })} contrastWith={theme.colors.background} />
            </SectionCard>
            <SectionCard title="Trạng thái">
              <ColorInput label="Thành công" value={theme.colors.success} onChange={(v) => updateSection("colors", { success: v })} />
              <ColorInput label="Cảnh báo" value={theme.colors.warning} onChange={(v) => updateSection("colors", { warning: v })} />
              <ColorInput label="Lỗi" value={theme.colors.error} onChange={(v) => updateSection("colors", { error: v })} />
            </SectionCard>
          </div>
        );

      case "typography":
        return (
          <div className="space-y-5">
            <SectionCard title="Font chữ">
              <SelectInput label="Font chữ chính" value={theme.typography.fontFamily} onChange={(v) => updateSection("typography", { fontFamily: v })} options={fontOptions.map((f) => ({ value: f, label: f }))} />
              <SelectInput label="Font tiêu đề" value={theme.typography.headingFont} onChange={(v) => updateSection("typography", { headingFont: v })} options={fontOptions.map((f) => ({ value: f, label: f }))} />
            </SectionCard>
            <SectionCard title="Kích thước & Khoảng cách">
              <SliderInput label="Cỡ chữ cơ bản" value={theme.typography.baseFontSize} onChange={(v) => updateSection("typography", { baseFontSize: v })} min={12} max={20} unit="px" />
              <SliderInput label="Chiều cao dòng" value={theme.typography.lineHeight} onChange={(v) => updateSection("typography", { lineHeight: v })} min={1.2} max={2.0} step={0.1} />
              <SelectInput label="Khoảng cách chữ" value={theme.typography.letterSpacing} onChange={(v) => updateSection("typography", { letterSpacing: v })} options={[{ value: "tight", label: "Chặt (-0.05em)" }, { value: "normal", label: "Bình thường (0)" }, { value: "wide", label: "Rộng (0.05em)" }, { value: "wider", label: "Rất rộng (0.1em)" }]} />
            </SectionCard>
          </div>
        );

      case "logo":
        return (
          <div className="space-y-5">
            <SectionCard title="Logo">
              <ImageUploadInput
                label="Ảnh logo"
                value={theme.logo.url}
                onChange={(url) => updateSection("logo", { url })}
                hint="PNG/SVG/JPG, tối đa 2MB. Nền trong suốt được khuyến nghị."
              />
              <TextInput label="Tên thương hiệu (alt text)" value={theme.logo.altText} onChange={(v) => updateSection("logo", { altText: v })} />
              <SliderInput label="Chiều rộng logo" value={theme.logo.width} onChange={(v) => updateSection("logo", { width: v })} min={80} max={300} unit="px" />
              <Toggle label="Hiển thị tên bên cạnh logo" value={theme.logo.showText} onChange={(v) => updateSection("logo", { showText: v })} />
              {theme.logo.showText && (
                <ColorInput label="Màu chữ tên thương hiệu" value={theme.logo.textColor} onChange={(v) => updateSection("logo", { textColor: v })} />
              )}
            </SectionCard>
          </div>
        );

      case "banner":
        return (
          <div className="space-y-5">
            <SectionCard title="Banner thông báo">
              <Toggle label="Hiển thị banner" value={theme.banner.enabled} onChange={(v) => updateSection("banner", { enabled: v })} description="Banner xuất hiện ở đầu trang" />
              <TextInput label="Nội dung banner" value={theme.banner.text} onChange={(v) => updateSection("banner", { text: v })} placeholder="Ưu đãi đặc biệt..." />
              <TextInput label="Link URL" value={theme.banner.link} onChange={(v) => updateSection("banner", { link: v })} placeholder="/products" />
              <TextInput label="Chữ link" value={theme.banner.linkText} onChange={(v) => updateSection("banner", { linkText: v })} placeholder="Mua ngay →" />
              <ColorInput label="Màu nền banner" value={theme.banner.bgColor} onChange={(v) => updateSection("banner", { bgColor: v })} contrastWith={theme.banner.textColor} />
              <ColorInput label="Màu chữ banner" value={theme.banner.textColor} onChange={(v) => updateSection("banner", { textColor: v })} contrastWith={theme.banner.bgColor} />
              <Toggle label="Cho phép đóng banner" value={theme.banner.closeable} onChange={(v) => updateSection("banner", { closeable: v })} />
            </SectionCard>
          </div>
        );

      case "hero":
        return (
          <div className="space-y-5">
            <SectionCard title="Nội dung Hero">
              <TextInput label="Tiêu đề chính" value={theme.hero.title} onChange={(v) => updateSection("hero", { title: v })} />
              <SliderInput label="Cỡ chữ tiêu đề (px)" value={theme.hero.titleFontSize ?? 60} onChange={(v) => updateSection("hero", { titleFontSize: v })} min={24} max={96} unit="px" />
              <ColorInput label="Màu dòng 1 tiêu đề" value={theme.hero.titleColor ?? theme.colors.text} onChange={(v) => updateSection("hero", { titleColor: v })} />
              <ColorInput label="Màu dòng 2 tiêu đề (accent)" value={theme.hero.titleAccentColor ?? theme.colors.primary} onChange={(v) => updateSection("hero", { titleAccentColor: v })} />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Mô tả phụ</label>
                <textarea value={theme.hero.subtitle} onChange={(e) => updateSection("hero", { subtitle: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
              </div>
              <TextInput label="Nút CTA chính" value={theme.hero.ctaText} onChange={(v) => updateSection("hero", { ctaText: v })} />
              <TextInput label="Link CTA chính" value={theme.hero.ctaLink} onChange={(v) => updateSection("hero", { ctaLink: v })} placeholder="/products" />
              <TextInput label="Nút CTA phụ" value={theme.hero.ctaSecondaryText} onChange={(v) => updateSection("hero", { ctaSecondaryText: v })} />
            </SectionCard>
            <SectionCard title="Nền Hero">
              <ColorInput label="Màu gradient từ" value={theme.hero.bgGradientFrom} onChange={(v) => updateSection("hero", { bgGradientFrom: v })} />
              <ColorInput label="Màu gradient đến" value={theme.hero.bgGradientTo} onChange={(v) => updateSection("hero", { bgGradientTo: v })} />
              <SliderInput label="Độ mờ overlay" value={theme.hero.overlayOpacity} onChange={(v) => updateSection("hero", { overlayOpacity: v })} min={0} max={100} unit="%" />
            </SectionCard>
          </div>
        );

      case "navbar":
        return (
          <div className="space-y-5">
            <SectionCard title="Thanh điều hướng">
              <ColorInput label="Màu nền navbar" value={theme.navbar.bgColor} onChange={(v) => updateSection("navbar", { bgColor: v })} />
              <ColorInput label="Màu chữ navbar" value={theme.navbar.textColor} onChange={(v) => updateSection("navbar", { textColor: v })} contrastWith={theme.navbar.bgColor} />
              <SliderInput label="Chiều cao navbar" value={theme.navbar.height} onChange={(v) => updateSection("navbar", { height: v })} min={48} max={96} unit="px" />
              <Toggle label="Navbar cố định (sticky)" value={theme.navbar.sticky} onChange={(v) => updateSection("navbar", { sticky: v })} description="Navbar luôn hiển thị khi cuộn trang" />
              <Toggle label="Hiển thị đường kẻ dưới" value={theme.navbar.borderBottom} onChange={(v) => updateSection("navbar", { borderBottom: v })} />
              <Toggle label="Hiển thị bóng đổ" value={theme.navbar.showShadow} onChange={(v) => updateSection("navbar", { showShadow: v })} />
            </SectionCard>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-5">
            <SectionCard title="Thông tin chân trang">
              <TextInput label="Tên công ty" value={theme.footer.companyName} onChange={(v) => updateSection("footer", { companyName: v })} />
              <TextInput label="Slogan" value={theme.footer.tagline} onChange={(v) => updateSection("footer", { tagline: v })} />
              <TextInput label="Số điện thoại / Hotline" value={(theme.footer as unknown as Record<string, string>).phone ?? ""} onChange={(v) => updateSection("footer", { phone: v } as Partial<SiteTheme["footer"]>)} placeholder="1800 1234 56" />
              <TextInput label="Email liên hệ" value={(theme.footer as unknown as Record<string, string>).email ?? ""} onChange={(v) => updateSection("footer", { email: v } as Partial<SiteTheme["footer"]>)} placeholder="hello@smartfurni.vn" />
              <TextInput label="Bản quyền" value={theme.footer.copyrightText} onChange={(v) => updateSection("footer", { copyrightText: v })} />
              <ColorInput label="Màu nền footer" value={theme.footer.bgColor} onChange={(v) => updateSection("footer", { bgColor: v })} />
              <ColorInput label="Màu chữ footer" value={theme.footer.textColor} onChange={(v) => updateSection("footer", { textColor: v })} contrastWith={theme.footer.bgColor} />
            </SectionCard>
            <SectionCard title="Mạng xã hội">
              <Toggle label="Hiển thị mạng xã hội" value={theme.footer.showSocialLinks} onChange={(v) => updateSection("footer", { showSocialLinks: v })} />
              {theme.footer.showSocialLinks && (
                <>
                  <TextInput label="Facebook" value={theme.footer.socialLinks.facebook} onChange={(v) => updateSection("footer", { socialLinks: { ...theme.footer.socialLinks, facebook: v } })} placeholder="https://facebook.com/..." />
                  <TextInput label="Instagram" value={theme.footer.socialLinks.instagram} onChange={(v) => updateSection("footer", { socialLinks: { ...theme.footer.socialLinks, instagram: v } })} placeholder="https://instagram.com/..." />
                  <TextInput label="YouTube" value={theme.footer.socialLinks.youtube} onChange={(v) => updateSection("footer", { socialLinks: { ...theme.footer.socialLinks, youtube: v } })} placeholder="https://youtube.com/..." />
                  <TextInput label="TikTok" value={theme.footer.socialLinks.tiktok} onChange={(v) => updateSection("footer", { socialLinks: { ...theme.footer.socialLinks, tiktok: v } })} placeholder="https://tiktok.com/..." />
                </>
              )}
            </SectionCard>
          </div>
        );

      case "layout":
        return (
          <div className="space-y-5">
            <SectionCard title="Bố cục">
              <SliderInput label="Chiều rộng tối đa" value={theme.layout.maxWidth} onChange={(v) => updateSection("layout", { maxWidth: v })} min={960} max={1920} step={64} unit="px" />
              <SliderInput label="Khoảng cách giữa sections" value={theme.layout.sectionSpacing} onChange={(v) => updateSection("layout", { sectionSpacing: v })} min={2} max={12} step={0.5} unit="rem" />
            </SectionCard>
            <SectionCard title="Kiểu dáng">
              <SelectInput label="Bo góc" value={theme.layout.borderRadius} onChange={(v) => updateSection("layout", { borderRadius: v })} options={borderRadiusOptions} />
              <SelectInput label="Kiểu nút bấm" value={theme.layout.buttonStyle} onChange={(v) => updateSection("layout", { buttonStyle: v })} options={[{ value: "square", label: "Vuông" }, { value: "rounded", label: "Bo góc" }, { value: "pill", label: "Viên thuốc (pill)" }]} />
              <SelectInput label="Bóng đổ card" value={theme.layout.cardShadow} onChange={(v) => updateSection("layout", { cardShadow: v })} options={[{ value: "none", label: "Không có" }, { value: "sm", label: "Nhỏ" }, { value: "md", label: "Vừa" }, { value: "lg", label: "Lớn" }]} />
            </SectionCard>
            <SectionCard title="Hiệu ứng">
              <Toggle label="Bật hiệu ứng chuyển động" value={theme.layout.animationsEnabled} onChange={(v) => updateSection("layout", { animationsEnabled: v })} description="Fade in, slide, hover animations" />
            </SectionCard>
          </div>
        );

      case "seo":
        return (
          <div className="space-y-5">
            <SectionCard title="Thông tin SEO">
              <TextInput label="Tiêu đề website" value={theme.seo.siteTitle} onChange={(v) => updateSection("seo", { siteTitle: v })} />
              <SelectInput label="Ký tự phân cách tiêu đề" value={theme.seo.titleSeparator} onChange={(v) => updateSection("seo", { titleSeparator: v })} options={[{ value: " | ", label: "Gạch đứng ( | )" }, { value: " - ", label: "Gạch ngang ( - )" }, { value: " · ", label: "Chấm giữa ( · )" }, { value: " › ", label: "Mũi tên ( › )" }]} />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Mô tả mặc định</label>
                <textarea value={theme.seo.defaultDescription} onChange={(e) => updateSection("seo", { defaultDescription: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" maxLength={160} />
                <div className="text-xs text-[rgba(245,237,214,0.45)] text-right">{theme.seo.defaultDescription.length}/160</div>
              </div>
              <TextInput label="URL ảnh OG (Open Graph)" value={theme.seo.ogImage} onChange={(v) => updateSection("seo", { ogImage: v })} placeholder="https://example.com/og-image.jpg" />
            </SectionCard>
            <SectionCard title="Analytics">
              <TextInput label="Google Analytics ID" value={theme.seo.googleAnalyticsId} onChange={(v) => updateSection("seo", { googleAnalyticsId: v })} placeholder="G-XXXXXXXXXX" />
              <TextInput label="Facebook Pixel ID" value={theme.seo.facebookPixelId} onChange={(v) => updateSection("seo", { facebookPixelId: v })} placeholder="1234567890" />
            </SectionCard>
          </div>
        );

      case "pageProducts":
        return (
          <div className="space-y-5">
            <SectionCard title="Hero Section">
              <TextInput label="Badge nhỏ" value={theme.pageProducts.heroBadge} onChange={(v) => updateSection("pageProducts", { heroBadge: v })} placeholder="Khám phá sản phẩm" />
              <TextInput label="Tiêu đề chính" value={theme.pageProducts.heroTitle} onChange={(v) => updateSection("pageProducts", { heroTitle: v })} />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Mô tả phụ</label>
                <textarea value={theme.pageProducts.heroSubtitle} onChange={(e) => updateSection("pageProducts", { heroSubtitle: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
              </div>
            </SectionCard>
            <SectionCard title="Bộ lọc & Danh sách">
              <TextInput label="Nhãn bộ lọc" value={theme.pageProducts.filterLabel} onChange={(v) => updateSection("pageProducts", { filterLabel: v })} />
              <TextInput label="Nút so sánh" value={theme.pageProducts.compareLabel} onChange={(v) => updateSection("pageProducts", { compareLabel: v })} />
            </SectionCard>
            <SectionCard title="Trạng thái rỗng">
              <TextInput label="Tiêu đề không có kết quả" value={theme.pageProducts.emptyTitle} onChange={(v) => updateSection("pageProducts", { emptyTitle: v })} />
              <TextInput label="Mô tả không có kết quả" value={theme.pageProducts.emptySubtitle} onChange={(v) => updateSection("pageProducts", { emptySubtitle: v })} />
            </SectionCard>
          </div>
        );

      case "pageAbout":
        return (
          <div className="space-y-5">
            <SectionCard title="Hero Section">
              <TextInput label="Badge nhỏ" value={theme.pageAbout.heroBadge} onChange={(v) => updateSection("pageAbout", { heroBadge: v })} />
              <TextInput label="Tiêu đề chính" value={theme.pageAbout.heroTitle} onChange={(v) => updateSection("pageAbout", { heroTitle: v })} />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Mô tả phụ</label>
                <textarea value={theme.pageAbout.heroSubtitle} onChange={(e) => updateSection("pageAbout", { heroSubtitle: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
              </div>
            </SectionCard>
            <SectionCard title="Sứ mệnh & Tầm nhìn">
              <TextInput label="Tiêu đề sứ mệnh" value={theme.pageAbout.missionTitle} onChange={(v) => updateSection("pageAbout", { missionTitle: v })} />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Nội dung sứ mệnh</label>
                <textarea value={theme.pageAbout.missionText} onChange={(e) => updateSection("pageAbout", { missionText: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
              </div>
              <TextInput label="Tiêu đề tầm nhìn" value={theme.pageAbout.visionTitle} onChange={(v) => updateSection("pageAbout", { visionTitle: v })} />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Nội dung tầm nhìn</label>
                <textarea value={theme.pageAbout.visionText} onChange={(e) => updateSection("pageAbout", { visionText: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
              </div>
            </SectionCard>
            <SectionCard title="Thống kê">
              <div className="grid grid-cols-2 gap-2">
                <TextInput label="Số 1" value={theme.pageAbout.stat1Number} onChange={(v) => updateSection("pageAbout", { stat1Number: v })} />
                <TextInput label="Nhãn 1" value={theme.pageAbout.stat1Label} onChange={(v) => updateSection("pageAbout", { stat1Label: v })} />
                <TextInput label="Số 2" value={theme.pageAbout.stat2Number} onChange={(v) => updateSection("pageAbout", { stat2Number: v })} />
                <TextInput label="Nhãn 2" value={theme.pageAbout.stat2Label} onChange={(v) => updateSection("pageAbout", { stat2Label: v })} />
                <TextInput label="Số 3" value={theme.pageAbout.stat3Number} onChange={(v) => updateSection("pageAbout", { stat3Number: v })} />
                <TextInput label="Nhãn 3" value={theme.pageAbout.stat3Label} onChange={(v) => updateSection("pageAbout", { stat3Label: v })} />
                <TextInput label="Số 4" value={theme.pageAbout.stat4Number} onChange={(v) => updateSection("pageAbout", { stat4Number: v })} />
                <TextInput label="Nhãn 4" value={theme.pageAbout.stat4Label} onChange={(v) => updateSection("pageAbout", { stat4Label: v })} />
              </div>
            </SectionCard>
            <SectionCard title="Đội ngũ">
              <TextInput label="Tiêu đề đội ngũ" value={theme.pageAbout.teamTitle} onChange={(v) => updateSection("pageAbout", { teamTitle: v })} />
              <TextInput label="Mô tả đội ngũ" value={theme.pageAbout.teamSubtitle} onChange={(v) => updateSection("pageAbout", { teamSubtitle: v })} />
            </SectionCard>
            <SectionCard title="CTA cuối trang">
              <TextInput label="Tiêu đề CTA" value={theme.pageAbout.ctaTitle} onChange={(v) => updateSection("pageAbout", { ctaTitle: v })} />
              <TextInput label="Mô tả CTA" value={theme.pageAbout.ctaSubtitle} onChange={(v) => updateSection("pageAbout", { ctaSubtitle: v })} />
              <TextInput label="Nút CTA" value={theme.pageAbout.ctaButton} onChange={(v) => updateSection("pageAbout", { ctaButton: v })} />
            </SectionCard>
          </div>
        );

      case "pageContact":
        return (
          <div className="space-y-5">
            <SectionCard title="Hero Section">
              <TextInput label="Badge nhỏ" value={theme.pageContact.heroBadge} onChange={(v) => updateSection("pageContact", { heroBadge: v })} />
              <TextInput label="Tiêu đề chính" value={theme.pageContact.heroTitle} onChange={(v) => updateSection("pageContact", { heroTitle: v })} />
              <TextInput label="Mô tả phụ" value={theme.pageContact.heroSubtitle} onChange={(v) => updateSection("pageContact", { heroSubtitle: v })} />
            </SectionCard>
            <SectionCard title="Form liên hệ">
              <TextInput label="Tiêu đề form" value={theme.pageContact.formTitle} onChange={(v) => updateSection("pageContact", { formTitle: v })} />
              <TextInput label="Mô tả form" value={theme.pageContact.formSubtitle} onChange={(v) => updateSection("pageContact", { formSubtitle: v })} />
            </SectionCard>
            <SectionCard title="Thông tin liên hệ">
              <TextInput label="Số điện thoại" value={theme.pageContact.phone} onChange={(v) => updateSection("pageContact", { phone: v })} placeholder="0901 234 567" />
              <TextInput label="Email" value={theme.pageContact.email} onChange={(v) => updateSection("pageContact", { email: v })} placeholder="hello@smartfurni.vn" />
              <TextInput label="Địa chỉ" value={theme.pageContact.address} onChange={(v) => updateSection("pageContact", { address: v })} />
              <TextInput label="Giờ làm việc" value={theme.pageContact.workingHours} onChange={(v) => updateSection("pageContact", { workingHours: v })} placeholder="Thứ 2 - Thứ 7: 8:00 - 18:00" />
              <TextInput label="URL bản đồ (Google Maps embed)" value={theme.pageContact.mapEmbedUrl} onChange={(v) => updateSection("pageContact", { mapEmbedUrl: v })} placeholder="https://maps.google.com/maps?..." />
            </SectionCard>
          </div>
        );

      case "pageBlog":
        return (
          <div className="space-y-5">
            <SectionCard title="Hero Section">
              <TextInput label="Badge nhỏ" value={theme.pageBlog.heroBadge} onChange={(v) => updateSection("pageBlog", { heroBadge: v })} />
              <TextInput label="Tiêu đề chính" value={theme.pageBlog.heroTitle} onChange={(v) => updateSection("pageBlog", { heroTitle: v })} />
              <TextInput label="Mô tả phụ" value={theme.pageBlog.heroSubtitle} onChange={(v) => updateSection("pageBlog", { heroSubtitle: v })} />
            </SectionCard>
            <SectionCard title="Danh sách bài viết">
              <TextInput label="Placeholder tìm kiếm" value={theme.pageBlog.searchPlaceholder} onChange={(v) => updateSection("pageBlog", { searchPlaceholder: v })} />
              <TextInput label="Tiêu đề bài nổi bật" value={theme.pageBlog.featuredTitle} onChange={(v) => updateSection("pageBlog", { featuredTitle: v })} />
              <TextInput label="Tiêu đề tất cả bài" value={theme.pageBlog.allPostsTitle} onChange={(v) => updateSection("pageBlog", { allPostsTitle: v })} />
            </SectionCard>
            <SectionCard title="Newsletter">
              <TextInput label="Tiêu đề newsletter" value={theme.pageBlog.newsletterTitle} onChange={(v) => updateSection("pageBlog", { newsletterTitle: v })} />
              <TextInput label="Mô tả newsletter" value={theme.pageBlog.newsletterSubtitle} onChange={(v) => updateSection("pageBlog", { newsletterSubtitle: v })} />
            </SectionCard>
          </div>
        );

      case "pageCart":
        return (
          <div className="space-y-5">
            <SectionCard title="Tiêu đề & Trạng thái">
              <TextInput label="Tiêu đề trang" value={theme.pageCart.title} onChange={(v) => updateSection("pageCart", { title: v })} />
              <TextInput label="Tiêu đề giỏ trống" value={theme.pageCart.emptyTitle} onChange={(v) => updateSection("pageCart", { emptyTitle: v })} />
              <TextInput label="Mô tả giỏ trống" value={theme.pageCart.emptySubtitle} onChange={(v) => updateSection("pageCart", { emptySubtitle: v })} />
            </SectionCard>
            <SectionCard title="Upsell & Thanh toán">
              <TextInput label="Tiêu đề upsell" value={theme.pageCart.upsellTitle} onChange={(v) => updateSection("pageCart", { upsellTitle: v })} />
              <TextInput label="Tiêu đề tóm tắt" value={theme.pageCart.summaryTitle} onChange={(v) => updateSection("pageCart", { summaryTitle: v })} />
              <TextInput label="Nút tiến hành" value={theme.pageCart.checkoutButton} onChange={(v) => updateSection("pageCart", { checkoutButton: v })} />
            </SectionCard>
            <SectionCard title="Trust Badges">
              <TextInput label="Badge 1" value={theme.pageCart.trustBadge1} onChange={(v) => updateSection("pageCart", { trustBadge1: v })} />
              <TextInput label="Badge 2" value={theme.pageCart.trustBadge2} onChange={(v) => updateSection("pageCart", { trustBadge2: v })} />
              <TextInput label="Badge 3" value={theme.pageCart.trustBadge3} onChange={(v) => updateSection("pageCart", { trustBadge3: v })} />
            </SectionCard>
          </div>
        );

      case "pageCheckout":
        return (
          <div className="space-y-5">
            <SectionCard title="Tiêu đề & Bước">
              <TextInput label="Tiêu đề trang" value={theme.pageCheckout.title} onChange={(v) => updateSection("pageCheckout", { title: v })} />
              <TextInput label="Bước 1" value={theme.pageCheckout.step1Title} onChange={(v) => updateSection("pageCheckout", { step1Title: v })} />
              <TextInput label="Bước 2" value={theme.pageCheckout.step2Title} onChange={(v) => updateSection("pageCheckout", { step2Title: v })} />
              <TextInput label="Bước 3" value={theme.pageCheckout.step3Title} onChange={(v) => updateSection("pageCheckout", { step3Title: v })} />
              <TextInput label="Tiêu đề tóm tắt" value={theme.pageCheckout.summaryTitle} onChange={(v) => updateSection("pageCheckout", { summaryTitle: v })} />
              <TextInput label="Nút đặt hàng" value={theme.pageCheckout.submitButton} onChange={(v) => updateSection("pageCheckout", { submitButton: v })} />
            </SectionCard>
            <SectionCard title="Thông tin chuyển khoản">
              <TextInput label="Tên ngân hàng" value={theme.pageCheckout.bankName} onChange={(v) => updateSection("pageCheckout", { bankName: v })} placeholder="Vietcombank" />
              <TextInput label="Số tài khoản" value={theme.pageCheckout.bankAccount} onChange={(v) => updateSection("pageCheckout", { bankAccount: v })} />
              <TextInput label="Chủ tài khoản" value={theme.pageCheckout.bankHolder} onChange={(v) => updateSection("pageCheckout", { bankHolder: v })} />
            </SectionCard>
            <SectionCard title="Thông tin MoMo">
              <TextInput label="Số điện thoại MoMo" value={theme.pageCheckout.momoPhone} onChange={(v) => updateSection("pageCheckout", { momoPhone: v })} />
              <TextInput label="Tên tài khoản MoMo" value={theme.pageCheckout.momoName} onChange={(v) => updateSection("pageCheckout", { momoName: v })} />
            </SectionCard>
          </div>
        );

      case "pageWarranty":
        return (
          <div className="space-y-5">
            <SectionCard title="Hero Section">
              <TextInput label="Badge nhỏ" value={theme.pageWarranty.heroBadge} onChange={(v) => updateSection("pageWarranty", { heroBadge: v })} />
              <TextInput label="Tiêu đề chính" value={theme.pageWarranty.heroTitle} onChange={(v) => updateSection("pageWarranty", { heroTitle: v })} />
              <TextInput label="Mô tả phụ" value={theme.pageWarranty.heroSubtitle} onChange={(v) => updateSection("pageWarranty", { heroSubtitle: v })} />
            </SectionCard>
            <SectionCard title="Chính sách bảo hành">
              <TextInput label="Bảo hành SmartFurni Basic (năm)" value={theme.pageWarranty.basicWarrantyYears} onChange={(v) => updateSection("pageWarranty", { basicWarrantyYears: v })} placeholder="3" />
              <TextInput label="Bảo hành SmartFurni Pro (năm)" value={theme.pageWarranty.proWarrantyYears} onChange={(v) => updateSection("pageWarranty", { proWarrantyYears: v })} placeholder="4" />
              <TextInput label="Bảo hành SmartFurni Elite (năm)" value={theme.pageWarranty.eliteWarrantyYears} onChange={(v) => updateSection("pageWarranty", { eliteWarrantyYears: v })} placeholder="5" />
              <div className="space-y-1.5">
                <label className="text-sm text-[rgba(245,237,214,0.70)]">Phạm vi bảo hành</label>
                <textarea value={theme.pageWarranty.warrantyScope} onChange={(e) => updateSection("pageWarranty", { warrantyScope: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none" />
              </div>
            </SectionCard>
            <SectionCard title="Liên hệ bảo hành">
              <TextInput label="Tiêu đề quy trình" value={theme.pageWarranty.processTitle} onChange={(v) => updateSection("pageWarranty", { processTitle: v })} />
              <TextInput label="Hotline bảo hành" value={theme.pageWarranty.hotline} onChange={(v) => updateSection("pageWarranty", { hotline: v })} />
              <TextInput label="Email bảo hành" value={theme.pageWarranty.email} onChange={(v) => updateSection("pageWarranty", { email: v })} />
            </SectionCard>
          </div>
        );

      case "pageReturns":
        return (
          <div className="space-y-5">
            <SectionCard title="Hero Section">
              <TextInput label="Badge nhỏ" value={theme.pageReturns.heroBadge} onChange={(v) => updateSection("pageReturns", { heroBadge: v })} />
              <TextInput label="Tiêu đề chính" value={theme.pageReturns.heroTitle} onChange={(v) => updateSection("pageReturns", { heroTitle: v })} />
              <TextInput label="Mô tả phụ" value={theme.pageReturns.heroSubtitle} onChange={(v) => updateSection("pageReturns", { heroSubtitle: v })} />
            </SectionCard>
            <SectionCard title="Chính sách đổi trả">
              <TextInput label="Số ngày đổi trả" value={theme.pageReturns.returnDays} onChange={(v) => updateSection("pageReturns", { returnDays: v })} placeholder="30" />
              <TextInput label="Số ngày dùng thử" value={theme.pageReturns.trialDays} onChange={(v) => updateSection("pageReturns", { trialDays: v })} placeholder="30" />
              <TextInput label="Điều kiện 1" value={theme.pageReturns.condition1} onChange={(v) => updateSection("pageReturns", { condition1: v })} />
              <TextInput label="Điều kiện 2" value={theme.pageReturns.condition2} onChange={(v) => updateSection("pageReturns", { condition2: v })} />
              <TextInput label="Điều kiện 3" value={theme.pageReturns.condition3} onChange={(v) => updateSection("pageReturns", { condition3: v })} />
            </SectionCard>
            <SectionCard title="Liên hệ đổi trả">
              <TextInput label="Tiêu đề quy trình" value={theme.pageReturns.processTitle} onChange={(v) => updateSection("pageReturns", { processTitle: v })} />
              <TextInput label="Hotline đổi trả" value={theme.pageReturns.hotline} onChange={(v) => updateSection("pageReturns", { hotline: v })} />
              <TextInput label="Email đổi trả" value={theme.pageReturns.email} onChange={(v) => updateSection("pageReturns", { email: v })} />
            </SectionCard>
          </div>
        );

      case "video":
        return (
          <div className="space-y-5">
            <SectionCard title="Section Video">
              <Toggle
                label="Hiển thị section video"
                value={theme.videoSection?.enabled ?? true}
                onChange={(v) => updateSection("videoSection", { enabled: v })}
                description="Section video xuất hiện trên trang chủ"
              />
              <TextInput
                label="Nhãn section (chữ nhỏ phía trên)"
                value={theme.videoSection?.sectionLabel ?? ""}
                onChange={(v) => updateSection("videoSection", { sectionLabel: v })}
                placeholder="Xem sản phẩm hoạt động thực tế"
              />
              <TextInput
                label="Tiêu đề section"
                value={theme.videoSection?.sectionTitle ?? ""}
                onChange={(v) => updateSection("videoSection", { sectionTitle: v })}
                placeholder="Giường Điều Khiển Thông Minh SmartFurni — Xem Thực Tế"
              />
            </SectionCard>

            <SectionCard title="Danh sách video">
              <div className="space-y-4">
                {(theme.videoSection?.videos ?? []).map((video, idx) => (
                  <div key={video.id} className="p-4 rounded-xl border border-[rgba(255,200,100,0.18)] bg-[#1a1200] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#C9A84C]">Video {idx + 1}</span>
                      <button
                        onClick={() => {
                          const newVideos = (theme.videoSection?.videos ?? []).filter((_, i) => i !== idx);
                          updateSection("videoSection", { videos: newVideos });
                        }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/20 hover:border-red-300/40 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                    <TextInput
                      label="YouTube ID"
                      value={video.youtubeId}
                      onChange={(v) => {
                        const newVideos = [...(theme.videoSection?.videos ?? [])];
                        newVideos[idx] = { ...newVideos[idx], youtubeId: v };
                        updateSection("videoSection", { videos: newVideos });
                      }}
                      placeholder="YuZ81jo6_fQ"
                    />
                    <TextInput
                      label="Tiêu đề video"
                      value={video.title}
                      onChange={(v) => {
                        const newVideos = [...(theme.videoSection?.videos ?? [])];
                        newVideos[idx] = { ...newVideos[idx], title: v };
                        updateSection("videoSection", { videos: newVideos });
                      }}
                      placeholder="Giới thiệu sản phẩm SmartFurni"
                    />
                    <TextInput
                      label="Nhãn video"
                      value={video.label ?? ""}
                      onChange={(v) => {
                        const newVideos = [...(theme.videoSection?.videos ?? [])];
                        newVideos[idx] = { ...newVideos[idx], label: v };
                        updateSection("videoSection", { videos: newVideos });
                      }}
                      placeholder="Video giới thiệu"
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newVideo = { id: `v${Date.now()}`, youtubeId: "", title: "", label: "" };
                    const newVideos = [...(theme.videoSection?.videos ?? []), newVideo];
                    updateSection("videoSection", { videos: newVideos });
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[rgba(255,200,100,0.30)] text-[#C9A84C]/70 hover:text-[#C9A84C] hover:border-[rgba(255,200,100,0.08)]0 text-sm transition-colors"
                >
                  + Thêm video
                </button>
              </div>
            </SectionCard>
          </div>
        );

      case "homepageFeatures": {
        const feat = theme.homepageSections?.features;
        if (!feat) return null;
        return (
          <div className="space-y-5">
            <SectionCard title="Tiêu đề section">
              <TextBlockEditor
                label="Badge (nhãn nhỏ phía trên)"
                value={feat.badge}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, badge: v } })}
              />
              <TextBlockEditor
                label="Tiêu đề dòng 1"
                value={feat.title}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, title: v } })}
              />
              <TextBlockEditor
                label="Tiêu đề dòng 2 (màu vàng)"
                value={feat.titleAccent}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, titleAccent: v } })}
              />
              <TextBlockEditor
                label="Mô tả (subtitle)"
                value={feat.subtitle}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, subtitle: v } })}
              />
            </SectionCard>
            <SectionCard title="Các tính năng">
              <div className="space-y-3">
                {feat.items.map((item: HomepageFeatureItem, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-[rgba(255,200,100,0.14)] bg-[#1a1200] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs text-[rgba(245,237,214,0.70)]">Tính năng {idx + 1}</span>
                    </div>
                    <TextInput
                      label="Tiêu đề"
                      value={item.title}
                      onChange={(v) => {
                        const newItems = feat.items.map((it: HomepageFeatureItem, i: number) => i === idx ? { ...it, title: v } : it);
                        updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, items: newItems } });
                      }}
                    />
                    <TextInput
                      label="Mô tả"
                      value={item.desc}
                      onChange={(v) => {
                        const newItems = feat.items.map((it: HomepageFeatureItem, i: number) => i === idx ? { ...it, desc: v } : it);
                        updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, items: newItems } });
                      }}
                    />
                    <TextInput
                      label="Biểu tượng (emoji)"
                      value={item.icon}
                      onChange={(v) => {
                        const newItems = feat.items.map((it: HomepageFeatureItem, i: number) => i === idx ? { ...it, icon: v } : it);
                        updateSection("homepageSections", { ...theme.homepageSections, features: { ...feat, items: newItems } });
                      }}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        );
      }

      case "homepageTestimonials": {
        const test = theme.homepageSections?.testimonials;
        if (!test) return null;
        return (
          <div className="space-y-5">
            <SectionCard title="Tiêu đề section">
              <TextBlockEditor
                label="Badge (nhãn nhỏ phía trên)"
                value={test.badge}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, testimonials: { ...test, badge: v } })}
              />
              <TextBlockEditor
                label="Tiêu đề dòng 1"
                value={test.title}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, testimonials: { ...test, title: v } })}
              />
              <TextBlockEditor
                label="Tiêu đề dòng 2 (màu vàng)"
                value={test.titleAccent}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, testimonials: { ...test, titleAccent: v } })}
              />
              <TextBlockEditor
                label="Mô tả (subtitle)"
                value={test.subtitle}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, testimonials: { ...test, subtitle: v } })}
              />
            </SectionCard>
            <SectionCard title="Nhãn phụ">
              <TextInput
                label="Nhãn số đánh giá"
                value={test.ratingLabel}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, testimonials: { ...test, ratingLabel: v } })}
                placeholder="Dựa trên 10.247 đánh giá"
              />
              <TextInput
                label="Nhãn được tin dùng"
                value={test.trustedByLabel}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, testimonials: { ...test, trustedByLabel: v } })}
                placeholder="Được tin dùng bởi"
              />
            </SectionCard>
          </div>
        );
      }

      case "homepageDownload": {
        const dl = theme.homepageSections?.download;
        if (!dl) return null;
        return (
          <div className="space-y-5">
            <SectionCard title="Tiêu đề section">
              <TextBlockEditor
                label="Badge (nhãn nhỏ phía trên)"
                value={dl.badge}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, download: { ...dl, badge: v } })}
              />
              <TextBlockEditor
                label="Tiêu đề"
                value={dl.title}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, download: { ...dl, title: v } })}
              />
              <TextBlockEditor
                label="Mô tả (subtitle)"
                value={dl.subtitle}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, download: { ...dl, subtitle: v } })}
              />
            </SectionCard>
            <SectionCard title="Nhãn nút tải">
              <TextInput
                label="Nhãn App Store"
                value={dl.appStoreLabel}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, download: { ...dl, appStoreLabel: v } })}
                placeholder="App Store"
              />
              <TextInput
                label="Nhãn Google Play"
                value={dl.googlePlayLabel}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, download: { ...dl, googlePlayLabel: v } })}
                placeholder="Google Play"
              />
              <TextInput
                label="Chữ đánh giá app"
                value={dl.ratingText}
                onChange={(v) => updateSection("homepageSections", { ...theme.homepageSections, download: { ...dl, ratingText: v } })}
                placeholder="4.9 ★ trên App Store và Google Play"
              />
            </SectionCard>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const previewUrl = SECTION_PREVIEW_URL[activeSection] ?? "/";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Draft recovery banner ── */}
      {draftBanner && (
        <div className="mb-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
          <span className="text-amber-300">💾 Phát hiện bản nháp chưa lưu. Khôi phục?</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const draft = (window as Window & { _sfDraft?: SiteTheme })._sfDraft;
                if (draft) { setTheme(draft); pushHistory(draft); setIsDirty(true); }
                setDraftBanner(false);
              }}
              className="px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400"
            >Khôi phục</button>
            <button onClick={() => { setDraftBanner(false); try { localStorage.removeItem("sf_theme_draft"); localStorage.removeItem("sf_theme_draft_ts"); } catch { /* ignore */ } }} className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 text-xs hover:bg-gray-600">Bỏ qua</button>
          </div>
        </div>
      )}

      {/* ── Save Preset Modal ── */}
      {savePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.30)] rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-white font-semibold mb-4">Lưu preset tùy chỉnh</h3>
            <div className="mb-4">
              <div className="flex gap-1 mb-3">
                {Object.values(theme.colors).slice(0, 8).map((color, i) => (
                  <div key={i} className="flex-1 h-4 rounded" style={{ background: color as string }} />
                ))}
              </div>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Tên preset (vd: Tết 2025)"
                className="w-full px-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.22)] text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveCustomPreset(); if (e.key === "Escape") setSavePresetModal(false); }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveCustomPreset} disabled={!newPresetName.trim()} className="flex-1 py-2 rounded-xl bg-[#C9A84C] text-black font-semibold text-sm hover:bg-[#E2C97E] disabled:opacity-40">Lưu</button>
              <button onClick={() => { setSavePresetModal(false); setNewPresetName(""); }} className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Version History Panel ── */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.30)] rounded-2xl p-6 w-96 shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Lịch sử phiên bản</h3>
              <button onClick={() => setShowVersionHistory(false)} className="text-[rgba(245,237,214,0.55)] hover:text-white">✕</button>
            </div>
            {versionHistory.length === 0 ? (
              <p className="text-[rgba(245,237,214,0.55)] text-sm text-center py-8">Chưa có phiên bản nào được lưu.</p>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1">
                {versionHistory.map((entry, i) => (
                  <div key={entry.ts} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.14)] hover:border-[rgba(255,200,100,0.30)] transition-colors">
                    <div>
                      <div className="text-sm text-white">{entry.label}</div>
                      <div className="text-xs text-[rgba(245,237,214,0.55)]">{new Date(entry.ts).toLocaleString("vi-VN")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Object.values(entry.theme.colors).slice(0, 4).map((c, ci) => (
                          <div key={ci} className="w-3 h-3 rounded-sm" style={{ background: c as string }} />
                        ))}
                      </div>
                      {i > 0 && (
                        <button onClick={() => handleRestoreVersion(entry)} className="px-2 py-1 rounded-lg bg-[#C9A84C]/20 text-[#C9A84C] text-xs hover:bg-[#C9A84C]/30">Khôi phục</button>
                      )}
                      {i === 0 && <span className="text-xs text-green-400 px-2">Hiện tại</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen Preview Overlay ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-40 bg-[#050400] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,200,100,0.14)] bg-[#1a1200]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[rgba(245,237,214,0.70)]">Xem trước toàn màn hình</span>
              <div className="flex rounded-lg overflow-hidden border border-[rgba(255,200,100,0.18)]">
                {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                  <button key={mode} onClick={() => setPreviewMode(mode)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${previewMode === mode ? "bg-[#C9A84C] text-black" : "text-[rgba(245,237,214,0.70)] hover:text-white bg-[#1a1200]"}`}>
                    {mode === "desktop" ? "🖥" : mode === "tablet" ? "📟" : "📱"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[rgba(245,237,214,0.45)] bg-[#1a1200] px-2 py-1 rounded border border-[rgba(255,200,100,0.14)]">{previewUrl}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving} className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${saved ? "bg-green-500/20 text-green-400" : "bg-[#C9A84C] text-black hover:bg-[#E2C97E]"}`}>
                {saving ? "Đang lưu..." : saved ? "✓ Đã lưu" : "💾 Lưu"}
              </button>
              <button onClick={() => setIsFullscreen(false)} className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700">✕ Đóng (Esc)</button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className={`h-full mx-auto transition-all duration-300 ${previewMode === "mobile" ? "max-w-sm" : previewMode === "tablet" ? "max-w-2xl" : "max-w-full"}`}>
              <iframe key={iframeKey + 1000} src={previewUrl} className="w-full h-full border-0" title="Fullscreen Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            </div>
          </div>
        </div>
      )}

      {/* ── Before/After Compare Overlay ── */}
      {compareMode && compareSnapshot && (
        <div className="fixed inset-0 z-40 bg-[#050400] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,200,100,0.14)] bg-[#1a1200]">
            <span className="text-sm text-white font-medium">So sánh Before / After</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[rgba(245,237,214,0.70)]">Kéo slider để so sánh</span>
              <button onClick={() => setCompareMode(false)} className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700">✕ Đóng</button>
            </div>
          </div>
          <div className="flex-1 flex gap-4 p-4 overflow-hidden">
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-xs text-[rgba(245,237,214,0.55)] text-center">TRƯỚC (snapshot)</div>
              <div className="flex-1 rounded-xl overflow-hidden border border-[rgba(255,200,100,0.14)]">
                <WebsitePreview theme={compareSnapshot} />
              </div>
            </div>
            <div className="w-px bg-[#C9A84C]/20 self-stretch" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-xs text-[#C9A84C] text-center">SAU (hiện tại)</div>
              <div className="flex-1 rounded-xl overflow-hidden border border-[rgba(255,200,100,0.30)]">
                <WebsitePreview theme={theme} />
              </div>
            </div>
          </div>
          <div className="px-4 pb-3 flex items-center gap-3">
            <span className="text-xs text-[rgba(245,237,214,0.55)]">Slider:</span>
            <input type="range" min={0} max={100} value={compareSlider} onChange={(e) => setCompareSlider(Number(e.target.value))} className="flex-1 accent-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-mono w-8">{compareSlider}%</span>
          </div>
        </div>
      )}

      {/* ── Import file input (hidden) ── */}
      <input type="file" accept=".json" id="theme-import-input" className="hidden" onChange={handleImport} />

      {/* ── Main Layout ── */}
      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* ── Left: Section Nav ── */}
        <div className="w-56 flex-shrink-0 flex flex-col overflow-y-auto pr-1">
          {/* Search */}
          <div className="mb-3 relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm section... (⌘K)"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-white text-xs focus:outline-none focus:border-[#C9A84C]/40 placeholder-[rgba(245,237,214,0.30)]"
            />
            <span className="absolute left-2.5 top-2.5 text-[rgba(245,237,214,0.55)] text-xs">🔍</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-[rgba(245,237,214,0.55)] hover:text-white text-xs">✕</button>
            )}
          </div>

          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-3 py-1.5 text-xs font-semibold text-[rgba(245,237,214,0.55)] uppercase tracking-wider">{group.label}</div>
              {group.items.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => { setActiveSection(sec.id); setSearchQuery(""); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-all ${
                    activeSection === sec.id ? "bg-[#C9A84C]/10 text-[#C9A84C] border border-[rgba(255,200,100,0.22)]" : "text-[rgba(245,237,214,0.70)] hover:text-white hover:bg-[#1a1200]"
                  }`}
                >
                  <span className="text-base">{sec.icon}</span>
                  <span className="truncate flex-1">{sec.label}</span>
                  {sectionLastEdited[sec.id] && (
                    <span className="text-xs text-[rgba(245,237,214,0.45)] shrink-0" title={`Lần cuối: ${new Date(sectionLastEdited[sec.id]).toLocaleString("vi-VN")}`}>
                      {relativeTime(sectionLastEdited[sec.id]).replace(" trước", "").replace("vừa xong", "now")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}

          {!searchQuery && (
            <div className="mt-auto pt-4 border-t border-[rgba(255,200,100,0.14)] space-y-1">
              <button onClick={handleReset} className="w-full px-3 py-2 rounded-xl text-sm text-[rgba(245,237,214,0.55)] hover:text-red-400 hover:bg-red-500/5 transition-colors text-left">↺ Đặt lại mặc định</button>
              <button onClick={handleExport} className="w-full px-3 py-2 rounded-xl text-sm text-[rgba(245,237,214,0.70)] hover:text-white hover:bg-[#1a1200] transition-colors text-left">⬇ Export JSON</button>
              <button onClick={() => document.getElementById("theme-import-input")?.click()} className="w-full px-3 py-2 rounded-xl text-sm text-[rgba(245,237,214,0.70)] hover:text-white hover:bg-[#1a1200] transition-colors text-left">⬆ Import JSON</button>
              <button onClick={() => setShowVersionHistory(true)} className="w-full px-3 py-2 rounded-xl text-sm text-[rgba(245,237,214,0.70)] hover:text-white hover:bg-[#1a1200] transition-colors text-left">🕐 Lịch sử ({versionHistory.length})</button>
            </div>
          )}
        </div>

        {/* ── Center: Edit Panel ── */}
        <div className="w-72 flex-shrink-0 flex flex-col">
          {/* Undo/Redo toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Hoàn tác (Ctrl+Z)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${canUndo ? "text-gray-300 hover:text-white hover:bg-[#1a1200] bg-[#1a1200] border border-[rgba(255,200,100,0.14)]" : "text-[rgba(245,237,214,0.35)] cursor-not-allowed bg-[#1a1200] border border-gray-800"}`}
            >
              ↩ Hoàn tác {canUndo && <span className="text-[rgba(245,237,214,0.55)]">({historyIndex})</span>}
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Làm lại (Ctrl+Y)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${canRedo ? "text-gray-300 hover:text-white hover:bg-[#1a1200] bg-[#1a1200] border border-[rgba(255,200,100,0.14)]" : "text-[rgba(245,237,214,0.35)] cursor-not-allowed bg-[#1a1200] border border-gray-800"}`}
            >
              ↪ Làm lại
            </button>
            {isDirty && (
              <span className="ml-auto text-xs text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Chưa lưu
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {renderPanel()}
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-[rgba(255,200,100,0.14)] mt-4 space-y-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                saved ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                isDirty ? "bg-[#C9A84C] text-black hover:bg-[#E2C97E] shadow-lg shadow-[#C9A84C]/20" :
                "bg-[#C9A84C]/60 text-black/60 cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {saving ? "Đang lưu..." : saved ? "✓ Đã lưu thành công" : isDirty ? "💾 Lưu thay đổi" : "💾 Lưu thay đổi"}
            </button>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[rgba(245,237,214,0.55)]">Xem trước:</span>
              <div className="flex rounded-lg overflow-hidden border border-[rgba(255,200,100,0.18)]">
                {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${previewMode === mode ? "bg-[#C9A84C] text-black" : "text-[rgba(245,237,214,0.70)] hover:text-white bg-[#1a1200]"}`}
                    title={mode === "desktop" ? "Desktop (1280px+)" : mode === "tablet" ? "Tablet (768px)" : "Mobile (390px)"}
                  >
                    {mode === "desktop" ? "🖥 Desktop" : mode === "tablet" ? "📟 Tablet" : "📱 Mobile"}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[rgba(245,237,214,0.45)] bg-[#1a1200] px-2 py-1 rounded-lg border border-[rgba(255,200,100,0.14)]">{previewUrl}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleStartCompare} className="text-xs text-[rgba(245,237,214,0.70)] hover:text-white px-2 py-1 rounded-lg hover:bg-[#1a1200] transition-colors" title="So sánh Before/After">⇄ So sánh</button>
              <button onClick={() => setIsFullscreen(true)} className="text-xs text-[rgba(245,237,214,0.70)] hover:text-white px-2 py-1 rounded-lg hover:bg-[#1a1200] transition-colors" title="Toàn màn hình (F)">⛶ Fullscreen</button>
              <button onClick={() => setIframeKey((k) => k + 1)} className="text-xs text-[rgba(245,237,214,0.55)] hover:text-white px-2 py-1 rounded-lg hover:bg-[#1a1200] transition-colors" title="Tải lại xem trước">↻ Tải lại</button>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C9A84C] hover:underline flex items-center gap-1">🔗 Mở trang</a>
            </div>
          </div>

          {/* Live iframe preview */}
          <div className="flex-1 bg-[#050400] rounded-2xl border border-[rgba(255,200,100,0.14)] overflow-hidden">
            <div className={`h-full mx-auto transition-all duration-300 ${previewMode === "mobile" ? "max-w-sm" : previewMode === "tablet" ? "max-w-2xl" : "max-w-full"}`}>
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full border-0 rounded-2xl"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>

          {/* Color palette strip */}
          {["colors", "presets"].includes(activeSection) && (
            <div className="mt-3 p-3 rounded-xl bg-[#1a1200] border border-[rgba(255,200,100,0.14)] flex-shrink-0">
              <div className="text-xs text-[rgba(245,237,214,0.55)] mb-2 font-medium uppercase tracking-wider">Bảng màu hiện tại</div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(theme.colors).map(([key, color]) => (
                  <div key={key} className="text-center" title={`${key}: ${color}`}>
                    <div className="w-7 h-7 rounded-md border border-white/10" style={{ background: color }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="mt-2 text-xs text-[rgba(245,237,214,0.35)] flex gap-3 flex-wrap">
            <span>⌘Z Hoàn tác</span>
            <span>⌘Y Làm lại</span>
            <span>⌘S Lưu</span>
            <span>⌘K Tìm kiếm</span>
            <span>F Fullscreen</span>
          </div>
        </div>
      </div>
    </>
  );
}
