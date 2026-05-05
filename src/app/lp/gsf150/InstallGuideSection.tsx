"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { EditableText } from "@/components/lp/EditableText";

// ─── Design tokens (match LpGsf150Client) ────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#D4C4A0";
const BLACK = "#0A0A08";
const BLACK_SOFT = "#111109";
const BLACK_CARD = "#16140E";
const BLACK_BORDER = "rgba(201,168,76,0.12)";
const WHITE = "#F5F0E8";
const GRAY = "#7A7468";
const GRAY_LIGHT = "#A8A090";
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const LP_SLUG = "gsf150";

const DEFAULT_STEPS = [
  {
    num: "01",
    bkTitle: "install_step_1_title",
    defTitle: "Tháo nệm ra khỏi giường",
    bkDesc: "install_step_1_desc",
    defDesc: "Nhấc nệm ra khỏi giường hiện tại và đặt sang một bên. Không cần tháo khung giường gỗ.",
    bkImg: "install_step_1_img",
    defImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step2-T6wUQcUsbLZCsssfygA2WH.webp",
  },
  {
    num: "02",
    bkTitle: "install_step_2_title",
    defTitle: "Cắm điện & kiểm tra hoạt động",
    bkDesc: "install_step_2_desc",
    defDesc: "Đặt khung GSF150 ra ngoài, cắm điện 220V và nhấn remote kiểm tra motor nâng đầu/chân hoạt động bình thường.",
    bkImg: "install_step_2_img",
    defImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step2-T6wUQcUsbLZCsssfygA2WH.webp",
  },
  {
    num: "03",
    bkTitle: "install_step_3_title",
    defTitle: "Đặt khung vào lòng giường",
    bkDesc: "install_step_3_desc",
    defDesc: "Trả khung về vị trí phẳng, trượt vào lòng giường gỗ hiện có. Khung tự khớp — không cần vít hay dụng cụ.",
    bkImg: "install_step_3_img",
    defImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step2-T6wUQcUsbLZCsssfygA2WH.webp",
  },
  {
    num: "04",
    bkTitle: "install_step_4_title",
    defTitle: "Đặt nệm lại & tận hưởng",
    bkDesc: "install_step_4_desc",
    defDesc: "Đặt nệm lên khung GSF150. Dùng remote điều chỉnh tư thế đầu giường 0–70° và chân giường 0–45° theo ý muốn.",
    bkImg: "install_step_4_img",
    defImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step2-T6wUQcUsbLZCsssfygA2WH.webp",
  },
];

// ─── YouTube helper ───────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))?([\w-]{11})/);
  return m ? m[1] : null;
}

