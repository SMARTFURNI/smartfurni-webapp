"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { SiteTheme, ThemeVideoItem } from "@/lib/theme-types";
import { ScrollReveal } from "./ScrollReveal";

// ─── YouTube embed with lazy load ─────────────────────────────────────────────
function YoutubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setLoaded(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const src = loaded
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1`;

  return (
    <div
      ref={ref}
      style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 16, background: "#0D0B00" }}
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 16 }}
      />
    </div>
  );
}

// ─── Arrow Button ─────────────────────────────────────────────────────────────
function ArrowBtn({
  direction,
  onClick,
  disabled,
  primary,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
  primary: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Video trước" : "Video tiếp theo"}
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: `2px solid ${disabled ? "#2D2500" : primary}`,
        background: disabled ? "transparent" : `${primary}18`,
        color: disabled ? "#4A4000" : primary,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {direction === "left" ? "←" : "→"}
    </button>
  );
}

// ─── Dot indicators ───────────────────────────────────────────────────────────
function Dots({ total, current, primary, onDotClick }: { total: number; current: number; primary: string; onDotClick: (i: number) => void }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          aria-label={`Video ${i + 1}`}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 999,
            background: i === current ? primary : "#2D2500",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "all 0.3s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main VideoSection ────────────────────────────────────────────────────────
interface VideoSectionProps {
  theme: SiteTheme;
  /** Legacy single-video override (kept for backward compat) */
  videoId?: string;
  videoTitle?: string;
}

export default function VideoSection({ theme, videoId, videoTitle }: VideoSectionProps) {
  const { colors, layout, videoSection } = theme;
  const primary = colors.primary;
  const bgColor = colors.background;
  const textColor = colors.text ?? "#F5EDD6";
  const borderColor = colors.border ?? "#2D2500";
  const maxWidth = layout.maxWidth ?? 1280;

  // Build video list: prefer theme.videoSection.videos, fallback to legacy props
  const videos: ThemeVideoItem[] = (() => {
    if (videoSection?.videos && videoSection.videos.length > 0) return videoSection.videos;
    if (videoId) return [{ id: "legacy", youtubeId: videoId, title: videoTitle ?? "SmartFurni Video", label: "" }];
    return [];
  })();

  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent((c) => Math.min(videos.length - 1, c + 1)), [videos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // Reset to first when video list changes
  useEffect(() => { setCurrent(0); }, [videos.length]);

  if (videoSection && !videoSection.enabled) return null;
  if (videos.length === 0) return null;

  const sectionLabel = videoSection?.sectionLabel ?? "Xem sản phẩm hoạt động thực tế";
  const sectionTitle = videoSection?.sectionTitle ?? (videoTitle ?? "SmartFurni — Xem Thực Tế");
  const activeVideo = videos[current];

  return (
    <section style={{ background: bgColor, padding: "80px 0" }}>
      <div style={{ maxWidth, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <ScrollReveal variant="fadeUp" delay={0}>
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
            <span style={{ color: primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
              {sectionLabel}
            </span>
          </div>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 44px)",
              fontWeight: 300,
              color: textColor,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {sectionTitle}
          </h2>
        </div>
        </ScrollReveal>

        {/* Carousel */}
        <ScrollReveal variant="fadeUp" delay={150}>
        <div>
          {/* Arrow + video row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Left arrow */}
            <ArrowBtn direction="left" onClick={prev} disabled={current === 0} primary={primary} />

            {/* Video embed */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: `0 0 60px ${primary}12`,
                }}
              >
                <YoutubeEmbed
                  key={activeVideo.id}
                  videoId={activeVideo.youtubeId}
                  title={activeVideo.title}
                />
              </div>

              {/* Video title + label */}
              {(activeVideo.title || activeVideo.label) && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  {activeVideo.label && (
                    <span
                      style={{
                        display: "inline-block",
                        background: `${primary}20`,
                        color: primary,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        padding: "3px 12px",
                        borderRadius: 999,
                        marginBottom: 6,
                      }}
                    >
                      {activeVideo.label}
                    </span>
                  )}
                  {activeVideo.title && (
                    <p style={{ color: textColor, fontSize: 16, fontWeight: 500, margin: 0 }}>
                      {activeVideo.title}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right arrow */}
            <ArrowBtn direction="right" onClick={next} disabled={current === videos.length - 1} primary={primary} />
          </div>

          {/* Counter */}
          {videos.length > 1 && (
            <div style={{ textAlign: "center", marginTop: 12, color: colors.textMuted ?? "#9CA3AF", fontSize: 13 }}>
              {current + 1} / {videos.length}
            </div>
          )}

          {/* Dots */}
          <Dots total={videos.length} current={current} primary={primary} onDotClick={setCurrent} />
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
