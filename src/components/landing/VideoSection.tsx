"use client";
import { useState, useEffect, useRef } from "react";
import type { SiteTheme } from "@/lib/theme-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// ─── YouTube embed with intersection observer autoplay ────────────────────────
function YoutubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const src = active
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1`;

  return (
    <div ref={ref} style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}

// ─── Static video data (copy độc lập, không phụ thuộc landing page) ──────────
const VIDEO_ID = ""; // Để trống — admin điền qua CMS hoặc hardcode YouTube ID tại đây
const VIDEO_TITLE = "Giường Điều Khiển Thông Minh SmartFurni — Xem Thực Tế";
const VIDEO_LABEL = "Xem sản phẩm hoạt động thực tế";

interface VideoSectionProps {
  theme: SiteTheme;
  videoId?: string; // Override từ ngoài nếu cần
  videoTitle?: string;
}

export default function VideoSection({ theme, videoId, videoTitle }: VideoSectionProps) {
  const { colors, layout } = theme;
  const primary = colors.primary;
  const secondary = colors.secondary ?? primary;
  const bgColor = colors.background;
  const textColor = colors.text ?? "#F5EDD6";
  const borderColor = colors.border ?? "#2D2500";
  const maxWidth = layout.maxWidth ?? 1280;

  const resolvedVideoId = videoId || VIDEO_ID;
  const resolvedTitle = videoTitle || VIDEO_TITLE;

  if (!resolvedVideoId) {
    // Nếu chưa có video ID, không render section
    return null;
  }

  return (
    <section
      style={{ background: bgColor, padding: "80px 0" }}
    >
      <div style={{ maxWidth, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `${primary}15`,
              border: `1px solid ${primary}40`,
              borderRadius: 999,
              padding: "6px 16px",
              marginBottom: 20,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: primary, display: "inline-block" }} />
            <span style={{ color: primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {VIDEO_LABEL}
            </span>
          </div>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 44px)",
              fontWeight: 300,
              lineHeight: 1.15,
              color: textColor,
              marginBottom: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {resolvedTitle}
          </h2>
        </div>

        {/* Video container */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            border: `1px solid ${borderColor}`,
            boxShadow: `0 0 60px ${primary}12`,
          }}
        >
          <YoutubeEmbed videoId={resolvedVideoId} title={resolvedTitle} />
          {/* Gold accent lines */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${primary}, transparent)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${primary}, transparent)`, pointerEvents: "none" }} />
        </div>
      </div>
    </section>
  );
}
