"use client";
import { useState, useEffect, useCallback } from "react";
import { Sparkles, ChevronDown, Loader2, Copy, Check, Wand2, Film } from "lucide-react";

interface ContentVideo {
  id: string;
  title: string;
  platform: string;
  status: string;
  script?: string;
  hashtags: string[];
}

interface ScriptToPostBannerProps {
  platform: "facebook" | "tiktok";
  onCaptionGenerated?: (caption: string) => void;
}

export default function ScriptToPostBanner({ platform, onCaptionGenerated }: ScriptToPostBannerProps) {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentVideo | null>(null);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [tone, setTone] = useState("professional");

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/crm/content/videos?platform=${platform}`);
      const data = await res.json();
      // Also fetch "all" platform videos
      const res2 = await fetch(`/api/crm/content/videos?platform=all`);
      const data2 = await res2.json();
      const combined = [...(Array.isArray(data) ? data : []), ...(Array.isArray(data2) ? data2 : [])];
      // Filter to only scripted/editing/published videos (have script)
      const withScript = combined.filter(v => v.script && v.script.trim().length > 0);
      setVideos(withScript);
    } catch {
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }, [platform]);

  useEffect(() => {
    if (expanded) fetchVideos();
  }, [expanded, fetchVideos]);

  const handleGenerate = async () => {
    if (!selectedVideo) return;
    setGeneratingCaption(true);
    setError("");
    setGeneratedCaption("");
    try {
      const res = await fetch("/api/crm/content/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          title: selectedVideo.title,
          script: selectedVideo.script || "",
          hashtags: selectedVideo.hashtags || [],
          tone,
        }),
      });
      const data = await res.json();
      if (data.success && data.caption) {
        setGeneratedCaption(data.caption);
        onCaptionGenerated?.(data.caption);
      } else {
        setError(data.error || "Lỗi tạo caption");
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platformColor = platform === "facebook" ? "#1877f2" : "#000";
  const platformBg = platform === "facebook" ? "rgba(24,119,242,0.08)" : "rgba(0,0,0,0.08)";
  const platformLabel = platform === "facebook" ? "Facebook" : "TikTok";

  const TONE_OPTIONS = [
    { value: "professional", label: "Chuyên nghiệp" },
    { value: "casual", label: "Thân thiện" },
    { value: "emotional", label: "Cảm xúc" },
    { value: "educational", label: "Giáo dục" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden mb-5"
      style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.04)" }}>
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-all"
        style={{ background: "rgba(245,158,11,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Wand2 size={15} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: "#f5edd6" }}>
              Tạo caption từ kịch bản AI
            </p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              Chọn kịch bản từ Kế hoạch Content → AI tạo caption {platformLabel} tự động
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          style={{ color: "#f59e0b", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-3 space-y-4">
          {/* Select script */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#9ca3af" }}>
              Chọn kịch bản
            </label>
            {loadingVideos ? (
              <div className="flex items-center gap-2 py-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm">Đang tải kịch bản...</span>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex items-center gap-2 py-2 px-3 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                <Film size={14} />
                Chưa có kịch bản nào. Hãy tạo kịch bản trong tab &quot;AI Script Generator&quot; trước.
              </div>
            ) : (
              <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                {videos.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVideo(v.id === selectedVideo?.id ? null : v)}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: selectedVideo?.id === v.id
                        ? `${platformBg}`
                        : "rgba(255,255,255,0.04)",
                      border: selectedVideo?.id === v.id
                        ? `1px solid ${platformColor}40`
                        : "1px solid rgba(255,255,255,0.08)",
                    }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: selectedVideo?.id === v.id ? platformColor : "rgba(255,255,255,0.1)" }}>
                      <Film size={11} style={{ color: selectedVideo?.id === v.id ? "#fff" : "#9ca3af" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#f5edd6" }}>{v.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                        {v.platform} · {v.script ? `${v.script.slice(0, 60)}...` : "Chưa có kịch bản"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tone selector */}
          {selectedVideo && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#9ca3af" }}>
                Giọng điệu
              </label>
              <div className="flex gap-2 flex-wrap">
                {TONE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: tone === t.value ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.06)",
                      color: tone === t.value ? "#fff" : "#9ca3af",
                      border: tone === t.value ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          {selectedVideo && (
            <button
              onClick={handleGenerate}
              disabled={generatingCaption}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
              }}>
              {generatingCaption ? (
                <><Loader2 size={15} className="animate-spin" /> Đang tạo caption...</>
              ) : (
                <><Sparkles size={15} /> Tạo caption {platformLabel} bằng AI</>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
              {error}
            </div>
          )}

          {/* Generated caption */}
          {generatedCaption && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="flex items-center justify-between px-3 py-2"
                style={{ background: "rgba(245,158,11,0.08)" }}>
                <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
                  Caption đã tạo — sao chép và dán vào ô nội dung bên dưới
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: copied ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: copied ? "#4ade80" : "#f59e0b" }}>
                  {copied ? <><Check size={12} /> Đã sao chép</> : <><Copy size={12} /> Sao chép</>}
                </button>
              </div>
              <div className="px-4 py-3">
                <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: "#e2d9c5", lineHeight: 1.6 }}>
                  {generatedCaption}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
