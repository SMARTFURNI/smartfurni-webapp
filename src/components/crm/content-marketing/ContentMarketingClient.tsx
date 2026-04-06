"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Video, Calendar, Plus, Loader2, Copy, Check,
  ChevronDown, ChevronUp, Trash2, Edit3, Save, X, ExternalLink,
  TrendingUp, Eye, Heart, MessageCircle, Share2, Clock, Tag,
  Film, Youtube, Facebook, Smartphone, RefreshCw, History,
  ArrowRight, CheckCircle2, Circle, PlayCircle, Scissors,
  Upload, AlertCircle, LayoutGrid, List, ChevronLeft, ChevronRight,
} from "lucide-react";

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
const PLATFORM_CONFIG: Record<ContentPlatform, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  tiktok:   { label: "TikTok",   color: "#010101", bg: "#f0f0f0", icon: Smartphone },
  facebook: { label: "Facebook", color: "#1877f2", bg: "#e7f3ff", icon: Facebook },
  youtube:  { label: "YouTube",  color: "#ff0000", bg: "#fff0f0", icon: Youtube },
  all:      { label: "Đa nền tảng", color: "#7c3aed", bg: "#f5f3ff", icon: Film },
};

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; icon: React.ElementType; next?: ContentStatus }> = {
  idea:       { label: "Ý tưởng",     color: "#6b7280", bg: "#f3f4f6", icon: Circle,       next: "scripted" },
  scripted:   { label: "Có kịch bản", color: "#2563eb", bg: "#eff6ff", icon: Edit3,         next: "recording" },
  recording:  { label: "Đang quay",   color: "#d97706", bg: "#fffbeb", icon: PlayCircle,    next: "editing" },
  editing:    { label: "Đang dựng",   color: "#7c3aed", bg: "#f5f3ff", icon: Scissors,      next: "published" },
  published:  { label: "Đã đăng",     color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2,  next: undefined },
  cancelled:  { label: "Đã huỷ",      color: "#9ca3af", bg: "#f9fafb", icon: X,             next: undefined },
};

const TONE_OPTIONS = [
  { value: "professional", label: "Chuyên nghiệp" },
  { value: "casual",       label: "Thân thiện" },
  { value: "humorous",     label: "Hài hước" },
  { value: "emotional",    label: "Cảm xúc" },
  { value: "educational",  label: "Giáo dục" },
];

const KANBAN_COLUMNS: ContentStatus[] = ["idea", "scripted", "recording", "editing", "published"];

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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}>
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

