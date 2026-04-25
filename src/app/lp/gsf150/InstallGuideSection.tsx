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
    }, 3500);
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
              Hướng dẫn lắp đặt
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300,
            lineHeight: 1.1, marginBottom: 10, fontFamily: FONT_HEADING,
            letterSpacing: "-0.02em", color: WHITE,
          }}>
            Lắp Đặt Trong
          </h2>
          <div style={{
            fontSize: "clamp(22px, 3.5vw, 42px)", fontWeight: 700,
            fontFamily: FONT_HEADING, letterSpacing: "-0.01em", marginBottom: 16,
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            4 Bước Đơn Giản
          </div>
          <p style={{
            color: GRAY_LIGHT, fontSize: "clamp(14px, 1.6vw, 16px)",
            lineHeight: 1.75, fontFamily: FONT_BODY, maxWidth: 520, margin: "0 auto",
          }}>
            Không cần thợ. Không cần tháo giường cũ. Chỉ 15–20 phút là xong.
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

        {/* ── Desktop: 4 cards side by side ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "clamp(12px, 2vw, 20px)",
          marginBottom: 40,
        }}
          className="install-grid"
        >
          {DEFAULT_STEPS.map((step, i) => {
            const isActive = i === activeStep;
            return (
              <button
                key={i}
                onClick={() => handleStep(i)}
                style={{
                  background: isActive ? "rgba(201,168,76,0.08)" : BLACK_CARD,
                  border: `1px solid ${isActive ? "rgba(201,168,76,0.5)" : BLACK_BORDER}`,
                  borderRadius: "16px",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left" as const,
                  transition: "all 0.3s ease",
                  overflow: "hidden",
                  transform: isActive ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isActive ? "0 12px 40px rgba(201,168,76,0.12)" : "none",
                }}
              >
                {/* Step number badge */}
                <div style={{
                  padding: "16px 16px 0 16px",
                }}>
                  <div style={{
                    display: "inline-block",
                    background: isActive
                      ? `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`
                      : "rgba(255,255,255,0.12)",
                    color: isActive ? BLACK : WHITE,
                    fontWeight: 800, fontSize: 12,
                    fontFamily: FONT_BODY, letterSpacing: "0.08em",
                    padding: "4px 10px", borderRadius: "100px",
                    transition: "all 0.3s",
                  }}>
                    {step.num}
                  </div>
                </div>
                {/* Text area */}
                <div style={{ padding: "clamp(14px, 2vw, 20px)" }}>
                  <div style={{
                    fontSize: "clamp(13px, 1.4vw, 15px)", fontWeight: 600,
                    fontFamily: FONT_HEADING, color: isActive ? WHITE : GRAY_LIGHT,
                    lineHeight: 1.4, marginBottom: 8,
                    transition: "color 0.3s",
                  }}>
                    <EditableText
                      slug={LP_SLUG}
                      blockKey={step.bkTitle}
                      defaultValue={step.defTitle}
                      editMode={editMode}
                      as="span"
                      savedValue={content[step.bkTitle]}
                      onSaved={onSaved}
                      onDeleted={onDeleted}
                    />
                  </div>
                  <p style={{
                    color: isActive ? GRAY_LIGHT : GRAY,
                    fontSize: "clamp(11px, 1.1vw, 13px)",
                    lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0,
                    transition: "color 0.3s",
                  }}>
                    <EditableText
                      slug={LP_SLUG}
                      blockKey={step.bkDesc}
                      defaultValue={step.defDesc}
                      editMode={editMode}
                      as="span"
                      multiline
                      savedValue={content[step.bkDesc]}
                      onSaved={onSaved}
                      onDeleted={onDeleted}
                    />
                  </p>
                </div>
                {/* Image area 1:1 — below text */}
                {(() => {
                  const imgSrc = imgOverrides[step.bkImg] || content[step.bkImg] || "";
                  if (!imgSrc && !editMode) return null;
                  return (
                    <div style={{
                      position: "relative",
                      width: "100%",
                      paddingBottom: "100%",
                      background: imgSrc ? "#fff" : "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                      borderTop: `1px solid ${BLACK_BORDER}`,
                    }}>
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={step.defTitle}
                          fill
                          style={{ objectFit: "contain", objectPosition: "center", padding: "8px" }}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          loading="lazy"
                        />
                      ) : (
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: GRAY, fontSize: 12, fontFamily: FONT_BODY,
                        }}>
                          Chưa có ảnh
                        </div>
                      )}
                      {editMode && (
                        <>
                          <ImageUploadOverlay blockKey={step.bkImg} onUploaded={handleImgUploaded} />
                          {imgSrc && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`/api/admin/lp-content?slug=${LP_SLUG}&blockKey=${step.bkImg}`, { method: "DELETE" });
                                setImgOverrides(prev => { const n = { ...prev }; delete n[step.bkImg]; return n; });
                                onDeleted?.(step.bkImg);
                              }}
                              style={{
                                position: "absolute", top: 8, right: 8, zIndex: 20,
                                background: "rgba(239,68,68,0.9)", color: "#fff",
                                border: "none", borderRadius: "50%",
                                width: 28, height: 28, cursor: "pointer",
                                fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: 700,
                              }}
                            >×</button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </button>
            );
          })}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 32 }}>
          {DEFAULT_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => handleStep(i)}
              style={{
                width: i === activeStep ? 32 : 10,
                height: 10, borderRadius: 5,
                background: i === activeStep
                  ? `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD})`
                  : "rgba(201,168,76,0.2)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.35s ease",
              }}
            />
          ))}
        </div>

        {/* ── Bottom note ── */}
        <div style={{
          textAlign: "center",
          background: "rgba(201,168,76,0.06)",
          border: `1px solid rgba(201,168,76,0.18)`,
          borderRadius: "12px",
          padding: "clamp(16px, 2.5vw, 24px) clamp(20px, 4vw, 40px)",
          maxWidth: 640, margin: "0 auto",
        }}>
          <p style={{
            color: GRAY_LIGHT, fontSize: "clamp(13px, 1.4vw, 15px)",
            lineHeight: 1.75, fontFamily: FONT_BODY, margin: 0,
          }}>
            <span style={{ color: GOLD, fontWeight: 600 }}>✓ Không cần thợ lắp đặt</span>
            {"  ·  "}
            <span style={{ color: GOLD, fontWeight: 600 }}>✓ Không cần tháo giường cũ</span>
            {"  ·  "}
            <span style={{ color: GOLD, fontWeight: 600 }}>✓ Tương thích mọi loại nệm</span>
          </p>
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
