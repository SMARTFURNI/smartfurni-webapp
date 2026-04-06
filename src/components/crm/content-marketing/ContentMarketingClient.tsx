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
const PLATFORM_CONFIG: Record<ContentPlatform, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  tiktok:   { label: "TikTok",      color: "#010101", bg: "#f0f0f0",   border: "#d1d5db", icon: Smartphone },
  facebook: { label: "Facebook",    color: "#1877f2", bg: "#e7f3ff",   border: "#93c5fd", icon: Facebook },
  youtube:  { label: "YouTube",     color: "#ff0000", bg: "#fff0f0",   border: "#fca5a5", icon: Youtube },
  all:      { label: "Đa nền tảng", color: "#7c3aed", bg: "#f5f3ff",   border: "#c4b5fd", icon: Film },
};

const STATUS_CONFIG: Record<ContentStatus, {
  label: string; color: string; bg: string; gradient: string;
  icon: React.ElementType; prev?: ContentStatus; next?: ContentStatus;
}> = {
  idea:      { label: "Ý tưởng",     color: "#6b7280", bg: "#f9fafb", gradient: "from-gray-100 to-gray-50",    icon: Circle,       next: "scripted" },
  scripted:  { label: "Có kịch bản", color: "#2563eb", bg: "#eff6ff", gradient: "from-blue-50 to-blue-50/50",  icon: Edit3,        prev: "idea",      next: "recording" },
  recording: { label: "Đang quay",   color: "#d97706", bg: "#fffbeb", gradient: "from-amber-50 to-amber-50/50",icon: PlayCircle,   prev: "scripted",  next: "editing" },
  editing:   { label: "Đang dựng",   color: "#7c3aed", bg: "#f5f3ff", gradient: "from-purple-50 to-purple-50/50",icon: Scissors,   prev: "recording", next: "published" },
  published: { label: "Đã đăng",     color: "#16a34a", bg: "#f0fdf4", gradient: "from-green-50 to-green-50/50",icon: CheckCircle2, prev: "editing" },
  cancelled: { label: "Đã huỷ",      color: "#9ca3af", bg: "#f9fafb", gradient: "from-gray-50 to-gray-50/50",  icon: X },
};