// ─── Tab 1: AI Script Generator ───────────────────────────────────────────────
function AIScriptTab({ onScriptSaved }: { onScriptSaved: () => void; }) {
  const [platform, setPlatform] = useState<ContentPlatform>("tiktok");
  const [topic, setTopic] = useState("");
  const [productName, setProductName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("professional");
  const [durationSeconds, setDurationSeconds] = useState<number | "">("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề video");
      return;
    }
    setError("");
    setLoading(true);
    setGeneratedScript("");
    try {
      const res = await fetch("/api/crm/content/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform, topic, productName, targetAudience, tone,
          durationSeconds: durationSeconds || undefined,
          additionalNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo kịch bản");
      setGeneratedScript(data.script);
      setGenerationId(data.generationId);
      setSaveTitle(`[${PLATFORM_CONFIG[platform].label}] ${topic}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
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
          script: generatedScript,
          scriptGeneratedBy: "ai",
          durationSeconds: durationSeconds || undefined,
          hashtags: [],
          notes: additionalNotes,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi ${res.status}`);
      }
      setShowSaveForm(false);
      setGeneratedScript("");
      setGenerationId("");
      setTopic("");
      onScriptSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-yellow-500" />
            Thông tin kịch bản
          </h3>

          {/* Platform */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nền tảng</label>
            <div className="grid grid-cols-2 gap-2">
              {(["tiktok", "facebook", "youtube", "all"] as ContentPlatform[]).map(p => {
                const cfg = PLATFORM_CONFIG[p];
                const Icon = cfg.icon;
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      platform === p
                        ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    <Icon size={14} style={{ color: platform === p ? "#b45309" : cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chủ đề video <span className="text-red-500">*</span>
            </label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="VD: Giường điều chỉnh điện giúp ngủ ngon hơn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Product Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="VD: Giường điều chỉnh SmartFurni Pro 3000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Target Audience */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng mục tiêu</label>
            <input
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="VD: Dân văn phòng 25-45 tuổi, đau lưng, khó ngủ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Tone + Duration */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giọng điệu</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {TONE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (giây)</label>
              <input
                type="number"
                value={durationSeconds}
                onChange={e => setDurationSeconds(e.target.value ? parseInt(e.target.value) : "")}
                placeholder={platform === "tiktok" ? "30" : platform === "youtube" ? "180" : "60"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
            <textarea
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="VD: Nhấn mạnh tính năng massage, có khuyến mãi 20%..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold py-3 rounded-xl hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Đang tạo kịch bản...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Tạo kịch bản AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Generated Script */}
      <div className="space-y-4">
        {generatedScript ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-white">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">Kịch bản được tạo bởi AI</span>
                <PlatformBadge platform={platform} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied ? "Đã copy" : "Copy"}
                </button>
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                >
                  <Save size={12} />
                  Lưu vào kế hoạch
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[500px] overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {generatedScript}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-yellow-400" />
            </div>
            <p className="text-gray-500 text-sm">
              Điền thông tin bên trái và nhấn <strong>Tạo kịch bản AI</strong>
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Gemini AI sẽ tạo kịch bản video chuyên nghiệp cho bạn
            </p>
          </div>
        )}

        {/* Save Form Modal */}
        {showSaveForm && (
          <div className="bg-white rounded-xl border border-yellow-200 p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Save size={14} className="text-yellow-500" />
              Lưu vào kế hoạch content
            </h4>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="Tiêu đề video..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveVideo}
                disabled={saving || !saveTitle.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Lưu
              </button>
              <button
                onClick={() => setShowSaveForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Content Planner (Kanban) ─────────────────────────────────────────
function ContentPlannerTab() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentVideo | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<ContentPlatform | "">("");

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterPlatform
        ? `/api/crm/content/videos?platform=${filterPlatform}`
        : "/api/crm/content/videos";
      const res = await fetch(url);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [filterPlatform]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleStatusChange = async (videoId: string, newStatus: ContentStatus) => {
    await fetch(`/api/crm/content/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchVideos();
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Xoá video này?")) return;
    await fetch(`/api/crm/content/videos/${videoId}`, { method: "DELETE" });
    fetchVideos();
  };

  const columnVideos = (status: ContentStatus) =>
    videos.filter(v => v.status === status);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Lọc nền tảng:</span>
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value as ContentPlatform | "")}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Tất cả</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-yellow-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <Plus size={14} />
          Thêm ý tưởng
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-yellow-500" />
        </div>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto">
          {KANBAN_COLUMNS.map(status => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const cols = columnVideos(status);
            return (
              <div key={status} className="min-w-[180px]">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-t-lg font-medium text-xs mb-2"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  <Icon size={12} />
                  {cfg.label}
                  <span className="ml-auto bg-white rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ color: cfg.color }}>
                    {cols.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {cols.map(video => (
                    <div
                      key={video.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <p className="text-xs font-medium text-gray-800 line-clamp-2 flex-1">
                          {video.title}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(video.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={10} className="text-red-400" />
                        </button>
                      </div>
                      <PlatformBadge platform={video.platform} />
                      {video.scheduledAt && (
                        <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                          <Clock size={9} />
                          {fmtDate(video.scheduledAt)}
                        </p>
                      )}
                      {video.scriptGeneratedBy === "ai" && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                          <Sparkles size={8} />
                          AI
                        </span>
                      )}
                      {/* Move to next status */}
                      {cfg.next && (
                        <button
                          onClick={e => { e.stopPropagation(); handleStatusChange(video.id, cfg.next!); }}
                          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded py-1 transition-colors border border-transparent hover:border-yellow-200"
                        >
                          <ArrowRight size={9} />
                          {STATUS_CONFIG[cfg.next].label}
                        </button>
                      )}
                    </div>
                  ))}
                  {cols.length === 0 && (
                    <div className="text-center py-6 text-gray-300 text-xs">
                      Trống
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Video Modal */}
      {showAddModal && (
        <AddVideoModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchVideos(); }}
        />
      )}

      {/* Video Detail Modal */}
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
    } catch {
      setCalendarVideos([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getVideosForDay = (day: number) => {
    return calendarVideos.filter(v => {
      if (!v.scheduledAt) return false;
      const d = new Date(v.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  ];
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="text-base font-semibold text-gray-800">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
            TikTok
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            Facebook
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            YouTube
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-yellow-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[80px] border-r border-b border-gray-50" />;
              }
              const dayVideos = getVideosForDay(day);
              return (
                <div
                  key={day}
                  className={`min-h-[80px] border-r border-b border-gray-100 p-1.5 ${
                    isToday(day) ? "bg-yellow-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day)
                      ? "bg-yellow-500 text-white"
                      : "text-gray-600"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayVideos.slice(0, 3).map(v => {
                      const dotColor =
                        v.platform === "tiktok" ? "#60a5fa" :
                        v.platform === "facebook" ? "#2563eb" :
                        v.platform === "youtube" ? "#ef4444" : "#7c3aed";
                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate"
                          style={{ background: `${dotColor}15`, color: dotColor }}
                          title={v.title}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                          <span className="truncate">{v.title}</span>
                        </div>
                      );
                    })}
                    {dayVideos.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1">
                        +{dayVideos.length - 3} khác
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(["tiktok", "facebook", "youtube"] as ContentPlatform[]).map(p => {
            const count = calendarVideos.filter(v => v.platform === p || v.platform === "all").length;
            const cfg = PLATFORM_CONFIG[p];
            const Icon = cfg.icon;
            return (
              <div key={p} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <Icon size={16} style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{cfg.label}</p>
                  <p className="text-lg font-bold text-gray-800">{count}</p>
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Plus size={16} className="text-yellow-500" />
            Thêm ý tưởng video
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Review giường SmartFurni Pro 3000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="VD: Giường điều chỉnh, sức khỏe cột sống..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nền tảng</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["tiktok", "facebook", "youtube", "all"] as ContentPlatform[]).map(p => {
                const cfg = PLATFORM_CONFIG[p];
                return (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      platform === p ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày đăng dự kiến</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-yellow-600 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Detail Modal ───────────────────────────────────────────────────────
function VideoDetailModal({
  video,
  onClose,
  onUpdated,
}: {
  video: ContentVideo;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [script, setScript] = useState(video.script || "");
  const [notes, setNotes] = useState(video.notes || "");
  const [scheduledAt, setScheduledAt] = useState(
    video.scheduledAt ? new Date(video.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const [publishedUrl, setPublishedUrl] = useState(video.publishedUrl || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/crm/content/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, script: script || undefined,
          notes: notes || undefined,
          scheduledAt: scheduledAt || undefined,
          publishedUrl: publishedUrl || undefined,
        }),
      });
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <PlatformBadge platform={video.platform} />
            <StatusBadge status={video.status} />
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Edit3 size={12} />
                Chỉnh sửa
              </button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Lưu
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Huỷ
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          {editing ? (
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full text-lg font-semibold border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          ) : (
            <h2 className="text-lg font-semibold text-gray-800">{video.title}</h2>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={13} />
              <span>Tạo: {fmtDateTime(video.createdAt)}</span>
            </div>
            {video.scheduledAt && !editing && (
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={13} />
                <span>Lên lịch: {fmtDateTime(video.scheduledAt)}</span>
              </div>
            )}
            {editing && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ngày đăng</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            )}
          </div>

          {/* Stats (if published) */}
          {video.status === "published" && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Eye, label: "Lượt xem", value: video.viewsCount },
                { icon: Heart, label: "Thích", value: video.likesCount },
                { icon: MessageCircle, label: "Bình luận", value: video.commentsCount },
                { icon: Share2, label: "Chia sẻ", value: video.sharesCount },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                  <Icon size={14} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm font-bold text-gray-800">{fmtNum(value)}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Published URL */}
          {editing ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link bài đăng</label>
              <input value={publishedUrl} onChange={e => setPublishedUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          ) : video.publishedUrl ? (
            <a href={video.publishedUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <ExternalLink size={13} />
              Xem bài đăng
            </a>
          ) : null}

          {/* Script */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Film size={13} />
              Kịch bản
              {video.scriptGeneratedBy === "ai" && (
                <span className="text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles size={8} />
                  AI
                </span>
              )}
            </label>
            {editing ? (
              <textarea value={script} onChange={e => setScript(e.target.value)} rows={10}
                placeholder="Nhập kịch bản video..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none font-mono" />
            ) : video.script ? (
              <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                {video.script}
              </pre>
            ) : (
              <p className="text-sm text-gray-400 italic">Chưa có kịch bản</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            {editing ? (
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            ) : video.notes ? (
              <p className="text-sm text-gray-600">{video.notes}</p>
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
  const [activeTab, setActiveTab] = useState<"generator" | "planner" | "calendar">("generator");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savedToast, setSavedToast] = useState(false);

  const tabs = [
    { id: "generator" as const, label: "AI Script Generator", icon: Sparkles, desc: "Tạo kịch bản video bằng AI" },
    { id: "planner" as const,   label: "Kế hoạch Content",    icon: LayoutGrid, desc: "Quản lý pipeline sản xuất" },
    { id: "calendar" as const,  label: "Lịch đăng bài",       icon: Calendar,   desc: "Xem lịch theo tháng" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <Video size={16} className="text-white" />
            </div>
            Content Marketing AI
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tạo kịch bản video, quản lý sản xuất và lên lịch đăng bài TikTok / Facebook / YouTube
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} className={activeTab === tab.id ? "text-yellow-500" : ""} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toast notification */}
      {savedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
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
        {activeTab === "planner" && (
          <ContentPlannerTab key={refreshKey} />
        )}
        {activeTab === "calendar" && (
          <PublishingCalendarTab key={refreshKey} />
        )}
      </div>
    </div>
  );
}
