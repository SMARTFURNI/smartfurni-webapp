"use client";

/**
 * FlipBook.tsx — SmartFurni B2B Catalogue Viewer
 * Luxury dark theme · 3D flip animation · Keyboard + touch support
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { CataloguePage } from "@/lib/catalogue-store";

interface FlipBookProps {
  pages: CataloguePage[];
  title: string;
  onClose?: () => void;
  className?: string;
}

export default function FlipBook({ pages, title, onClose, className = "" }: FlipBookProps) {
  const [currentSpread, setCurrentSpread] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"next" | "prev">("next");
  const [showThumbs, setShowThumbs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSpreads = Math.ceil((pages.length - 1) / 2) + 1;
  const maxSpread = totalSpreads - 1;

  function getPagesForSpread(spread: number): { left: CataloguePage | null; right: CataloguePage | null } {
    if (spread === 0) return { left: null, right: pages[0] || null };
    const leftIdx = spread * 2 - 1;
    const rightIdx = spread * 2;
    return { left: pages[leftIdx] || null, right: pages[rightIdx] || null };
  }

  const goNext = useCallback(() => {
    if (flipping || currentSpread >= maxSpread) return;
    setFlipDir("next");
    setFlipping(true);
    setTimeout(() => { setCurrentSpread(s => s + 1); setFlipping(false); }, 650);
  }, [flipping, currentSpread, maxSpread]);

  const goPrev = useCallback(() => {
    if (flipping || currentSpread <= 0) return;
    setFlipDir("prev");
    setFlipping(true);
    setTimeout(() => { setCurrentSpread(s => s - 1); setFlipping(false); }, 650);
  }, [flipping, currentSpread]);

  const goToSpread = useCallback((spread: number) => {
    if (flipping || spread === currentSpread) return;
    setFlipDir(spread > currentSpread ? "next" : "prev");
    setFlipping(true);
    setTimeout(() => { setCurrentSpread(spread); setFlipping(false); setShowThumbs(false); }, 650);
  }, [flipping, currentSpread]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") { if (showThumbs) setShowThumbs(false); else onClose?.(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose, showThumbs]);

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0) goNext(); else goPrev(); }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { left, right } = getPagesForSpread(currentSpread);
  const { left: nextLeft } = currentSpread < maxSpread ? getPagesForSpread(currentSpread + 1) : { left: null };
  const { right: prevRight } = currentSpread > 0 ? getPagesForSpread(currentSpread - 1) : { right: null };
  const isFirstSpread = currentSpread === 0;
  const isLastSpread = currentSpread === maxSpread;

  const pageLabel = currentSpread === 0
    ? "Bìa trước"
    : currentSpread === maxSpread
    ? "Bìa sau"
    : `Trang ${currentSpread * 2}–${Math.min(currentSpread * 2 + 1, pages.length - 1)}`;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none overflow-hidden ${className}`}
      style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #111008 50%, #0a0a0a 100%)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes flipNext {
          0%   { transform: perspective(2000px) rotateY(0deg); opacity: 1; }
          45%  { transform: perspective(2000px) rotateY(-90deg); opacity: 0.6; }
          100% { transform: perspective(2000px) rotateY(-180deg); opacity: 0; }
        }
        @keyframes flipPrev {
          0%   { transform: perspective(2000px) rotateY(0deg); opacity: 1; }
          45%  { transform: perspective(2000px) rotateY(90deg); opacity: 0.6; }
          100% { transform: perspective(2000px) rotateY(180deg); opacity: 0; }
        }
        .flip-next { animation: flipNext 0.65s cubic-bezier(0.4,0,0.2,1) forwards; }
        .flip-prev { animation: flipPrev 0.65s cubic-bezier(0.4,0,0.2,1) forwards; }
        .page-texture {
          background-image: url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23ffffff' fill-opacity='0.015'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* ── Top Bar ── */}
      <div className="w-full flex items-center justify-between px-5 py-3 z-20 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.12)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              title="Đóng">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          )}
          {/* Logo mark */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="18" height="18" rx="2" stroke="#C9A84C" strokeWidth="1"/>
                <path d="M5 10h10M10 5v10" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "#C9A84C", letterSpacing: "0.12em" }}>SmartFurni</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-xs text-white/50 truncate max-w-[180px] font-light">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.2)" }}>
            {pageLabel}
          </span>
          <button onClick={() => setShowThumbs(v => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: showThumbs ? "rgba(201,168,76,0.15)" : "transparent",
              border: `1px solid ${showThumbs ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: showThumbs ? "#C9A84C" : "rgba(255,255,255,0.4)"
            }}
            title="Xem tất cả trang">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
              <rect x="0.5" y="0.5" width="5" height="5" rx="0.5"/>
              <rect x="7.5" y="0.5" width="5" height="5" rx="0.5"/>
              <rect x="0.5" y="7.5" width="5" height="5" rx="0.5"/>
              <rect x="7.5" y="7.5" width="5" height="5" rx="0.5"/>
            </svg>
          </button>
          <button onClick={toggleFullscreen}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
            {isFullscreen ? (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 1H1v4M8 1h4v4M5 12H1V8M8 12h4V8"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 5V1h4M12 5V1H8M1 8v4h4M12 8v4H8"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Thumbnail Panel ── */}
      {showThumbs && (
        <div className="absolute top-[52px] right-0 w-60 bottom-0 z-30 overflow-y-auto"
          style={{ background: "rgba(8,8,8,0.97)", borderLeft: "1px solid rgba(201,168,76,0.1)", backdropFilter: "blur(20px)" }}>
          <div className="p-4">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-4"
              style={{ color: "rgba(201,168,76,0.6)" }}>Tất cả trang</p>
            <div className="space-y-1.5">
              {pages.map((page, idx) => {
                const spread = idx === 0 ? 0 : Math.ceil(idx / 2);
                const isActive = spread === currentSpread;
                return (
                  <button key={page.id} onClick={() => goToSpread(spread)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all"
                    style={{
                      background: isActive ? "rgba(201,168,76,0.1)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(201,168,76,0.25)" : "transparent"}`,
                    }}>
                    <div className="w-9 h-12 rounded flex-shrink-0 overflow-hidden relative"
                      style={{ background: page.bgColor || "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {page.imageUrl && (
                        <img src={page.imageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-0.5 right-0.5 text-[7px] font-bold"
                        style={{ color: "rgba(255,255,255,0.3)" }}>{idx + 1}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate leading-tight"
                        style={{ color: isActive ? "#C9A84C" : "rgba(255,255,255,0.7)" }}>
                        {page.title || `Trang ${idx + 1}`}
                      </p>
                      {page.subtitle && (
                        <p className="text-[9px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {page.subtitle}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#C9A84C" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Book Stage ── */}
      <div className="flex-1 flex items-center justify-center w-full px-2 py-5 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)" }} />

        <div className="relative flex items-center gap-3">
          {/* Prev Button */}
          <button onClick={goPrev} disabled={isFirstSpread || flipping}
            className="z-10 flex-shrink-0 transition-all duration-200"
            style={{ opacity: isFirstSpread || flipping ? 0.2 : 1, cursor: isFirstSpread || flipping ? "not-allowed" : "pointer" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 3L5 8l5 5"/>
              </svg>
            </div>
          </button>

          {/* Book */}
          <div className="relative" style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.8))" }}>
            {/* Ambient book glow */}
            <div className="absolute -inset-4 rounded-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />

            <div className="relative flex"
              style={{ width: "min(720px, 88vw)", height: "min(510px, 62vw)" }}>

              {/* Left Page */}
              <div className={`relative flex-1 overflow-hidden page-texture transition-opacity duration-300 ${isFirstSpread ? "opacity-0" : "opacity-100"}`}
                style={{
                  borderRadius: "3px 0 0 3px",
                  background: left?.bgColor || "#141414",
                  boxShadow: "inset -3px 0 12px rgba(0,0,0,0.5), -2px 0 30px rgba(0,0,0,0.4)",
                }}>
                <PageContent page={left} side="left" />
                <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none"
                  style={{ background: "linear-gradient(to left, rgba(0,0,0,0.35) 0%, transparent 100%)" }} />
                {/* Click zone */}
                {!isFirstSpread && (
                  <div className="absolute inset-0 cursor-pointer z-10 group" onClick={goPrev}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(201,168,76,0.3)" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M8 2L4 6l4 4"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Spine */}
              <div className="w-[4px] flex-shrink-0 z-10 relative"
                style={{ background: "linear-gradient(to right, #000 0%, #2a2010 30%, #1a1508 60%, #000 100%)", boxShadow: "0 0 12px rgba(0,0,0,1)" }}>
                {/* Gold spine accent */}
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
                  style={{ background: "linear-gradient(to bottom, transparent 5%, rgba(201,168,76,0.3) 20%, rgba(201,168,76,0.5) 50%, rgba(201,168,76,0.3) 80%, transparent 95%)" }} />
              </div>

              {/* Right Page */}
              <div className={`relative flex-1 overflow-hidden page-texture transition-opacity duration-300 ${isLastSpread && !right ? "opacity-0" : "opacity-100"}`}
                style={{
                  borderRadius: "0 3px 3px 0",
                  background: right?.bgColor || "#141414",
                  boxShadow: "inset 3px 0 12px rgba(0,0,0,0.5), 2px 0 30px rgba(0,0,0,0.4)",
                }}>
                <PageContent page={right} side="right" />
                <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none"
                  style={{ background: "linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 100%)" }} />
                {/* Page curl */}
                {!isLastSpread && (
                  <div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none"
                    style={{ background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.4) 50%)" }} />
                )}
                {/* Click zone */}
                {!isLastSpread && (
                  <div className="absolute inset-0 cursor-pointer z-10 group" onClick={goNext}>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(201,168,76,0.3)" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M4 2l4 4-4 4"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Flip animation overlay */}
              {flipping && (
                <div className={`absolute ${flipDir === "next" ? "right-0 w-1/2" : "left-0 w-1/2"} h-full z-20 pointer-events-none ${flipDir === "next" ? "flip-next" : "flip-prev"}`}
                  style={{
                    background: flipDir === "next" ? (nextLeft?.bgColor || "#141414") : (prevRight?.bgColor || "#141414"),
                    transformOrigin: flipDir === "next" ? "left center" : "right center",
                    backfaceVisibility: "hidden",
                    boxShadow: flipDir === "next" ? "-8px 0 20px rgba(0,0,0,0.6)" : "8px 0 20px rgba(0,0,0,0.6)",
                  }} />
              )}
            </div>

            {/* Book bottom shadow */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ width: "70%", height: "20px", background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)", filter: "blur(8px)" }} />
          </div>

          {/* Next Button */}
          <button onClick={goNext} disabled={isLastSpread || flipping}
            className="z-10 flex-shrink-0 transition-all duration-200"
            style={{ opacity: isLastSpread || flipping ? 0.2 : 1, cursor: isLastSpread || flipping ? "not-allowed" : "pointer" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 3l5 5-5 5"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="flex flex-col items-center gap-2 pb-4 flex-shrink-0">
        {/* Page dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSpreads }).map((_, i) => (
            <button key={i} onClick={() => goToSpread(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentSpread ? "20px" : "6px",
                height: "6px",
                background: i === currentSpread ? "#C9A84C" : "rgba(255,255,255,0.15)",
              }} />
          ))}
        </div>
        {/* Hint */}
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
          <span>← → lật trang</span>
          <span style={{ color: "rgba(201,168,76,0.3)" }}>·</span>
          <span>Vuốt trên mobile</span>
          <span style={{ color: "rgba(201,168,76,0.3)" }}>·</span>
          <span>Click vào trang để lật</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page Content Renderer ─────────────────────────────────────────────────────

function PageContent({ page, side }: { page: CataloguePage | null; side: "left" | "right" }) {
  if (!page) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#0d0d0d" }}>
        <div style={{ opacity: 0.06 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="4" width="32" height="32" rx="2" stroke="white" strokeWidth="1"/>
            <path d="M12 20h16M20 12v16" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  const isCover = page.type === "cover";
  const isBackCover = page.type === "back-cover";

  return (
    <div className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: page.bgColor || "#141414", color: page.textColor || "#fff" }}>
      {/* Background image */}
      {page.imageUrl && (
        <div className="absolute inset-0">
          <img src={page.imageUrl} alt={page.title || ""} className="w-full h-full object-cover" />
          {(page.title || page.content) && (
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)" }} />
          )}
        </div>
      )}

      {/* Badge */}
      {page.badge && (
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest"
            style={{ background: "#C9A84C", color: "#000", letterSpacing: "0.1em" }}>
            {page.badge}
          </span>
        </div>
      )}

      {isCover ? (
        <CoverContent page={page} />
      ) : isBackCover ? (
        <BackCoverContent page={page} />
      ) : (
        <ContentPage page={page} side={side} />
      )}

      {/* Page number */}
      <div className={`absolute bottom-2 ${side === "left" ? "left-3" : "right-3"} text-[9px] font-light tracking-wider`}
        style={{ color: page.textColor ? `${page.textColor}40` : "rgba(255,255,255,0.25)" }}>
        {page.pageNumber}
      </div>
    </div>
  );
}

function CoverContent({ page }: { page: CataloguePage }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Top accent line */}
      <div className="flex-shrink-0 h-px mx-6 mt-6" style={{ background: "linear-gradient(to right, transparent, rgba(201,168,76,0.6), transparent)" }} />

      {/* Center logo area */}
      <div className="flex-1 flex items-center justify-center px-6">
        {!page.imageUrl && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full"
              style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.05)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="2" width="24" height="24" rx="3" stroke="#C9A84C" strokeWidth="1"/>
                <path d="M8 14h12M14 8v12" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Bottom content */}
      <div className="flex-shrink-0 px-6 pb-8 z-10">
        {/* Gold divider */}
        <div className="w-8 h-px mb-4" style={{ background: "#C9A84C" }} />
        {page.title && (
          <h1 className="font-black uppercase leading-tight mb-2"
            style={{
              fontSize: "clamp(14px, 2.2vw, 22px)",
              color: page.textColor || "#fff",
              letterSpacing: "0.06em",
              textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            }}>
            {page.title}
          </h1>
        )}
        {page.subtitle && (
          <p className="font-light tracking-widest uppercase"
            style={{ fontSize: "clamp(8px, 1vw, 11px)", color: "#C9A84C", letterSpacing: "0.2em", opacity: 0.9 }}>
            {page.subtitle}
          </p>
        )}
        {page.content && (
          <p className="mt-3 font-light leading-relaxed"
            style={{ fontSize: "clamp(8px, 1vw, 10px)", color: page.textColor || "rgba(255,255,255,0.5)", maxWidth: "200px" }}>
            {page.content}
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="flex-shrink-0 h-px mx-6 mb-4" style={{ background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)" }} />
    </div>
  );
}

function BackCoverContent({ page }: { page: CataloguePage }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      {/* Decorative frame */}
      <div className="absolute inset-6 pointer-events-none"
        style={{ border: "1px solid rgba(201,168,76,0.12)", borderRadius: "2px" }} />
      <div className="absolute inset-8 pointer-events-none"
        style={{ border: "1px solid rgba(201,168,76,0.06)", borderRadius: "1px" }} />

      <div className="text-center z-10">
        {/* Logo */}
        <div className="w-10 h-10 mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{ border: "1px solid rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.04)" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="16" height="16" rx="2" stroke="#C9A84C" strokeWidth="0.8"/>
            <path d="M5 9h8M9 5v8" stroke="#C9A84C" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="w-6 h-px mx-auto mb-3" style={{ background: "#C9A84C" }} />

        {page.title && (
          <h2 className="font-bold mb-2 uppercase tracking-widest"
            style={{ fontSize: "clamp(10px, 1.4vw, 13px)", color: page.textColor || "#fff", letterSpacing: "0.15em" }}>
            {page.title}
          </h2>
        )}
        {page.content && (
          <p className="font-light leading-relaxed"
            style={{ fontSize: "clamp(8px, 0.9vw, 10px)", color: page.textColor || "rgba(255,255,255,0.45)", maxWidth: "160px", margin: "0 auto" }}>
            {page.content}
          </p>
        )}

        <div className="w-6 h-px mx-auto mt-3" style={{ background: "rgba(201,168,76,0.4)" }} />
      </div>
    </div>
  );
}

function ContentPage({ page, side }: { page: CataloguePage; side: "left" | "right" }) {
  void side;
  const isProduct = page.type === "product";

  return (
    <div className="absolute inset-0 flex flex-col p-4">
      {/* Header */}
      {(page.title || page.subtitle) && (
        <div className="flex-shrink-0 mb-3">
          {page.subtitle && (
            <p className="uppercase tracking-widest mb-1"
              style={{ fontSize: "clamp(7px, 0.8vw, 9px)", color: "#C9A84C", letterSpacing: "0.18em" }}>
              {page.subtitle}
            </p>
          )}
          {page.title && (
            <h2 className="font-bold leading-tight"
              style={{
                fontSize: "clamp(11px, 1.5vw, 15px)",
                color: page.textColor || "#fff",
                textShadow: page.imageUrl ? "0 1px 6px rgba(0,0,0,0.8)" : "none",
              }}>
              {page.title}
            </h2>
          )}
          <div className="mt-2 h-px" style={{ width: "24px", background: "#C9A84C" }} />
        </div>
      )}

      {/* Content */}
      {page.content && !page.imageUrl && (
        <div className="flex-1 overflow-hidden">
          {isProduct ? (
            <ProductSpecs content={page.content} textColor={page.textColor} />
          ) : (
            <div className="space-y-1.5">
              {page.content.split("\n").map((line, i) => {
                if (line === "") return <div key={i} style={{ height: "8px" }} />;
                const isBullet = line.startsWith("•") || line.startsWith("-");
                const isHeader = line.endsWith(":") && line.length < 40;
                return (
                  <p key={i}
                    className={`leading-relaxed ${isBullet ? "pl-2" : ""}`}
                    style={{
                      fontSize: "clamp(7px, 0.85vw, 9.5px)",
                      color: isHeader
                        ? "#C9A84C"
                        : page.textColor
                        ? `${page.textColor}cc`
                        : "rgba(255,255,255,0.72)",
                      fontWeight: isHeader ? "600" : "300",
                      letterSpacing: isHeader ? "0.05em" : "0.01em",
                    }}>
                    {line}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content overlay on image */}
      {page.imageUrl && page.content && (
        <div className="flex-shrink-0 mt-auto">
          {isProduct ? (
            <ProductSpecs content={page.content} textColor={page.textColor} overlay />
          ) : (
            <p className="leading-relaxed"
              style={{
                fontSize: "clamp(7px, 0.85vw, 9.5px)",
                color: page.textColor || "rgba(255,255,255,0.85)",
                textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                fontWeight: "300",
              }}>
              {page.content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProductSpecs({ content, textColor, overlay = false }: { content: string; textColor?: string; overlay?: boolean }) {
  const lines = content.split("\n").filter(l => l.trim());
  const specs = lines.filter(l => l.includes(":") && !l.endsWith(":"));
  const desc = lines.filter(l => !l.includes(":") || l.endsWith(":"));

  return (
    <div className="space-y-1">
      {desc.length > 0 && !overlay && (
        <p className="mb-2 leading-relaxed font-light"
          style={{ fontSize: "clamp(7px, 0.85vw, 9px)", color: textColor ? `${textColor}99` : "rgba(255,255,255,0.55)" }}>
          {desc.join(" ")}
        </p>
      )}
      {specs.length > 0 && (
        <div className="space-y-1">
          {specs.slice(0, overlay ? 4 : 8).map((spec, i) => {
            const [key, ...valParts] = spec.split(":");
            const val = valParts.join(":").trim();
            return (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <span className="font-light flex-shrink-0"
                  style={{ fontSize: "clamp(6px, 0.75vw, 8.5px)", color: "rgba(201,168,76,0.7)" }}>
                  {key.trim()}
                </span>
                <div className="flex-1 h-px mx-1" style={{ background: "rgba(255,255,255,0.06)", minWidth: "8px" }} />
                <span className="font-medium text-right"
                  style={{ fontSize: "clamp(6px, 0.75vw, 8.5px)", color: textColor || "rgba(255,255,255,0.8)" }}>
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