const TONE_OPTIONS = [
  { value: "professional", label: "Chuyên nghiệp" },
  { value: "casual",       label: "Thân thiện" },
  { value: "humorous",     label: "Hài hước" },
  { value: "emotional",    label: "Cảm xúc" },
  { value: "educational",  label: "Giáo dục" },
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
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
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #10b981 50%, #f59e0b 100%)",
    "linear-gradient(135deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)",
  ];

  const staticGradient = "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: loading ? gradients[frame] : staticGradient,
        transition: loading ? "background 0.5s ease" : "opacity 0.2s",
        boxShadow: loading ? "0 0 20px rgba(245,158,11,0.4)" : "0 4px 12px rgba(245,158,11,0.3)",
      }}
      className="w-full flex items-center justify-center gap-2.5 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm relative overflow-hidden"
    >
      {loading && (
        <span className="absolute inset-0 opacity-20"
          style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)" }} />
      )}
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin relative z-10" />
          <span className="relative z-10">Đang tạo kịch bản...</span>
        </>
      ) : (
        <>
          <Wand2 size={16} className="relative z-10" />
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
    opacity: isDragging ? 0.4 : 1,
  };

  const cfg = STATUS_CONFIG[video.status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
    >
      {/* Drag handle + title row */}
      <div className="flex items-start gap-1.5 p-3 pb-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 rounded text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </button>
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-relaxed">
            {video.title}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(video.id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all flex-shrink-0"
        >
          <Trash2 size={10} className="text-red-400" />
        </button>
      </div>

      {/* Badges */}
      <div className="px-3 pb-2 flex flex-wrap gap-1" onClick={onClick}>
        <PlatformBadge platform={video.platform} />
        {video.scriptGeneratedBy === "ai" && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
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
      <div className="px-2 pb-2 flex gap-1">
        {cfg.prev && (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(video.id, cfg.prev!); }}
            className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg py-1 transition-colors border border-transparent hover:border-blue-200"
            title={`Quay lại: ${STATUS_CONFIG[cfg.prev].label}`}
          >
            <ArrowLeft size={9} />
            <span className="hidden sm:inline">{STATUS_CONFIG[cfg.prev].label}</span>
          </button>
        )}
        {cfg.next && (
          <button
            onClick={e => { e.stopPropagation(); onStatusChange(video.id, cfg.next!); }}
            className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg py-1 transition-colors border border-transparent hover:border-amber-200"
            title={`Tiếp theo: ${STATUS_CONFIG[cfg.next].label}`}
          >
            <span className="hidden sm:inline">{STATUS_CONFIG[cfg.next].label}</span>
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
      className={`flex flex-col rounded-2xl transition-all ${
        isOver ? "ring-2 ring-amber-400 bg-amber-50/50" : "bg-gray-50/80"
      }`}
      style={{ minHeight: 400 }}
    >
      {/* Column header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-t-2xl bg-gradient-to-r ${cfg.gradient} border-b border-gray-200`}
      >
        <Icon size={13} style={{ color: cfg.color }} />
        <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
        <span
          className="ml-auto text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: cfg.color, color: "#fff" }}
        >
          {videos.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2">
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
          <div className={`flex flex-col items-center justify-center py-8 text-gray-300 text-xs rounded-xl border-2 border-dashed transition-colors ${
            isOver ? "border-amber-300 text-amber-400" : "border-gray-200"
          }`}>
            <Icon size={20} className="mb-1 opacity-40" />
            <span>Kéo thả vào đây</span>
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
        body: JSON.stringify({ platform, topic, productName, targetAudience, tone, duration, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo kịch bản");
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-5">
        {/* Platform selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nền tảng</label>
          <div className="grid grid-cols-2 gap-2">
            {(["tiktok", "facebook", "youtube", "all"] as ContentPlatform[]).map(p => {
              const cfg = PLATFORM_CONFIG[p];
              const Icon = cfg.icon;
              const active = platform === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    active
                      ? "shadow-sm"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                  }`}
                  style={active ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : {}}
                >
                  <Icon size={15} />
                  {cfg.label}
                  {active && <span className="ml-auto w-2 h-2 rounded-full" style={{ background: cfg.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Chủ đề video <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => { setShowTopicSuggestions(v => !v); setShowAudienceSuggestions(false); }}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors border border-amber-200"
            >
              <Sparkles size={11} />
              Gợi ý ý tưởng
            </button>
          </div>
          <div className="relative">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onFocus={() => setShowTopicSuggestions(false)}
              placeholder="VD: Giường điều chỉnh điện giúp ngủ ngon hơn"
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
            />
            {showTopicSuggestions && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-amber-200 rounded-xl shadow-xl overflow-hidden">
                {topicHistory.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <History size={11} /> Đã dùng gần đây
                      </p>
                    </div>
                    <div className="max-h-32 overflow-y-auto border-b border-gray-100">
                      {topicHistory.map((s, i) => (
                        <div key={i} className="flex items-center group hover:bg-amber-50 transition-colors">
                          <button type="button" onClick={() => { setTopic(s); setShowTopicSuggestions(false); }}
                            className="flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:text-amber-800">{s}</button>
                          <button type="button" onClick={e => { e.stopPropagation(); removeTopicHistory(s); }}
                            className="px-2 py-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <Sparkles size={11} /> Gợi ý cho {PLATFORM_CONFIG[platform].label}
                  </p>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {TOPIC_SUGGESTIONS[platform].map((s, i) => (
                    <button key={i} type="button"
                      onClick={() => { setTopic(s); setShowTopicSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800 transition-colors border-b border-gray-50 last:border-0">
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
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên sản phẩm</label>
          <input
            value={productName}
            onChange={e => setProductName(e.target.value)}
            placeholder="VD: Giường điều chỉnh SmartFurni Pro 3000"
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white"
          />
        </div>

        {/* Target audience */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-700">Đối tượng mục tiêu</label>
            <button
              type="button"
              onClick={() => { setShowAudienceSuggestions(v => !v); setShowTopicSuggestions(false); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors border border-blue-200"
            >
              <TrendingUp size={11} />
              Gợi ý đối tượng
            </button>
          </div>
          <div className="relative">
            <input
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              onFocus={() => setShowAudienceSuggestions(false)}
              placeholder="VD: Chủ đầu tư BĐS, quản lý khách sạn..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
            />
            {showAudienceSuggestions && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-blue-200 rounded-xl shadow-xl overflow-hidden">
                {audienceHistory.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <History size={11} /> Đã dùng gần đây
                      </p>
                    </div>
                    <div className="max-h-32 overflow-y-auto border-b border-gray-100">
                      {audienceHistory.map((s, i) => (
                        <div key={i} className="flex items-center group hover:bg-blue-50 transition-colors">
                          <button type="button" onClick={() => { setTargetAudience(s); setShowAudienceSuggestions(false); }}
                            className="flex-1 text-left px-3 py-2 text-sm text-gray-700 hover:text-blue-800">{s}</button>
                          <button type="button" onClick={e => { e.stopPropagation(); removeAudienceHistory(s); }}
                            className="px-2 py-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                    <TrendingUp size={11} /> Gợi ý cho {PLATFORM_CONFIG[platform].label}
                  </p>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {AUDIENCE_SUGGESTIONS[platform].map((s, i) => (
                    <button key={i} type="button"
                      onClick={() => { setTargetAudience(s); setShowAudienceSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors border-b border-gray-50 last:border-0">
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
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giọng điệu</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thời lượng (giây)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              min={15}
              max={600}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú thêm</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="VD: Nhấn mạnh tính năng massage, có khuyến mãi 20%..."
            className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Generate button */}
        <GenerateButton loading={loading} disabled={loading || !topic.trim()} onClick={handleGenerate} />
      </div>

      {/* Right: Generated Script */}
      <div className="space-y-4">
        {generatedScript ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100"
              style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 100%)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">Kịch bản AI</span>
                <PlatformBadge platform={platform} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied ? "Đã copy" : "Copy"}
                </button>
                <button onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
                  <Save size={12} />
                  Lưu vào kế hoạch
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[520px] overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {generatedScript}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-14 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" }}>
              <Wand2 size={32} className="text-amber-500" />
            </div>
            <p className="text-gray-600 text-sm font-medium">Điền thông tin bên trái và nhấn</p>
            <p className="text-amber-600 font-bold text-base mt-1">Tạo kịch bản AI</p>
            <p className="text-gray-400 text-xs mt-2">Gemini AI sẽ tạo kịch bản video chuyên nghiệp</p>
          </div>
        )}

        {/* Save Form */}
        {showSaveForm && (
          <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Save size={14} className="text-amber-500" />
              Lưu vào kế hoạch content
            </h4>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="Tiêu đề video..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveVideo} disabled={saving || !saveTitle.trim()}
                className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Lưu
              </button>
              <button onClick={() => setShowSaveForm(false)}
                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
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
    // Optimistic update
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

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Lọc nền tảng:</span>
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value as ContentPlatform | "")}
            className="border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="">Tất cả</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
          </select>
          <span className="text-xs text-gray-400 hidden md:inline">
            💡 Kéo thả card để chuyển trạng thái
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
          style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
        >
          <Plus size={14} />
          Thêm ý tưởng
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-amber-500" />
            <p className="text-sm text-gray-400">Đang tải kế hoạch...</p>
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
              <div className="bg-white rounded-xl border-2 border-amber-400 shadow-2xl p-3 opacity-95 rotate-2 w-48">
                <p className="text-xs font-semibold text-gray-800 line-clamp-2">{activeVideo.title}</p>
                <div className="mt-1.5">
                  <PlatformBadge platform={activeVideo.platform} />
                </div>
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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-lg font-bold text-gray-800 min-w-[120px] text-center">
            {monthNames[month]} {year}
          </h3>
          <button onClick={nextMonth}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {(["tiktok", "facebook", "youtube"] as ContentPlatform[]).map(p => (
            <span key={p} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: platformColors[p] }} />
              {PLATFORM_CONFIG[p].label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-500 py-3">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} className="min-h-[90px] border-r border-b border-gray-50 bg-gray-50/30" />;
              const dayVideos = getVideosForDay(day);
              return (
                <div key={day}
                  className={`min-h-[90px] border-r border-b border-gray-100 p-1.5 transition-colors ${
                    isToday(day) ? "bg-amber-50" : "hover:bg-gray-50/50"
                  }`}>
                  <div className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day) ? "text-white" : "text-gray-600"
                  }`} style={isToday(day) ? { background: "linear-gradient(135deg, #f59e0b, #f97316)" } : {}}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayVideos.slice(0, 3).map(v => {
                      const color = platformColors[v.platform] || "#7c3aed";
                      return (
                        <div key={v.id}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] truncate font-medium"
                          style={{ background: `${color}18`, color }}
                          title={v.title}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="truncate">{v.title}</span>
                        </div>
                      );
                    })}
                    {dayVideos.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1">+{dayVideos.length - 3} khác</div>
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
              <div key={p} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon size={18} style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{cfg.label}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 100%)" }}>
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Plus size={14} className="text-white" />
            </div>
            Thêm ý tưởng video
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Review giường SmartFurni Pro 3000"
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chủ đề</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="VD: Giường điều chỉnh, sức khỏe cột sống..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nền tảng</label>
            <div className="grid grid-cols-4 gap-2">
              {(["tiktok", "facebook", "youtube", "all"] as ContentPlatform[]).map(p => {
                const cfg = PLATFORM_CONFIG[p];
                return (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      platform === p ? "shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                    }`}
                    style={platform === p ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : {}}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày đăng dự kiến</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10"
          style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff 80%)" }}>
          <div className="flex items-center gap-2">
            <PlatformBadge platform={video.platform} />
            <StatusBadge status={video.status} />
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Edit3 size={12} /> Chỉnh sửa
              </button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-colors"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Huỷ
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full text-lg font-bold border border-gray-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          ) : (
            <h2 className="text-lg font-bold text-gray-800">{video.title}</h2>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs">Tạo: {fmtDateTime(video.createdAt)}</span>
            </div>
            {video.scheduledAt && !editing && (
              <div className="flex items-center gap-2 text-gray-500 bg-amber-50 rounded-xl px-3 py-2">
                <Calendar size={13} className="text-amber-500" />
                <span className="text-xs">Lên lịch: {fmtDateTime(video.scheduledAt)}</span>
              </div>
            )}
            {editing && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Ngày đăng</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
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
                <div key={label} className="rounded-2xl p-3 text-center border" style={{ background: `${color}10`, borderColor: `${color}30` }}>
                  <Icon size={16} className="mx-auto mb-1" style={{ color }} />
                  <p className="text-base font-bold text-gray-800">{fmtNum(value)}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          )}

          {editing ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link bài đăng</label>
              <input value={publishedUrl} onChange={e => setPublishedUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          ) : video.publishedUrl ? (
            <a href={video.publishedUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
              <ExternalLink size={13} /> Xem bài đăng
            </a>
          ) : null}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Film size={13} />
              Kịch bản
              {video.scriptGeneratedBy === "ai" && (
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-semibold">
                  <Sparkles size={8} /> AI
                </span>
              )}
            </label>
            {editing ? (
              <textarea value={script} onChange={e => setScript(e.target.value)} rows={10}
                placeholder="Nhập kịch bản video..."
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-mono" />
            ) : video.script ? (
              <pre className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto border border-gray-100">
                {video.script}
              </pre>
            ) : (
              <p className="text-sm text-gray-400 italic">Chưa có kịch bản</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú</label>
            {editing ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            ) : video.notes ? (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{video.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Không có ghi chú</p>
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
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)" }}>
          <Video size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Content Marketing AI</h1>
          <p className="text-sm text-gray-500">Tạo kịch bản video, quản lý sản xuất và lên lịch đăng bài TikTok / Facebook / YouTube</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100/80 rounded-2xl p-1.5 border border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <Icon size={15} style={active ? { color: "#f59e0b" } : {}} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toast */}
      {savedToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
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
