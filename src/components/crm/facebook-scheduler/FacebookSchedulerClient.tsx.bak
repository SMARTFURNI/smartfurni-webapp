"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Share2 as Facebook, Plus, Calendar, Clock, Trash2, Edit3, Send,
  CheckCircle2, AlertCircle, RefreshCw, Settings, BarChart2,
  Image, Link, Hash, ChevronDown, ChevronUp, Eye, Repeat,
  Play, Pause, FileText, Activity, X, Save, ExternalLink,
  Video, Upload, CheckCircle,
} from "lucide-react";
import type {
  ScheduledPost, FacebookPage, PostLog, PostStatus, RepeatType,
} from "@/lib/crm-facebook-scheduler-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:     { label: "Nháp",       color: "#6b7280", bg: "#f3f4f6", icon: FileText },
  scheduled: { label: "Đã lên lịch", color: "#2563eb", bg: "#eff6ff", icon: Clock },
  published: { label: "Đã đăng",    color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2 },
  failed:    { label: "Thất bại",   color: "#dc2626", bg: "#fef2f2", icon: AlertCircle },
  cancelled: { label: "Đã huỷ",    color: "#9ca3af", bg: "#f9fafb", icon: X },
};

const REPEAT_LABELS: Record<RepeatType, string> = {
  none: "Không lặp",
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  custom_days: "Tuỳ chỉnh ngày",
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "Quá hạn";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)} ngày nữa`;
  if (h > 0) return `${h}h ${m}m nữa`;
  return `${m} phút nữa`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PostStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PageBadge({ page }: { page: FacebookPage }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "#e7f3ff", color: "#1877f2" }}>
      <Facebook size={10} />
      {page.pageName}
    </span>
  );
}

// ─── Modal: Tạo/Sửa bài ──────────────────────────────────────────────────────

function PostFormModal({
  post, pages, onClose, onSave,
}: {
  post?: ScheduledPost | null;
  pages: FacebookPage[];
  onClose: () => void;
  onSave: (data: Partial<ScheduledPost>) => Promise<void>;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(post?.imageUrls ?? []);
  const [imageInput, setImageInput] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState(post?.linkUrl ?? "");
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(post?.pageIds ?? (pages.length > 0 ? [pages[0].id] : []));
  const [scheduledAt, setScheduledAt] = useState(
    post?.scheduledAt
      ? new Date(post.scheduledAt).toISOString().slice(0, 16)
      : new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );
  const [repeatType, setRepeatType] = useState<RepeatType>(post?.repeatType ?? "none");
  const [repeatDays, setRepeatDays] = useState<number[]>(post?.repeatDays ?? []);
  const [repeatEndDate, setRepeatEndDate] = useState(post?.repeatEndDate?.slice(0, 10) ?? "");
  const [hashtags, setHashtags] = useState(post?.hashtags?.join(" ") ?? "");
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(content.length);
  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoIds, setVideoIds] = useState<Record<string, string>>(post?.videoIds ?? {});
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>(post?.videoUrls ?? {});
  const [uploadSessionIds, setUploadSessionIds] = useState<Record<string, string>>(post?.uploadSessionIds ?? {});
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoUploadDone, setVideoUploadDone] = useState(Object.keys(post?.videoIds ?? {}).length > 0);

  const handleContentChange = (v: string) => {
    setContent(v);
    setCharCount(v.length);
  };

  const togglePage = (id: string) => {
    setSelectedPageIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const addImage = () => {
    if (imageInput.trim()) {
      setImageUrls(prev => [...prev, imageInput.trim()]);
      setImageInput("");
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setUploadError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/crm/facebook-scheduler/upload-image", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
        else setUploadError(data.error || "Upload thất bại");
      } catch {
        setUploadError("Lỗi kết nối khi upload ảnh");
      }
    }
    if (uploaded.length > 0) setImageUrls(prev => [...prev, ...uploaded]);
    setUploadingImages(false);
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;
    if (selectedPageIds.length === 0) {
      setVideoUploadError("Vui lòng chọn Fanpage trước khi upload video");
      return;
    }
    setVideoFile(file);
    setUploadingVideo(true);
    setVideoUploadError(null);
    setVideoUploadDone(false);
    setVideoUploadProgress(0);

    // Upload video lên từng page đã chọn
    const newVideoIds: Record<string, string> = {};
    const totalPages = selectedPageIds.length;
    let doneCount = 0;

    for (const pageId of selectedPageIds) {
      try {
        // Gửi raw binary (tránh giới hạn FormData của Next.js)
        const arrayBuffer = await file.arrayBuffer();
        // Truyền description để publish ngay trong finish phase
        const hashtagList = hashtags.split(/\s+/).filter((h: string) => h.trim()).map((h: string) => h.startsWith("#") ? h : `#${h}`);
        const fullDescription = [content.trim(), hashtagList.join(" ")].filter(Boolean).join("\n\n");
        const params = new URLSearchParams({
          pageId,
          fileName: file.name,
          description: fullDescription,
        });

        const res = await fetch(`/api/crm/facebook-scheduler/upload-video?${params}`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: arrayBuffer,
        });
        const data = await res.json();
        if (data.videoId) {
          // Lưu theo cả pageId (DB id) và fbPageId
          newVideoIds[pageId] = data.videoId;
          newVideoIds[data.pageId] = data.videoId;
        } else {
          setVideoUploadError(data.error || "Upload thất bại");
          setUploadingVideo(false);
          return;
        }
      } catch {
        setVideoUploadError("Lỗi kết nối khi upload video");
        setUploadingVideo(false);
        return;
      }
      doneCount++;
      setVideoUploadProgress(Math.round((doneCount / totalPages) * 100));
    }

    setVideoIds(newVideoIds);
    setVideoUploadDone(true);
    setUploadingVideo(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert("Vui lòng nhập tiêu đề bài");
    if (!content.trim()) return alert("Vui lòng nhập nội dung bài");
    if (selectedPageIds.length === 0) return alert("Vui lòng chọn ít nhất 1 Fanpage");
    // Khi có video: đăng ngay lập tức (không cần chọn thời gian)
    const finalScheduledAt = videoUploadDone
      ? new Date().toISOString()
      : scheduledAt;
    if (!videoUploadDone && !scheduledAt) return alert("Vui lòng chọn thời gian đăng");

    setSaving(true);
    try {
      const hashtagList = hashtags.split(/\s+/).filter(h => h.trim()).map(h => h.startsWith("#") ? h : `#${h}`);
      await onSave({
        title: title.trim(),
        content: content.trim(),
        imageUrls,
        videoIds: Object.keys(videoIds).length > 0 ? videoIds : undefined,
        videoUrls: Object.keys(videoUrls).length > 0 ? videoUrls : undefined,
        uploadSessionIds: Object.keys(uploadSessionIds).length > 0 ? uploadSessionIds : undefined,
        linkUrl: linkUrl.trim() || undefined,
        pageIds: selectedPageIds,
        scheduledAt: new Date(finalScheduledAt).toISOString(),
        repeatType,
        repeatDays: repeatType === "custom_days" ? repeatDays : undefined,
        repeatEndDate: repeatType !== "none" && repeatEndDate ? new Date(repeatEndDate).toISOString() : undefined,
        hashtags: hashtagList,
        tags: [],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#1877f2" }}>
              <Facebook size={16} color="#fff" />
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {post ? "Chỉnh sửa bài đăng" : "Tạo bài đăng mới"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} style={{ color: "#6b7280" }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              Tiêu đề nội bộ <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Bài đăng thứ 2 tuần 1 - Giới thiệu sản phẩm"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #d1d5db", color: "#374151" }}
            />
          </div>

          {/* Chọn Fanpage */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              Fanpage đăng lên <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {pages.length === 0 ? (
              <p className="text-xs" style={{ color: "#ef4444" }}>
                Chưa có Fanpage nào. Vui lòng thêm Fanpage trong tab Cài đặt.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pages.filter(p => p.isActive).map(page => (
                  <button
                    key={page.id}
                    onClick={() => togglePage(page.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      border: selectedPageIds.includes(page.id) ? "1.5px solid #1877f2" : "1.5px solid #e5e7eb",
                      background: selectedPageIds.includes(page.id) ? "#e7f3ff" : "#f9fafb",
                      color: selectedPageIds.includes(page.id) ? "#1877f2" : "#6b7280",
                    }}>
                    <Facebook size={12} />
                    {page.pageName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nội dung */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: "#374151" }}>
                Nội dung bài đăng <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span className="text-xs" style={{ color: charCount > 63206 ? "#ef4444" : "#9ca3af" }}>
                {charCount}/63206
              </span>
            </div>
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              rows={6}
              placeholder="Nhập nội dung bài đăng Facebook..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ border: "1px solid #d1d5db", color: "#374151", lineHeight: "1.6" }}
            />
          </div>

          {/* Hashtag */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              <Hash size={12} className="inline mr-1" />
              Hashtag (cách nhau bằng dấu cách)
            </label>
            <input
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="#smartfurni #giuongthongminh #noithat"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #d1d5db", color: "#374151" }}
            />
          </div>

          {/* Ảnh */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              <Image size={12} className="inline mr-1" />
              Ảnh đính kèm
            </label>
            {/* Upload từ máy tính */}
            <label
              className="flex flex-col items-center justify-center w-full rounded-lg cursor-pointer transition-colors"
              style={{
                border: "2px dashed #d1d5db",
                background: uploadingImages ? "#f0f9ff" : "#fafafa",
                padding: "16px 12px",
                minHeight: 72,
              }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploadingImages}
                onChange={e => handleFileUpload(e.target.files)}
              />
              {uploadingImages ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: "#2563eb" }}>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang tải ảnh lên...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#374151" }}>
                    <Image size={16} style={{ color: "#6b7280" }} />
                    <span>Nhấn để chọn ảnh từ máy tính</span>
                  </div>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>JPG, PNG, WEBP, GIF · Tối đa 10MB · Chọn nhiều ảnh cùng lúc</span>
                </div>
              )}
            </label>
            {/* Hoặc nhập URL */}
            <div className="flex gap-2 mt-2">
              <input
                value={imageInput}
                onChange={e => setImageInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addImage()}
                placeholder="Hoặc dán URL ảnh: https://example.com/image.jpg"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              />
              <button onClick={addImage}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: "#f3f4f6", color: "#374151" }}>
                Thêm
              </button>
            </div>
            {uploadError && (
              <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{uploadError}</p>
            )}
            {imageUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden"
                    style={{ aspectRatio: "1", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <X size={10} style={{ color: "#fff" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video đính kèm */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              <Video size={12} className="inline mr-1" />
              Video đính kèm (tuỳ chọn · tối đa 200MB)
            </label>
            {videoUploadDone ? (
              <div className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                <CheckCircle size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "#15803d" }}>Video đã upload thành công!</p>
                  <p className="text-xs truncate" style={{ color: "#4ade80" }}>{videoFile?.name ?? "Video đã upload"}</p>
                </div>
                <button
                  onClick={() => { setVideoIds({}); setVideoFile(null); setVideoUploadDone(false); }}
                  className="text-xs px-2 py-1 rounded" style={{ color: "#dc2626", background: "#fee2e2" }}>
                  Xoá
                </button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center w-full rounded-lg cursor-pointer transition-colors"
                style={{
                  border: `2px dashed ${uploadingVideo ? "#2563eb" : "#d1d5db"}`,
                  background: uploadingVideo ? "#eff6ff" : "#fafafa",
                  padding: "16px 12px",
                  minHeight: 72,
                  cursor: uploadingVideo ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/mpeg,video/webm,.mp4,.mov,.avi,.mpeg,.webm"
                  className="hidden"
                  disabled={uploadingVideo}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }}
                />
                {uploadingVideo ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#2563eb" }}>
                      <Upload size={14} className="animate-bounce" />
                      <span>Đang upload video lên Facebook... {videoUploadProgress}%</span>
                    </div>
                    <div className="w-full rounded-full" style={{ height: 6, background: "#e5e7eb" }}>
                      <div
                        className="rounded-full transition-all"
                        style={{ height: 6, width: `${videoUploadProgress}%`, background: "#2563eb" }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Có thể mất vài phút với video lớn. Vui lòng không đóng trang.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#374151" }}>
                      <Video size={16} style={{ color: "#6b7280" }} />
                      <span>Nhấn để chọn video từ máy tính</span>
                    </div>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>MP4, MOV, AVI, WebM · Tối đa 200MB</span>
                  </div>
                )}
              </label>
            )}
            {videoUploadError && (
              <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{videoUploadError}</p>
            )}
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              <Link size={12} className="inline mr-1" />
              Link đính kèm (tuỳ chọn)
            </label>
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://smartfurni.vn/san-pham/..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #d1d5db", color: "#374151" }}
            />
          </div>

          {/* Thời gian đăng - ẩn khi có video (video đăng ngay lập tức) */}
          {!videoUploadDone && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                  <Clock size={12} className="inline mr-1" />
                  Thời gian đăng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid #d1d5db", color: "#374151" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                  <Repeat size={12} className="inline mr-1" />
                  Lặp lại
                </label>
                <select
                  value={repeatType}
                  onChange={e => setRepeatType(e.target.value as RepeatType)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid #d1d5db", color: "#374151" }}>
                  {(Object.entries(REPEAT_LABELS) as [RepeatType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {videoUploadDone && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              <Video size={14} />
              <span>Bài đăng có video sẽ được <strong>đăng ngay lập tức</strong> lên Facebook Reels khi bấm "Tạo bài đăng".</span>
            </div>
          )}

          {/* Tuỳ chỉnh ngày lặp */}
          {!videoUploadDone && repeatType === "custom_days" && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Chọn ngày trong tuần
              </label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    className="w-9 h-9 rounded-lg text-xs font-medium transition-all"
                    style={{
                      border: repeatDays.includes(i) ? "1.5px solid #C9A84C" : "1.5px solid #e5e7eb",
                      background: repeatDays.includes(i) ? "rgba(201,168,76,0.1)" : "#f9fafb",
                      color: repeatDays.includes(i) ? "#C9A84C" : "#6b7280",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ngày kết thúc lặp */}
          {!videoUploadDone && repeatType !== "none" && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Ngày kết thúc lặp lại (tuỳ chọn)
              </label>
              <input
                type="date"
                value={repeatEndDate}
                onChange={e => setRepeatEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#e5e7eb" }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#f3f4f6", color: "#374151" }}>
            Huỷ
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: saving ? "#9ca3af" : "#1877f2" }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {post ? "Lưu thay đổi" : "Tạo bài đăng"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Thêm Fanpage ──────────────────────────────────────────────────────

function AddPageModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<FacebookPage>) => Promise<void> }) {
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<{ pageId: string; pageName: string; category?: string; followerCount?: number } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleVerify = async () => {
    if (!token.trim()) return;
    setVerifying(true);
    setError("");
    setVerified(null);
    try {
      const res = await fetch("/api/crm/facebook-scheduler/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageAccessToken: token.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setVerified(data);
      } else {
        setError(data.error || "Token không hợp lệ");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!verified) return;
    setSaving(true);
    try {
      await onSave({
        pageId: verified.pageId,
        pageName: verified.pageName,
        pageAccessToken: token.trim(),
        category: verified.category,
        followerCount: verified.followerCount,
        isActive: true,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#e5e7eb" }}>
          <h2 className="text-base font-bold text-gray-900">Kết nối Fanpage Facebook</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} style={{ color: "#6b7280" }} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Hướng dẫn */}
          <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <p className="font-semibold" style={{ color: "#92400e" }}>Cách lấy Page Access Token:</p>
            <ol className="list-decimal list-inside space-y-0.5" style={{ color: "#78350f" }}>
              <li>Vào <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="underline">Graph API Explorer</a></li>
              <li>Chọn App → Chọn Page của bạn</li>
              <li>Cấp quyền: <code>pages_manage_posts</code>, <code>pages_read_engagement</code></li>
              <li>Nhấn "Generate Access Token" → Copy token</li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
              Page Access Token <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={e => { setToken(e.target.value); setVerified(null); setError(""); }}
                placeholder="EAABsbCS..."
                type="password"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              />
              <button onClick={handleVerify} disabled={verifying || !token.trim()}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: verifying ? "#e5e7eb" : "#1877f2", color: verifying ? "#9ca3af" : "#fff" }}>
                {verifying ? <RefreshCw size={14} className="animate-spin" /> : "Xác thực"}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {verified && (
            <div className="p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                <span className="text-xs font-semibold" style={{ color: "#15803d" }}>Xác thực thành công!</span>
              </div>
              <div className="space-y-1 text-xs" style={{ color: "#374151" }}>
                <p><span className="font-medium">Tên Page:</span> {verified.pageName}</p>
                <p><span className="font-medium">Page ID:</span> {verified.pageId}</p>
                {verified.category && <p><span className="font-medium">Danh mục:</span> {verified.category}</p>}
                {verified.followerCount && <p><span className="font-medium">Người theo dõi:</span> {verified.followerCount.toLocaleString("vi-VN")}</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#e5e7eb" }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#f3f4f6", color: "#374151" }}>
            Huỷ
          </button>
          <button onClick={handleSave} disabled={!verified || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: !verified || saving ? "#9ca3af" : "#1877f2" }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Thêm Fanpage
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Danh sách bài đăng ──────────────────────────────────────────────────

function PostsTab({ pages }: { pages: FacebookPage[] }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<PostStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus === "all"
        ? "/api/crm/facebook-scheduler/posts"
        : `/api/crm/facebook-scheduler/posts?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleSavePost = async (data: Partial<ScheduledPost>) => {
    if (editingPost) {
      await fetch(`/api/crm/facebook-scheduler/posts/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/crm/facebook-scheduler/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setEditingPost(null);
    await loadPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá bài đăng này?")) return;
    await fetch(`/api/crm/facebook-scheduler/posts/${id}`, { method: "DELETE" });
    await loadPosts();
  };

  const handlePublishNow = async (id: string) => {
    if (!confirm("Đăng bài này ngay bây giờ?")) return;
    setPublishing(id);
    try {
      const res = await fetch(`/api/crm/facebook-scheduler/posts/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const success = data.results?.filter((r: { success: boolean }) => r.success).length ?? 0;
        alert(`Đã đăng thành công lên ${success} fanpage!`);
      } else {
        alert("Đăng bài thất bại: " + (data.error || "Lỗi không xác định"));
      }
    } finally {
      setPublishing(null);
      await loadPosts();
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Huỷ lịch đăng bài này?")) return;
    await fetch(`/api/crm/facebook-scheduler/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    await loadPosts();
  };

  const pageMap = Object.fromEntries(pages.map(p => [p.id, p]));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "scheduled", "published", "failed", "draft", "cancelled"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterStatus === s ? "#1877f2" : "#f3f4f6",
                color: filterStatus === s ? "#fff" : "#6b7280",
              }}>
              {s === "all" ? "Tất cả" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPosts} className="p-2 rounded-lg hover:bg-gray-100">
            <RefreshCw size={15} style={{ color: "#6b7280" }} />
          </button>
          <button onClick={() => { setEditingPost(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#1877f2" }}>
            <Plus size={15} />
            Tạo bài mới
          </button>
        </div>
      </div>

      {/* Danh sách */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={20} className="animate-spin" style={{ color: "#9ca3af" }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "#f0f7ff" }}>
            <Calendar size={24} style={{ color: "#1877f2" }} />
          </div>
          <p className="text-sm font-medium text-gray-700">Chưa có bài đăng nào</p>
          <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
            Nhấn "Tạo bài mới" để lên lịch bài đăng đầu tiên
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const isExpanded = expandedPost === post.id;
            const postPages = post.pageIds.map(id => pageMap[id]).filter(Boolean);
            return (
              <div key={post.id} className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusBadge status={post.status} />
                        {post.repeatType !== "none" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                            style={{ background: "#f3f4f6", color: "#6b7280" }}>
                            <Repeat size={10} />
                            {REPEAT_LABELS[post.repeatType]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{post.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#6b7280" }}>
                          <Clock size={11} />
                          {formatDateTime(post.scheduledAt)}
                          {post.status === "scheduled" && (
                            <span className="ml-1 font-medium" style={{ color: "#2563eb" }}>
                              ({timeUntil(post.scheduledAt)})
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#6b7280" }}>
                          <Facebook size={11} />
                          {postPages.map(p => p.pageName).join(", ") || "Không rõ page"}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {post.status === "scheduled" && (
                        <>
                          <button onClick={() => handlePublishNow(post.id)}
                            disabled={publishing === post.id}
                            title="Đăng ngay"
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            style={{ color: "#1877f2" }}>
                            {publishing === post.id
                              ? <RefreshCw size={15} className="animate-spin" />
                              : <Send size={15} />}
                          </button>
                          <button onClick={() => { setEditingPost(post); setShowForm(true); }}
                            title="Chỉnh sửa"
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            style={{ color: "#6b7280" }}>
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => handleCancel(post.id)}
                            title="Huỷ lịch"
                            className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors"
                            style={{ color: "#d97706" }}>
                            <Pause size={15} />
                          </button>
                        </>
                      )}
                      {post.status === "failed" && (
                        <button onClick={() => handlePublishNow(post.id)}
                          disabled={publishing === post.id}
                          title="Thử lại"
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          style={{ color: "#dc2626" }}>
                          {publishing === post.id
                            ? <RefreshCw size={15} className="animate-spin" />
                            : <Play size={15} />}
                        </button>
                      )}
                      <button onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: "#9ca3af" }}>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      <button onClick={() => handleDelete(post.id)}
                        title="Xoá"
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: "#dc2626" }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "#f3f4f6" }}>
                    <div className="mt-3 space-y-3">
                      <div className="p-3 rounded-xl text-sm whitespace-pre-wrap"
                        style={{ background: "#f9fafb", color: "#374151", lineHeight: "1.6" }}>
                        {post.content}
                        {post.hashtags.length > 0 && (
                          <div className="mt-2" style={{ color: "#1877f2" }}>
                            {post.hashtags.join(" ")}
                          </div>
                        )}
                      </div>
                      {post.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.imageUrls.map((url, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                              style={{ background: "#f3f4f6", color: "#6b7280" }}>
                              <Image size={11} />
                              <span className="max-w-xs truncate">{url}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {post.linkUrl && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: "#2563eb" }}>
                          <Link size={11} />
                          <a href={post.linkUrl} target="_blank" rel="noreferrer" className="underline truncate">
                            {post.linkUrl}
                          </a>
                        </div>
                      )}
                      {post.errorMessage && (
                        <div className="flex items-start gap-2 p-2 rounded-lg text-xs"
                          style={{ background: "#fef2f2", color: "#dc2626" }}>
                          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                          {post.errorMessage}
                        </div>
                      )}
                      {post.facebookPostIds && Object.keys(post.facebookPostIds).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(post.facebookPostIds).map(([pid, fbId]) => {
                            const page = pageMap[pid];
                            return (
                              <a key={pid}
                                href={`https://www.facebook.com/${fbId}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:opacity-80"
                                style={{ background: "#e7f3ff", color: "#1877f2" }}>
                                <ExternalLink size={11} />
                                Xem bài trên {page?.pageName ?? pid}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <PostFormModal
          post={editingPost}
          pages={pages}
          onClose={() => { setShowForm(false); setEditingPost(null); }}
          onSave={handleSavePost}
        />
      )}
    </div>
  );
}

// ─── Tab: Lịch đăng bài (Calendar view) ──────────────────────────────────────

function CalendarTab({ pages }: { pages: FacebookPage[] }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/crm/facebook-scheduler/posts")
      .then(r => r.json())
      .then(d => setPosts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const postsByDay: Record<number, ScheduledPost[]> = {};
  posts.forEach(post => {
    const d = new Date(post.scheduledAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(post);
    }
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString("vi-VN", { month: "long", year: "numeric" });

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw size={20} className="animate-spin" style={{ color: "#9ca3af" }} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronDown size={16} style={{ color: "#6b7280", transform: "rotate(90deg)" }} />
        </button>
        <h3 className="text-sm font-bold text-gray-900 capitalize">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronDown size={16} style={{ color: "#6b7280", transform: "rotate(-90deg)" }} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
          <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: "#9ca3af" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const dayPosts = postsByDay[day] ?? [];
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
          return (
            <div key={day}
              className="min-h-16 p-1.5 rounded-xl"
              style={{
                background: isToday ? "rgba(24,119,242,0.06)" : "#f9fafb",
                border: isToday ? "1.5px solid #1877f2" : "1px solid #e5e7eb",
              }}>
              <div className="text-xs font-semibold mb-1"
                style={{ color: isToday ? "#1877f2" : "#374151" }}>{day}</div>
              {dayPosts.slice(0, 2).map(post => (
                <div key={post.id}
                  className="text-xs px-1 py-0.5 rounded mb-0.5 truncate"
                  style={{
                    background: STATUS_CONFIG[post.status].bg,
                    color: STATUS_CONFIG[post.status].color,
                    fontSize: "10px",
                  }}>
                  {post.title}
                </div>
              ))}
              {dayPosts.length > 2 && (
                <div className="text-xs" style={{ color: "#9ca3af", fontSize: "10px" }}>
                  +{dayPosts.length - 2} bài
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2">
        {(Object.entries(STATUS_CONFIG) as [PostStatus, typeof STATUS_CONFIG[PostStatus]][]).map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7280" }}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }} />
            {cfg.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Lịch sử đăng bài ────────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm/facebook-scheduler/logs")
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const ACTION_CONFIG = {
    published: { label: "Đã đăng", color: "#16a34a", bg: "#f0fdf4" },
    failed:    { label: "Thất bại", color: "#dc2626", bg: "#fef2f2" },
    cancelled: { label: "Đã huỷ",  color: "#9ca3af", bg: "#f9fafb" },
    scheduled: { label: "Đã lên lịch", color: "#2563eb", bg: "#eff6ff" },
    retry:     { label: "Thử lại", color: "#d97706", bg: "#fffbeb" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Lịch sử hoạt động</h3>
        <button onClick={() => {
          setLoading(true);
          fetch("/api/crm/facebook-scheduler/logs")
            .then(r => r.json())
            .then(d => setLogs(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
        }} className="p-1.5 rounded-lg hover:bg-gray-100">
          <RefreshCw size={14} style={{ color: "#6b7280" }} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={20} className="animate-spin" style={{ color: "#9ca3af" }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity size={24} style={{ color: "#d1d5db" }} />
          <p className="text-sm mt-2" style={{ color: "#9ca3af" }}>Chưa có lịch sử hoạt động</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.scheduled;
            return (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}>
                  {log.action === "published" ? <CheckCircle2 size={14} style={{ color: cfg.color }} />
                    : log.action === "failed" ? <AlertCircle size={14} style={{ color: cfg.color }} />
                    : <Activity size={14} style={{ color: cfg.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900 truncate">{log.postTitle}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: "#6b7280" }}>
                      <Facebook size={10} className="inline mr-0.5" />
                      {log.pageName}
                    </span>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>
                      {formatDateTime(log.executedAt)}
                    </span>
                  </div>
                  {log.errorMessage && (
                    <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{log.errorMessage}</p>
                  )}
                  {log.facebookPostId && (
                    <a href={`https://www.facebook.com/${log.facebookPostId}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs flex items-center gap-1 mt-1 hover:underline"
                      style={{ color: "#1877f2" }}>
                      <ExternalLink size={10} />
                      Xem bài đăng
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cài đặt ─────────────────────────────────────────────────────────────

function SettingsTab({ pages, onPagesChange }: { pages: FacebookPage[]; onPagesChange: () => void }) {
  const [showAddPage, setShowAddPage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ isEnabled: false, maxRetries: 3, retryDelayMinutes: 30 });
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    fetch("/api/crm/facebook-scheduler/config")
      .then(r => r.json())
      .then(d => { if (d && !d.error) setConfig(d); })
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleAddPage = async (data: Partial<FacebookPage>) => {
    await fetch("/api/crm/facebook-scheduler/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    onPagesChange();
  };

  const handleTogglePage = async (page: FacebookPage) => {
    await fetch("/api/crm/facebook-scheduler/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: page.id, isActive: !page.isActive }),
    });
    onPagesChange();
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm("Xoá Fanpage này khỏi hệ thống?")) return;
    await fetch(`/api/crm/facebook-scheduler/pages?id=${id}`, { method: "DELETE" });
    onPagesChange();
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await fetch("/api/crm/facebook-scheduler/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      alert("Đã lưu cài đặt!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fanpages */}
      <div className="rounded-2xl p-5" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#e7f3ff" }}>
              <Facebook size={14} style={{ color: "#1877f2" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Fanpage đã kết nối</h3>
              <p className="text-xs" style={{ color: "#9ca3af" }}>{pages.length} fanpage</p>
            </div>
          </div>
          <button onClick={() => setShowAddPage(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: "#1877f2" }}>
            <Plus size={13} />
            Thêm Fanpage
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-8">
            <Facebook size={28} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "#9ca3af" }}>Chưa có Fanpage nào được kết nối</p>
            <p className="text-xs mt-1" style={{ color: "#d1d5db" }}>
              Nhấn "Thêm Fanpage" và nhập Page Access Token
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-3 p-3 rounded-xl bg-white"
                style={{ border: "1px solid #e5e7eb" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#1877f2" }}>
                  <Facebook size={18} color="#fff" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{page.pageName}</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>
                    ID: {page.pageId}
                    {page.followerCount ? ` · ${page.followerCount.toLocaleString("vi-VN")} followers` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTogglePage(page)}
                    className="px-2 py-1 rounded-lg text-xs font-medium"
                    style={{
                      background: page.isActive ? "#f0fdf4" : "#f3f4f6",
                      color: page.isActive ? "#16a34a" : "#9ca3af",
                    }}>
                    {page.isActive ? "Đang bật" : "Đã tắt"}
                  </button>
                  <button onClick={() => handleDeletePage(page.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                    style={{ color: "#dc2626" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cài đặt Scheduler */}
      <div className="rounded-2xl p-5" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.12)" }}>
            <Settings size={14} style={{ color: "#C9A84C" }} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Cài đặt Scheduler</h3>
        </div>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw size={16} className="animate-spin" style={{ color: "#9ca3af" }} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white"
              style={{ border: "1px solid #e5e7eb" }}>
              <div>
                <p className="text-sm font-medium text-gray-900">Bật tự động đăng bài</p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>
                  Hệ thống sẽ tự động đăng bài theo lịch đã cài đặt
                </p>
              </div>
              <button onClick={() => setConfig(c => ({ ...c, isEnabled: !c.isEnabled }))}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: config.isEnabled ? "#1877f2" : "#d1d5db" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ left: config.isEnabled ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Số lần thử lại khi lỗi
                </label>
                <input
                  type="number" min={0} max={10}
                  value={config.maxRetries}
                  onChange={e => setConfig(c => ({ ...c, maxRetries: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid #d1d5db", color: "#374151" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                  Thời gian chờ thử lại (phút)
                </label>
                <input
                  type="number" min={5} max={120}
                  value={config.retryDelayMinutes}
                  onChange={e => setConfig(c => ({ ...c, retryDelayMinutes: parseInt(e.target.value) || 30 }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid #d1d5db", color: "#374151" }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl text-xs" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <p className="font-semibold mb-1" style={{ color: "#92400e" }}>Cấu hình Cron Job (Railway):</p>
              <p style={{ color: "#78350f" }}>
                Thêm vào Railway Cron: <code className="bg-amber-100 px-1 rounded">0 * * * *</code> (mỗi giờ)
              </p>
              <p className="mt-1" style={{ color: "#78350f" }}>
                URL: <code className="bg-amber-100 px-1 rounded">/api/crm/facebook-scheduler/cron</code>
              </p>
            </div>

            <button onClick={handleSaveConfig} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: saving ? "#9ca3af" : "#C9A84C" }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Lưu cài đặt
            </button>
          </div>
        )}
      </div>

      {showAddPage && (
        <AddPageModal onClose={() => setShowAddPage(false)} onSave={handleAddPage} />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabType = "posts" | "calendar" | "logs" | "settings";

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "posts",    label: "Bài đăng",   icon: FileText },
  { id: "calendar", label: "Lịch",       icon: Calendar },
  { id: "logs",     label: "Lịch sử",    icon: Activity },
  { id: "settings", label: "Cài đặt",    icon: Settings },
];

export default function FacebookSchedulerClient() {
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [stats, setStats] = useState({ scheduled: 0, published: 0, failed: 0, total: 0 });

  const loadPages = useCallback(async () => {
    const res = await fetch("/api/crm/facebook-scheduler/pages");
    const data = await res.json();
    setPages(Array.isArray(data) ? data : []);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/crm/facebook-scheduler/posts");
    const data: ScheduledPost[] = await res.json().catch(() => []);
    if (Array.isArray(data)) {
      setStats({
        scheduled: data.filter(p => p.status === "scheduled").length,
        published: data.filter(p => p.status === "published").length,
        failed:    data.filter(p => p.status === "failed").length,
        total:     data.length,
      });
    }
  }, []);

  useEffect(() => {
    loadPages();
    loadStats();
  }, [loadPages, loadStats]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "#1877f2" }}>
            <Facebook size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Lịch đăng bài Facebook</h1>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              Tự động hoá đăng bài theo lịch lên Fanpage
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: "Đã lên lịch", value: stats.scheduled, color: "#2563eb", bg: "#eff6ff" },
            { label: "Đã đăng",     value: stats.published, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Thất bại",    value: stats.failed,    color: "#dc2626", bg: "#fef2f2" },
          ].map(s => (
            <div key={s.label} className="px-3 py-2 rounded-xl text-center"
              style={{ background: s.bg, minWidth: 70 }}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: s.color, opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#f3f4f6" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
              style={{
                background: isActive ? "#fff" : "transparent",
                color: isActive ? "#1877f2" : "#6b7280",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "posts"    && <PostsTab pages={pages} />}
        {activeTab === "calendar" && <CalendarTab pages={pages} />}
        {activeTab === "logs"     && <LogsTab />}
        {activeTab === "settings" && <SettingsTab pages={pages} onPagesChange={loadPages} />}
      </div>
    </div>
  );
}
