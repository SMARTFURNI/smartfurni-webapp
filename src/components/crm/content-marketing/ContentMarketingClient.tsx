"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles, Video, Calendar, Plus, Loader2, Copy, Check,
  Trash2, Edit3, Save, X, ExternalLink,
  TrendingUp, Eye, Heart, MessageCircle, Share2, Clock,
  Film, Youtube, Facebook, Smartphone, History,
  CheckCircle2, Circle, PlayCircle, Scissors,
  AlertCircle, LayoutGrid, ChevronLeft, ChevronRight,
  Wand2, GripVertical, ArrowLeft, ArrowRight, Settings,
  Zap, Target, Mic, Timer, FileText, ChevronDown,
} from "lucide-react";
import ContentSettingsTab from "./ContentSettingsTab";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContentPlatform = "tiktok" | "facebook" | "youtube" | "all";
type ContentStatus =
  | "idea"
  | "scripted"
  | "recording"
  | "editing"
  | "published"
  | "cancelled";

interface ContentVideo {
  id: string;
  title: string;
  topic?: string;
  platform: ContentPlatform;
  status: ContentStatus;
  script?: string;
  scriptGeneratedBy?: "ai" | "manual";
  durationSeconds?: number;
  hashtags: string[];
  notes?: string;
  scheduledAt?: string;
  publishedAt?: string;
  publishedUrl?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdByName: string;
  assignedToName?: string;
  createdAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<ContentPlatform, {
  label: string; color: string; bg: string; border: string;
  icon: React.ElementType; gradient: string; darkColor: string;
}> = {
  tiktok:   { label: "TikTok",      color: "#1a1a1a", bg: "#f8f8f8",   border: "#e2e2e2", icon: Smartphone, gradient: "from-gray-900 to-gray-700",   darkColor: "#fff" },
  facebook: { label: "Facebook",    color: "#1877f2", bg: "#eff6ff",   border: "#bfdbfe", icon: Facebook,   gradient: "from-blue-600 to-blue-500",   darkColor: "#fff" },
  youtube:  { label: "YouTube",     color: "#ff0000", bg: "#fff5f5",   border: "#fecaca", icon: Youtube,    gradient: "from-red-600 to-red-500",     darkColor: "#fff" },
  all:      { label: "Đa nền tảng", color: "#7c3aed", bg: "#f5f3ff",   border: "#ddd6fe", icon: Film,       gradient: "from-violet-600 to-purple-500", darkColor: "#fff" },
};

const STATUS_CONFIG: Record<ContentStatus, {
  label: string; color: string; bg: string; gradient: string;
  headerBg: string; icon: React.ElementType; prev?: ContentStatus; next?: ContentStatus;
}> = {
  idea:      { label: "Ý tưởng",     color: "#64748b", bg: "#f8fafc", gradient: "from-slate-100 to-slate-50",    headerBg: "#f1f5f9", icon: Circle,       next: "scripted" },
  scripted:  { label: "Có kịch bản", color: "#2563eb", bg: "#eff6ff", gradient: "from-blue-50 to-blue-50/40",   headerBg: "#dbeafe", icon: Edit3,        prev: "idea",      next: "recording" },
  recording: { label: "Đang quay",   color: "#d97706", bg: "#fffbeb", gradient: "from-amber-50 to-amber-50/40", headerBg: "#fde68a", icon: PlayCircle,   prev: "scripted",  next: "editing" },
  editing:   { label: "Đang dựng",   color: "#7c3aed", bg: "#f5f3ff", gradient: "from-violet-50 to-violet-50/40", headerBg: "#ede9fe", icon: Scissors,   prev: "recording", next: "published" },
  published: { label: "Đã đăng",     color: "#16a34a", bg: "#f0fdf4", gradient: "from-green-50 to-green-50/40", headerBg: "#bbf7d0", icon: CheckCircle2, prev: "editing" },
  cancelled: { label: "Đã huỷ",      color: "#9ca3af", bg: "#f9fafb", gradient: "from-gray-50 to-gray-50/40",   headerBg: "#f3f4f6", icon: X },
};

const TONE_OPTIONS = [
  { value: "professional", label: "Chuyên nghiệp", icon: "💼" },
  { value: "casual",       label: "Thân thiện",    icon: "😊" },
  { value: "humorous",     label: "Hài hước",      icon: "😄" },
  { value: "emotional",    label: "Cảm xúc",       icon: "❤️" },
  { value: "educational",  label: "Giáo dục",      icon: "📚" },
];

const KANBAN_COLUMNS: ContentStatus[] = ["idea", "scripted", "recording", "editing", "published"];

// ─── Gợi ý chủ đề video B2B theo nền tảng ───────────────────────────────────
const TOPIC_SUGGESTIONS: Record<ContentPlatform, string[]> = {
  tiktok: [
    "SmartFurni trang bị giường thông minh cho toàn bộ căn hộ dự án",
    "Chủ đầu tư chọn giường điều chỉnh SmartFurni để tăng giá trị bàn giao",
    "Khách sạn 5 sao nâng cấp trải nghiệm phòng ngủ với giường SmartFurni",
    "Homestay tăng đánh giá 5 sao nhờ trang bị giường điều chỉnh",
    "Giường bệnh viện thông minh SmartFurni hỗ trợ phục hồi bệnh nhân",
    "Nhà dưỡng lão nâng cao chất lượng chăm sóc với giường điều chỉnh",
    "Co-working space tích hợp nap room với giường thông minh",
    "Trở thành đại lý SmartFurni - Cơ hội kinh doanh nội thất thông minh",
    "Showroom nội thất tăng doanh thu với dòng giường cao cấp SmartFurni",
  ],
  facebook: [
    "Giải pháp trang bị nội thất thông minh cho dự án căn hộ cao cấp",
    "SmartFurni - Đối tác cung cấp giường điều chỉnh cho chủ đầu tư BĐS",
    "Nâng cấp tiêu chuẩn phòng ngủ khách sạn với giường điều chỉnh điện",
    "Resort 5 sao lựa chọn SmartFurni cho trải nghiệm nghỉ dưỡng đẳng cấp",
    "Giường bệnh viện SmartFurni: Tiêu chuẩn y tế, công nghệ hiện đại",
    "Nhà dưỡng lão & trung tâm phục hồi chức năng tin dùng SmartFurni",
    "Chính sách đại lý SmartFurni 2024 - Chiết khấu hấp dẫn, hỗ trợ toàn diện",
    "Mở showroom nội thất thông minh cùng SmartFurni",
  ],
  youtube: [
    "Case study: Dự án căn hộ trang bị 500 giường SmartFurni",
    "Hướng dẫn lựa chọn nội thất thông minh cho dự án BĐS cao cấp",
    "Tour phòng ngủ khách sạn 5 sao trang bị giường SmartFurni",
    "Giải pháp giường điều chỉnh cho chuỗi khách sạn - Tối ưu vận hành",
    "Giường bệnh viện thông minh SmartFurni - Tính năng y tế chuyên sâu",
    "Phòng phục hồi chức năng hiện đại với giường điều chỉnh đa tư thế",
    "Hành trình trở thành đại lý SmartFurni - Câu chuyện thành công",
    "Chương trình đào tạo đại lý SmartFurni 2024",
  ],
  all: [
    "SmartFurni B2B - Giải pháp giường thông minh cho doanh nghiệp",
    "Tại sao các chủ đầu tư BĐS chọn SmartFurni?",
    "SmartFurni cung cấp số lượng lớn cho khách sạn, bệnh viện, dự án",
    "Chính sách B2B SmartFurni: Chiết khấu, bảo hành, hỗ trợ lắp đặt",
    "Đối tác chiến lược SmartFurni - Cùng phát triển thị trường nội thất thông minh",
    "Câu chuyện thành công của đại lý SmartFurni trên toàn quốc",
  ],
};

const AUDIENCE_SUGGESTIONS: Record<ContentPlatform, string[]> = {
  tiktok: [
    "Chủ đầu tư BĐS 35-55 tuổi, đang phát triển dự án căn hộ cao cấp",
    "Quản lý khách sạn / resort, tìm kiếm nâng cấp tiện nghi phòng ngủ",
    "Chủ homestay, villa cho thuê muốn tăng đánh giá và giá phòng",
    "Giám đốc bệnh viện / phòng khám tư tìm thiết bị y tế hiện đại",
    "Quản lý nhà dưỡng lão, trung tâm phục hồi chức năng",
    "Chủ showroom nội thất muốn mở rộng danh mục sản phẩm cao cấp",
  ],
  facebook: [
    "Chủ đầu tư / Developer BĐS, dự án căn hộ 100+ unit",
    "Giám đốc mua hàng khách sạn 3-5 sao, chuỗi resort nghỉ dưỡng",
    "Chủ chuỗi homestay, villa cho thuê ngắn/dài hạn",
    "Giám đốc bệnh viện tư, phòng khám đa khoa, nhà dưỡng lão",
    "Quản lý văn phòng, HR tìm giải pháp wellness cho nhân viên",
    "Nhà thiết kế nội thất, kiến trúc sư tư vấn cho khách hàng B2B",
  ],
  youtube: [
    "Giám đốc điều hành, CFO doanh nghiệp đánh giá ROI đầu tư nội thất",
    "Chủ đầu tư BĐS nghiên cứu giải pháp trang bị nội thất số lượng lớn",
    "Quản lý chuỗi khách sạn, tập đoàn hospitality tìm nhà cung cấp",
    "Giám đốc y tế, trưởng khoa bệnh viện tư tìm thiết bị phòng bệnh",
    "Nhà thiết kế nội thất thương mại, công ty FF&E",
    "Chủ đại lý nội thất muốn tìm hiểu chính sách phân phối SmartFurni",
  ],
  all: [
    "Chủ đầu tư BĐS và developer dự án căn hộ, chung cư cao cấp",
    "Chủ khách sạn, resort, homestay, villa cho thuê",
    "Giám đốc bệnh viện tư, phòng khám, nhà dưỡng lão",
    "Quản lý văn phòng, co-working space tìm giải pháp wellness",
    "Chủ showroom nội thất, đại lý phân phối muốn hợp tác SmartFurni",
    "Giám đốc mua hàng tập đoàn hospitality & healthcare",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}
function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: ContentPlatform }) {
  const cfg = PLATFORM_CONFIG[platform];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Hook lưu lịch sử nhập liệu ─────────────────────────────────────────────
const HISTORY_MAX = 8;
function useInputHistory(storageKey: string): [string[], (val: string) => void, (val: string) => void] {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const addToHistory = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const deduped = [trimmed, ...prev.filter(v => v !== trimmed)].slice(0, HISTORY_MAX);
      try { localStorage.setItem(storageKey, JSON.stringify(deduped)); } catch {}
      return deduped;
    });
  };

  const removeFromHistory = (val: string) => {
    setHistory(prev => {
      const next = prev.filter(v => v !== val);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return [history, addToHistory, removeFromHistory];
}

// ─── Animated Generate Button ─────────────────────────────────────────────────
function GenerateButton({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => setFrame(f => (f + 1) % 4), 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setFrame(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  const gradients = [
    "linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%)",
    "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)",
    "linear-gradient(135deg, #d97706 0%, #c2410c 50%, #b45309 100%)",
    "linear-gradient(135deg, #b45309 0%, #d97706 50%, #92400e 100%)",
  ];

  const staticGradient = "linear-gradient(135deg, #d97706 0%, #b45309 100%)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: loading ? gradients[frame] : staticGradient,
        transition: loading ? "background 0.5s ease" : "opacity 0.2s",
        boxShadow: disabled ? "none" : loading
          ? "0 0 24px rgba(180,83,9,0.5), 0 4px 16px rgba(180,83,9,0.3)"
          : "0 4px 16px rgba(180,83,9,0.35), 0 1px 3px rgba(0,0,0,0.1)",
      }}
      className="w-full flex items-center justify-center gap-3 text-white font-bold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed text-sm relative overflow-hidden tracking-wide"
    >
      {loading && (
        <span className="absolute inset-0 opacity-10"
          style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px)" }} />
      )}
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin relative z-10" />
          <span className="relative z-10">Đang tạo kịch bản...</span>
        </>
      ) : (
        <>
          <Zap size={16} className="relative z-10" />
          <span className="relative z-10">Tạo kịch bản AI</span>
        </>
      )}
    </button>
  );
}