function YoutubeAutoplay({ videoId, title }: { videoId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);
  const src = started
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1`;
  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000" }}>
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}

// ─── Image upload overlay ─────────────────────────────────────────────────────
function ImageUploadOverlay({ blockKey, onUploaded }: {
  blockKey: string;
  onUploaded: (bk: string, url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Upload thất bại"); }
      const { url } = await res.json();
      await fetch("/api/admin/lp-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: LP_SLUG, blockKey, content: url }),
      });
      onUploaded(blockKey, url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      <button
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        disabled={uploading}
        style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, background: "rgba(13,11,0,0.85)", color: GOLD,
          border: `1px solid ${GOLD}`, borderRadius: 999,
          fontSize: 11, fontWeight: 700, padding: "6px 16px",
          cursor: uploading ? "not-allowed" : "pointer",
          fontFamily: FONT_BODY, whiteSpace: "nowrap" as const,
          backdropFilter: "blur(8px)",
          opacity: uploading ? 0.7 : 1,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {uploading ? (
          <><span style={{ display: "inline-block", width: 10, height: 10, border: `2px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Đang tải...</>
        ) : (
          <>📷 Thay ảnh</>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface InstallGuideSectionProps {
  editMode?: boolean;
  content?: Record<string, string>;
  onSaved?: (blockKey: string, newValue: string) => void;
  onDeleted?: (blockKey: string) => void;
}

export function InstallGuideSection({
  editMode = false,
  content = {},
  onSaved,
  onDeleted,
}: InstallGuideSectionProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  // Local image overrides (from upload)
  const [imgOverrides, setImgOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !autoPlay) return;
    timerRef.current = setInterval(() => {
      setActiveStep(prev => (prev + 1) % DEFAULT_STEPS.length);
    }, 8000); // Increased from 3500ms to reduce re-render frequency
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isVisible, autoPlay]);

  const handleStep = (i: number) => {
    setActiveStep(i);
    setAutoPlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleImgUploaded = (bk: string, url: string) => {
    setImgOverrides(prev => ({ ...prev, [bk]: url }));
    onSaved?.(bk, url);
  };

  // YouTube URL from content or default placeholder
  const youtubeUrl = content["install_youtube_url"] || "";
  const youtubeId = extractYoutubeId(youtubeUrl);

  return (
    <section
      ref={sectionRef}
      style={{
        background: `linear-gradient(180deg, ${BLACK} 0%, ${BLACK_SOFT} 100%)`,
        padding: "clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)",
      }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        {/* ── Header ── */}
        <div style={{ textAlign: "center", marginBottom: "clamp(40px, 6vw, 64px)" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`,
            borderRadius: "100px", padding: "7px 18px", marginBottom: 20,
          }}>
            <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>
              <EditableText slug={LP_SLUG} blockKey="install_label" defaultValue="Hướng dẫn lắp đặt" editMode={editMode} as="span" savedValue={content["install_label"]} onSaved={onSaved} onDeleted={onDeleted} />
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300,
            lineHeight: 1.1, marginBottom: 10, fontFamily: FONT_HEADING,
            letterSpacing: "-0.02em", color: WHITE,
          }}>
            <EditableText slug={LP_SLUG} blockKey="install_title_1" defaultValue="Lắp Đặt Trong" editMode={editMode} as="span" savedValue={content["install_title_1"]} onSaved={onSaved} onDeleted={onDeleted} />
          </h2>
          <div style={{
            fontSize: "clamp(22px, 3.5vw, 42px)", fontWeight: 700,
            fontFamily: FONT_HEADING, letterSpacing: "-0.01em", marginBottom: 16,
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            <EditableText slug={LP_SLUG} blockKey="install_title_2" defaultValue="4 Bước Đơn Giản" editMode={editMode} as="span" savedValue={content["install_title_2"]} onSaved={onSaved} onDeleted={onDeleted} />
          </div>
          <p style={{
            color: GRAY_LIGHT, fontSize: "clamp(14px, 1.6vw, 16px)",
            lineHeight: 1.75, fontFamily: FONT_BODY, maxWidth: 520, margin: "0 auto",
          }}>
            <EditableText slug={LP_SLUG} blockKey="install_subtitle" defaultValue="Không cần thợ. Không cần tháo giường cũ. Chỉ 15–20 phút là xong." editMode={editMode} as="span" multiline savedValue={content["install_subtitle"]} onSaved={onSaved} onDeleted={onDeleted} />
          </p>
        </div>

        {/* ── YouTube Video Embed ── */}
        <div style={{
          marginBottom: "clamp(40px, 5vw, 56px)",
          borderRadius: "16px",
          overflow: "hidden",
          border: `1px solid rgba(201,168,76,0.2)`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          position: "relative",
          background: "#000",
        }}>
          {youtubeId ? (
            <YoutubeAutoplay videoId={youtubeId} title="Hướng dẫn lắp đặt SmartFurni GSF150" />
          ) : (
            <div style={{
              width: "100%", paddingBottom: "56.25%", background: "#111",
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <div style={{ color: GOLD, fontSize: 40 }}>▶</div>
                <p style={{ color: GRAY_LIGHT, fontSize: 14, fontFamily: FONT_BODY, margin: 0 }}>
                  {editMode ? "Nhấn vào URL bên dưới để thêm link YouTube" : "Video sắp ra mắt"}
                </p>
              </div>
            </div>
          )}
          {/* Gold border accent */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            pointerEvents: "none",
          }} />
        </div>

        {/* ── Editable YouTube URL (edit mode only) ── */}
        {editMode && (
          <div style={{
            marginBottom: "clamp(32px, 4vw, 48px)",
            background: "rgba(201,168,76,0.06)",
            border: `1px solid rgba(201,168,76,0.25)`,
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ color: GOLD, fontSize: 18, flexShrink: 0, marginTop: 2 }}>🎬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 6 }}>
                Link YouTube — Hướng dẫn lắp đặt
              </div>
              <EditableText
                slug={LP_SLUG}
                blockKey="install_youtube_url"
                defaultValue="https://www.youtube.com/watch?v=PASTE_VIDEO_ID_HERE"
                editMode={editMode}
                as="span"
                style={{ fontSize: 13, color: GRAY_LIGHT, wordBreak: "break-all" as const, fontFamily: FONT_BODY }}
                savedValue={content["install_youtube_url"]}
                onSaved={onSaved}
                onDeleted={onDeleted}
              />
            </div>
          </div>
        )}

        {/* ── Bottom note ── */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "clamp(8px, 1.5vw, 14px)",
          marginTop: "clamp(28px, 3.5vw, 40px)",
          flexWrap: "wrap",
        }}>
          {([
            {
              bk: "install_badge_1", def: "Không cần thợ lắp đặt",
              svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="#C9A84C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>)
            },
            {
              bk: "install_badge_2", def: "Không cần tháo giường cũ",
              svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="12" rx="3" stroke="#C9A84C" strokeWidth="1.4"/><path d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2" stroke="#C9A84C" strokeWidth="1.4"/><path d="M2 14h20" stroke="#C9A84C" strokeWidth="1.4" strokeDasharray="3 2"/></svg>)
            },
            {
              bk: "install_badge_3", def: "Tương thích mọi loại nệm",
              svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>)
            },
          ] as const).map((item, i) => (
            <div key={i} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: "rgba(201,168,76,0.07)",
              border: `1px solid rgba(201,168,76,0.22)`,
              borderRadius: "100px",
              padding: "9px 20px",
            }}>
              <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{item.svg}</span>
              <span style={{
                color: GOLD,
                fontSize: "clamp(11px, 1.1vw, 13px)",
                fontWeight: 600,
                fontFamily: FONT_HEADING,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}>
                <EditableText
                  slug={LP_SLUG}
                  blockKey={item.bk}
                  defaultValue={item.def}
                  editMode={editMode}
                  as="span"
                  savedValue={content[item.bk]}
                  onSaved={onSaved}
                  onDeleted={onDeleted}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 640px) {
          .install-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