// ─── Kanban Card (Sortable) ───────────────────────────────────────────────────
function KanbanCard({
  video,
  onStatusChange,
  onDelete,
  onClick,
}: {
  video: ContentVideo;
  onStatusChange: (id: string, status: ContentStatus) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
    data: { video },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const cfg = STATUS_CONFIG[video.status];
  const platCfg = PLATFORM_CONFIG[video.platform];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${platCfg.color}60, transparent)` }} />

      {/* Drag handle + title row */}
      <div className="flex items-start gap-1.5 p-3 pb-2 pt-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 rounded-lg text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </button>
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-relaxed">
            {video.title}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(video.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
        >
          <Trash2 size={10} className="text-red-400" />
        </button>
      </div>

      {/* Badges */}
      <div className="px-3 pb-2 flex flex-wrap gap-1" onClick={onClick}>
        <PlatformBadge platform={video.platform} />
        {video.scriptGeneratedBy === "ai" && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
            <Sparkles size={8} />
            AI
          </span>
        )}
      </div>

      {/* Scheduled date */}
      {video.scheduledAt && (
        <div className="px-3 pb-2 flex items-center gap-1 text-[10px] text-gray-400" onClick={onClick}>
          <Clock size={9} />
          {fmtDate(video.scheduledAt)}
        </div>
      )}

      {/* Navigation arrows */}
      <div className="px-2 pb-2.5 flex gap-1.5">
        {cfg.prev && (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(video.id, cfg.prev!); }}
            className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl py-1.5 transition-all border border-transparent hover:border-blue-100"
            title={`Quay lại: ${STATUS_CONFIG[cfg.prev].label}`}
          >
            <ArrowLeft size={9} />
            <span className="hidden sm:inline truncate">{STATUS_CONFIG[cfg.prev].label}</span>
          </button>
        )}
        {cfg.next && (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(video.id, cfg.next!); }}
            className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl py-1.5 transition-all border border-transparent hover:border-amber-200 font-medium"
            title={`Tiếp theo: ${STATUS_CONFIG[cfg.next].label}`}
          >
            <span className="hidden sm:inline truncate">{STATUS_CONFIG[cfg.next].label}</span>
            <ArrowRight size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column (Drop zone) ────────────────────────────────────────────────
function KanbanColumn({
  status,
  videos,
  onStatusChange,
  onDelete,
  onSelect,
  isOver,
}: {
  status: ContentStatus;
  videos: ContentVideo[];
  onStatusChange: (id: string, status: ContentStatus) => void;
  onDelete: (id: string) => void;
  onSelect: (v: ContentVideo) => void;
  isOver: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex flex-col rounded-2xl transition-all duration-200 ${
        isOver
          ? "ring-2 ring-amber-400 ring-offset-2 shadow-lg"
          : "shadow-sm"
      }`}
      style={{
        minHeight: 420,
        background: isOver ? "rgba(251,191,36,0.04)" : "#fafafa",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3.5 py-3 rounded-t-2xl"
        style={{ background: cfg.headerBg }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${cfg.color}20` }}>
          <Icon size={12} style={{ color: cfg.color }} />
        </div>
        <span className="text-xs font-bold tracking-wide" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span
          className="ml-auto text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: cfg.color, color: "#fff" }}
        >
          {videos.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2">
        <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
          {videos.map(video => (
            <KanbanCard
              key={video.id}
              video={video}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onClick={() => onSelect(video)}
            />
          ))}
        </SortableContext>
        {videos.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-10 text-xs rounded-2xl border-2 border-dashed transition-all duration-200 ${
            isOver
              ? "border-amber-300 text-amber-500 bg-amber-50/50"
              : "border-gray-200 text-gray-300"
          }`}>
            <Icon size={18} className="mb-2 opacity-50" />
            <span className="font-medium">Kéo thả vào đây</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 1: AI Script Generator ──────────────────────────────────────────────
function AIScriptTab({ onScriptSaved }: { onScriptSaved: () => void }) {
  const [platform, setPlatform] = useState<ContentPlatform>("tiktok");
  const [topic, setTopic] = useState("");
  const [productName, setProductName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [duration, setDuration] = useState(30);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load default values from settings on mount
  useEffect(() => {
    if (settingsLoaded) return;
    fetch("/api/crm/content/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.settings) {
          const s = data.settings;
          if (s.defaultPlatform) setPlatform(s.defaultPlatform as ContentPlatform);
          if (s.defaultTone) setTone(s.defaultTone);
          if (s.defaultDuration) setDuration(s.defaultDuration);
        }
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [settingsLoaded]);

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [generationId, setGenerationId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [error, setError] = useState("");
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [showAudienceSuggestions, setShowAudienceSuggestions] = useState(false);
  const [topicHistory, addTopicHistory, removeTopicHistory] = useInputHistory("sf_content_topic_history");
  const [audienceHistory, addAudienceHistory, removeAudienceHistory] = useInputHistory("sf_content_audience_history");

  const handleGenerate = async () => {
    if (!topic.trim()) { setError("Vui lòng nhập chủ đề video"); return; }
    setLoading(true);
    setError("");
    setGeneratedScript("");
    try {
      const res = await fetch("/api/crm/content/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, topic, productName, targetAudience, tone, durationSeconds: duration, additionalNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || "Lỗi tạo kịch bản"));
      setGeneratedScript(data.script);
      setGenerationId(data.generationId);
      setSaveTitle(`[${PLATFORM_CONFIG[platform].label}] ${topic}`);
      if (topic.trim()) addTopicHistory(topic);
      if (targetAudience.trim()) addAudienceHistory(targetAudience);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveVideo = async () => {
    if (!saveTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/content/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle,
          topic,
          platform,
          status: "scripted",
          script: generatedScript,
          scriptGeneratedBy: "ai",
          generationId,
          notes,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi lưu video");
      }
      setShowSaveForm(false);
      onScriptSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-6">
      {/* ── Left: Form Panel ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Form header */}
        <div className="px-6 py-5 border-b border-gray-50"
          style={{ background: "linear-gradient(135deg, #fafafa 0%, #fff 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
              <Wand2 size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Thông tin kịch bản</h3>
              <p className="text-xs text-gray-400 mt-0.5">Điền đầy đủ để AI tạo kịch bản chính xác nhất</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Platform selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Nền tảng
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["tiktok", "facebook", "youtube", "all"] as ContentPlatform[]).map(p => {
                const cfg = PLATFORM_CONFIG[p];
                const Icon = cfg.icon;
                const active = platform === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 ${
                      active ? "shadow-md scale-[1.01]" : "border-gray-100 text-gray-500 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                    }`}
                    style={active ? {
                      borderColor: cfg.color,
                      background: `linear-gradient(135deg, ${cfg.bg}, white)`,
                      color: cfg.color,
                      boxShadow: `0 4px 12px ${cfg.color}25`,
                    } : {}}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${active ? "" : "bg-white"}`}
                      style={active ? { background: `${cfg.color}15` } : {}}>
                      <Icon size={14} style={{ color: active ? cfg.color : "#9ca3af" }} />
                    </div>
                    <span>{cfg.label}</span>
                    {active && (
                      <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: cfg.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Chủ đề video <span className="text-red-400 normal-case tracking-normal">*</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowTopicSuggestions(v => !v); setShowAudienceSuggestions(false); }}
                className="flex items-center gap-1.5 text-[11px] text-amber-700 hover:text-amber-800 font-semibold bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl transition-all border border-amber-200"
              >
                <Sparkles size={10} />
                Gợi ý ý tưởng
              </button>
            </div>
            <div className="relative">
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onFocus={() => setShowTopicSuggestions(false)}
                placeholder="VD: Giường điều chỉnh điện giúp ngủ ngon hơn"
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all placeholder:text-gray-300"
              />
              {showTopicSuggestions && (
                <div className="absolute z-30 top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
                  {topicHistory.length > 0 && (
                    <>
                      <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History size={10} /> Đã dùng gần đây
                        </p>
                      </div>
                      <div className="max-h-32 overflow-y-auto border-b border-gray-100">
                        {topicHistory.map((s, i) => (
                          <div key={i} className="flex items-center group hover:bg-amber-50/50 transition-colors">
                            <button type="button" onClick={() => { setTopic(s); setShowTopicSuggestions(false); }}
                              className="flex-1 text-left px-4 py-2.5 text-sm text-gray-700 hover:text-amber-800">{s}</button>
                            <button type="button" onClick={e => { e.stopPropagation(); removeTopicHistory(s); }}
                              className="px-3 py-2.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="px-4 py-2.5 bg-amber-50/60 border-b border-amber-100">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={10} /> Gợi ý cho {PLATFORM_CONFIG[platform].label}
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {TOPIC_SUGGESTIONS[platform].map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => { setTopic(s); setShowTopicSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800 transition-colors border-b border-gray-50 last:border-0">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tên sản phẩm</label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="VD: Giường điều chỉnh SmartFurni Pro 3000"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all placeholder:text-gray-300"
            />
          </div>

          {/* Target audience */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Đối tượng mục tiêu</label>
              <button
                type="button"
                onClick={() => { setShowAudienceSuggestions(v => !v); setShowTopicSuggestions(false); }}
                className="flex items-center gap-1.5 text-[11px] text-blue-700 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl transition-all border border-blue-200"
              >
                <Target size={10} />
                Gợi ý đối tượng
              </button>
            </div>
            <div className="relative">
              <input
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                onFocus={() => setShowAudienceSuggestions(false)}
                placeholder="VD: Chủ đầu tư BĐS, quản lý khách sạn..."
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50 bg-gray-50/50 transition-all placeholder:text-gray-300"
              />
              {showAudienceSuggestions && (
                <div className="absolute z-30 top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
                  {audienceHistory.length > 0 && (
                    <>
                      <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History size={10} /> Đã dùng gần đây
                        </p>
                      </div>
                      <div className="max-h-32 overflow-y-auto border-b border-gray-100">
                        {audienceHistory.map((s, i) => (
                          <div key={i} className="flex items-center group hover:bg-blue-50/50 transition-colors">
                            <button type="button" onClick={() => { setTargetAudience(s); setShowAudienceSuggestions(false); }}
                              className="flex-1 text-left px-4 py-2.5 text-sm text-gray-700 hover:text-blue-800">{s}</button>
                            <button type="button" onClick={e => { e.stopPropagation(); removeAudienceHistory(s); }}
                              className="px-3 py-2.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="px-4 py-2.5 bg-blue-50/60 border-b border-blue-100">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Target size={10} /> Gợi ý cho {PLATFORM_CONFIG[platform].label}
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {AUDIENCE_SUGGESTIONS[platform].map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => { setTargetAudience(s); setShowAudienceSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors border-b border-gray-50 last:border-0">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tone + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                <span className="flex items-center gap-1.5"><Mic size={10} /> Giọng điệu</span>
              </label>
              <div className="relative">
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all appearance-none cursor-pointer"
                >
                  {TONE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                <span className="flex items-center gap-1.5"><Timer size={10} /> Thời lượng (giây)</span>
              </label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                min={15}
                max={600}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              <span className="flex items-center gap-1.5"><FileText size={10} /> Ghi chú thêm</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="VD: Nhấn mạnh tính năng massage, có khuyến mãi 20%..."
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 resize-none bg-gray-50/50 transition-all placeholder:text-gray-300"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Generate button */}
          <GenerateButton loading={loading} disabled={loading || !topic.trim()} onClick={handleGenerate} />
        </div>
      </div>

      {/* ── Right: Generated Script Panel ────────────────────────────────── */}
      <div className="space-y-4">
        {generatedScript ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            {/* Script header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50"
              style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900">Kịch bản AI</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PlatformBadge platform={platform} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-all text-gray-600">
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied ? "Đã copy" : "Copy"}
                </button>
                <button onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:shadow-md"
                  style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
                  <Save size={12} />
                  Lưu vào kế hoạch
                </button>
              </div>
            </div>

            {/* Script content */}
            <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: "520px" }}>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {generatedScript}
              </pre>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-100 h-full flex flex-col items-center justify-center text-center"
            style={{ minHeight: "480px" }}>
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" }}>
                <Wand2 size={36} className="text-amber-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-amber-200 flex items-center justify-center shadow-sm">
                <Sparkles size={12} className="text-amber-500" />
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">Sẵn sàng tạo kịch bản</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              Điền thông tin bên trái và nhấn{" "}
              <span className="text-amber-600 font-semibold">Tạo kịch bản AI</span>
            </p>
            <p className="text-xs text-gray-300 mt-3">Gemini AI sẽ tạo kịch bản video chuyên nghiệp</p>
          </div>
        )}

        {/* Save Form */}
        {showSaveForm && (
          <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-sm"
            style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 100%)" }}>
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
                <Save size={11} className="text-white" />
              </div>
              Lưu vào kế hoạch content
            </h4>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="Tiêu đề video..."
              className="w-full border-2 border-amber-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 mb-3 bg-white"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveVideo} disabled={saving || !saveTitle.trim()}
                className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-2xl disabled:opacity-50 transition-all shadow-sm"
                style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Lưu
              </button>
              <button onClick={() => setShowSaveForm(false)}
                className="px-5 py-3 text-sm text-gray-500 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-medium">
                Huỷ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Content Planner (Kanban with DnD) ─────────────────────────────────
function ContentPlannerTab() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentVideo | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<ContentPlatform | "">("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ContentStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterPlatform ? `/api/crm/content/videos?platform=${filterPlatform}` : "/api/crm/content/videos";
      const res = await fetch(url);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch { setVideos([]); }
    finally { setLoading(false); }
  }, [filterPlatform]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleStatusChange = async (videoId: string, newStatus: ContentStatus) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: newStatus } : v));
    await fetch(`/api/crm/content/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Xoá video này?")) return;
    setVideos(prev => prev.filter(v => v.id !== videoId));
    await fetch(`/api/crm/content/videos/${videoId}`, { method: "DELETE" });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: { over: { id: string } | null }) => {
    if (!event.over) { setOverColumn(null); return; }
    const overId = event.over.id as string;
    if (KANBAN_COLUMNS.includes(overId as ContentStatus)) {
      setOverColumn(overId as ContentStatus);
    } else {
      const overVideo = videos.find(v => v.id === overId);
      if (overVideo) setOverColumn(overVideo.status);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setOverColumn(null);
    const { active, over } = event;
    if (!over) return;

    const draggedVideo = videos.find(v => v.id === active.id);
    if (!draggedVideo) return;

    const overId = over.id as string;
    let targetStatus: ContentStatus | undefined;

    if (KANBAN_COLUMNS.includes(overId as ContentStatus)) {
      targetStatus = overId as ContentStatus;
    } else {
      const overVideo = videos.find(v => v.id === overId);
      if (overVideo && overVideo.status !== draggedVideo.status) {
        targetStatus = overVideo.status;
      }
    }

    if (targetStatus && targetStatus !== draggedVideo.status) {
      await handleStatusChange(draggedVideo.id, targetStatus);
    }
  };

  const activeVideo = activeId ? videos.find(v => v.id === activeId) : null;
  const columnVideos = (status: ContentStatus) => videos.filter(v => v.status === status);
  const totalVideos = videos.length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold text-gray-400">Lọc:</span>
            <div className="relative">
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value as ContentPlatform | "")}
                className="text-sm font-semibold text-gray-700 focus:outline-none bg-transparent cursor-pointer appearance-none pr-5"
              >
                <option value="">Tất cả ({totalVideos})</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
              </select>
              <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <span className="text-xs text-gray-300 hidden md:flex items-center gap-1.5">
            <GripVertical size={12} />
            Kéo thả card để chuyển trạng thái
          </span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95"
          style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}
        >
          <Plus size={15} />
          Thêm ý tưởng
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
              <Loader2 size={22} className="animate-spin text-amber-500" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Đang tải kế hoạch...</p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver as (event: { over: { id: string } | null }) => void}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                videos={columnVideos(status)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onSelect={setSelectedVideo}
                isOver={overColumn === status}
              />
            ))}
          </div>

          <DragOverlay>
            {activeVideo && (
              <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-2xl p-3.5 opacity-95 rotate-2 w-52"
                style={{ boxShadow: "0 20px 40px rgba(180,83,9,0.25)" }}>
                <p className="text-xs font-bold text-gray-800 line-clamp-2 mb-2">{activeVideo.title}</p>
                <PlatformBadge platform={activeVideo.platform} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {showAddModal && (
        <AddVideoModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); fetchVideos(); }} />
      )}
      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onUpdated={() => { setSelectedVideo(null); fetchVideos(); }}
        />
      )}
    </div>
  );
}

// ─── Tab 3: Publishing Calendar ───────────────────────────────────────────────
function PublishingCalendarTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarVideos, setCalendarVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    try {
      const res = await fetch(`/api/crm/content/calendar?start=${start}&end=${end}`);
      const data = await res.json();
      setCalendarVideos(Array.isArray(data) ? data : []);
    } catch { setCalendarVideos([]); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getVideosForDay = (day: number) =>
    calendarVideos.filter(v => {
      if (!v.scheduledAt) return false;
      const d = new Date(v.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const monthNames = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const platformColors: Record<ContentPlatform, string> = {
    tiktok: "#64748b", facebook: "#2563eb", youtube: "#ef4444", all: "#7c3aed",
  };

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-2xl border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <h3 className="text-lg font-bold text-gray-800 min-w-[130px] text-center">
            {monthNames[month]} {year}
          </h3>
          <button onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-2xl border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
          {(["tiktok", "facebook", "youtube"] as ContentPlatform[]).map(p => (
            <span key={p} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: platformColors[p] }} />
              {PLATFORM_CONFIG[p].label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-gray-50 bg-gray-50/80">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-3.5 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="min-h-[96px] border-r border-b border-gray-50 bg-gray-50/20" />;
              const dayVideos = getVideosForDay(day);
              return (
                <div key={day}
                  className={`min-h-[96px] border-r border-b border-gray-50 p-2 transition-colors ${
                    isToday(day) ? "bg-amber-50/60" : "hover:bg-gray-50/40"
                  }`}>
                  <div className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day) ? "text-white shadow-sm" : "text-gray-500"
                  }`} style={isToday(day) ? { background: "linear-gradient(135deg, #d97706, #b45309)" } : {}}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayVideos.slice(0, 3).map(v => {
                      const color = platformColors[v.platform] || "#7c3aed";
                      return (
                        <div key={v.id}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] truncate font-semibold"
                          style={{ background: `${color}15`, color }}
                          title={v.title}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="truncate">{v.title}</span>
                        </div>
                      );
                    })}
                    {dayVideos.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1 font-medium">+{dayVideos.length - 3} khác</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary cards */}
      {!loading && (
        <div className="mt-5 grid grid-cols-3 gap-4">
          {(["tiktok", "facebook", "youtube"] as ContentPlatform[]).map(p => {
            const count = calendarVideos.filter(v => v.platform === p || v.platform === "all").length;
            const cfg = PLATFORM_CONFIG[p];
            const Icon = cfg.icon;
            return (
              <div key={p} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon size={18} style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold">{cfg.label}</p>
                  <p className="text-xl font-bold text-gray-800">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Add Video Modal ──────────────────────────────────────────────────────────
function AddVideoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("tiktok");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/crm/content/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topic, platform, scheduledAt: scheduledAt || undefined, notes }),
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.2)" }}>
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 100%)" }}>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
              <Plus size={14} className="text-white" />
            </div>
            Thêm ý tưởng video
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Tiêu đề <span className="text-red-400 normal-case tracking-normal">*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Review giường SmartFurni Pro 3000"
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all placeholder:text-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Chủ đề</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="VD: Giường điều chỉnh, sức khỏe cột sống..."
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all placeholder:text-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nền tảng</label>
            <div className="grid grid-cols-4 gap-2">
              {(["tiktok", "facebook", "youtube", "all"] as ContentPlatform[]).map(p => {
                const cfg = PLATFORM_CONFIG[p];
                return (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={`py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${
                      platform === p ? "shadow-sm" : "border-gray-100 text-gray-400 hover:border-gray-200 bg-gray-50/50"
                    }`}
                    style={platform === p ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : {}}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ngày đăng dự kiến</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 resize-none bg-gray-50/50 transition-all placeholder:text-gray-300" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2.5">
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-2xl disabled:opacity-50 transition-all shadow-md"
            style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu
          </button>
          <button onClick={onClose}
            className="px-5 py-3 text-sm text-gray-500 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-semibold">
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Detail Modal ───────────────────────────────────────────────────────
function VideoDetailModal({ video, onClose, onUpdated }: { video: ContentVideo; onClose: () => void; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [script, setScript] = useState(video.script || "");
  const [notes, setNotes] = useState(video.notes || "");
  const [scheduledAt, setScheduledAt] = useState(video.scheduledAt ? new Date(video.scheduledAt).toISOString().slice(0, 16) : "");
  const [publishedUrl, setPublishedUrl] = useState(video.publishedUrl || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/crm/content/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script: script || undefined, notes: notes || undefined, scheduledAt: scheduledAt || undefined, publishedUrl: publishedUrl || undefined }),
      });
      setEditing(false);
      onUpdated();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 sticky top-0 bg-white z-10 rounded-t-3xl"
          style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 80%)" }}>
          <div className="flex items-center gap-2">
            <PlatformBadge platform={video.platform} />
            <StatusBadge status={video.status} />
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-2 border-gray-100 rounded-xl hover:bg-gray-50 transition-all text-gray-600">
                <Edit3 size={12} /> Chỉnh sửa
              </button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm"
                  style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-2 text-xs font-semibold border-2 border-gray-100 rounded-xl hover:bg-gray-50 transition-all text-gray-500">
                  Huỷ
                </button>
              </>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full text-lg font-bold border-2 border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50" />
          ) : (
            <h2 className="text-lg font-bold text-gray-900">{video.title}</h2>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 rounded-2xl px-4 py-2.5">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs font-medium">Tạo: {fmtDateTime(video.createdAt)}</span>
            </div>
            {video.scheduledAt && !editing && (
              <div className="flex items-center gap-2 text-gray-500 bg-amber-50 rounded-2xl px-4 py-2.5">
                <Calendar size={13} className="text-amber-500" />
                <span className="text-xs font-medium">Lên lịch: {fmtDateTime(video.scheduledAt)}</span>
              </div>
            )}
            {editing && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ngày đăng</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50" />
              </div>
            )}
          </div>

          {video.status === "published" && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Eye, label: "Lượt xem", value: video.viewsCount, color: "#3b82f6" },
                { icon: Heart, label: "Thích", value: video.likesCount, color: "#ef4444" },
                { icon: MessageCircle, label: "Bình luận", value: video.commentsCount, color: "#8b5cf6" },
                { icon: Share2, label: "Chia sẻ", value: video.sharesCount, color: "#10b981" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-2xl p-3 text-center border-2" style={{ background: `${color}08`, borderColor: `${color}20` }}>
                  <Icon size={16} className="mx-auto mb-1" style={{ color }} />
                  <p className="text-base font-bold text-gray-800">{fmtNum(value)}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
                </div>
              ))}
            </div>
          )}

          {editing ? (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Link bài đăng</label>
              <input value={publishedUrl} onChange={e => setPublishedUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 bg-gray-50/50" />
            </div>
          ) : video.publishedUrl ? (
            <a href={video.publishedUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-semibold">
              <ExternalLink size={13} /> Xem bài đăng
            </a>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Film size={11} />
              Kịch bản
              {video.scriptGeneratedBy === "ai" && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-bold normal-case tracking-normal">
                  <Sparkles size={8} /> AI
                </span>
              )}
            </label>
            {editing ? (
              <textarea value={script} onChange={e => setScript(e.target.value)} rows={10}
                placeholder="Nhập kịch bản video..."
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 resize-none font-mono bg-gray-50/50" />
            ) : video.script ? (
              <pre className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto border border-gray-100">
                {video.script}
              </pre>
            ) : (
              <p className="text-sm text-gray-300 italic bg-gray-50 rounded-2xl p-4">Chưa có kịch bản</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ghi chú</label>
            {editing ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 resize-none bg-gray-50/50" />
            ) : video.notes ? (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-2xl p-4">{video.notes}</p>
            ) : (
              <p className="text-sm text-gray-300 italic bg-gray-50 rounded-2xl p-4">Không có ghi chú</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ContentMarketingClient() {
  const [activeTab, setActiveTab] = useState<"generator" | "planner" | "calendar" | "settings">("generator");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savedToast, setSavedToast] = useState(false);

  const tabs = [
    { id: "generator" as const, label: "AI Script Generator", icon: Wand2,      desc: "Tạo kịch bản bằng AI" },
    { id: "planner" as const,   label: "Kế hoạch Content",    icon: LayoutGrid,  desc: "Quản lý pipeline" },
    { id: "calendar" as const,  label: "Lịch đăng bài",       icon: Calendar,    desc: "Xem theo tháng" },
    { id: "settings" as const,  label: "Cài đặt",             icon: Settings,    desc: "Admin only" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)" }}>
          <Video size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Content Marketing AI</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tạo kịch bản video, quản lý sản xuất và lên lịch đăng bài TikTok / Facebook / YouTube</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-400 hover:text-gray-600 hover:bg-white/60"
              }`}
            >
              <Icon size={15} style={active ? { color: "#b45309" } : {}} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toast */}
      {savedToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 20px 40px rgba(22,163,74,0.3)" }}>
          <CheckCircle2 size={16} />
          Đã lưu kịch bản vào Kế hoạch Content!
        </div>
      )}

      {/* Tab Content */}
      <div>
        {activeTab === "generator" && (
          <AIScriptTab onScriptSaved={() => {
            setRefreshKey(k => k + 1);
            setActiveTab("planner");
            setSavedToast(true);
            setTimeout(() => setSavedToast(false), 3000);
          }} />
        )}
        {activeTab === "planner" && <ContentPlannerTab key={refreshKey} />}
        {activeTab === "calendar" && <PublishingCalendarTab key={refreshKey} />}
        {activeTab === "settings" && <ContentSettingsTab />}
      </div>
    </div>
  );
}
