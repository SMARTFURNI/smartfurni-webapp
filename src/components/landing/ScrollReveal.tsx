"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AnimationVariant = "fadeUp" | "fadeIn" | "fadeLeft" | "fadeRight" | "scaleUp" | "stagger";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  variant?: AnimationVariant;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

// ─── Hidden / visible styles per variant ─────────────────────────────────────
function getStyles(variant: AnimationVariant, inView: boolean, delay: number, duration: number): CSSProperties {
  const base: CSSProperties = {
    transition: `opacity ${duration}ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform ${duration}ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
  };

  if (inView) {
    return { ...base, opacity: 1, transform: "none" };
  }

  switch (variant) {
    case "fadeUp":
      return { ...base, opacity: 0, transform: "translateY(32px)" };
    case "fadeLeft":
      return { ...base, opacity: 0, transform: "translateX(-32px)" };
    case "fadeRight":
      return { ...base, opacity: 0, transform: "translateX(32px)" };
    case "scaleUp":
      return { ...base, opacity: 0, transform: "scale(0.92)" };
    case "fadeIn":
    default:
      return { ...base, opacity: 0, transform: "translateY(16px)" };
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ScrollReveal({
  children,
  delay = 0,
  duration = 650,
  variant = "fadeUp",
  threshold = 0.12,
  className,
  style,
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const animStyles = getStyles(variant, inView, delay, duration);

  return (
    // @ts-expect-error dynamic tag
    <Tag
      ref={ref}
      className={className}
      style={{ ...animStyles, ...style }}
    >
      {children}
    </Tag>
  );
}

// ─── Stagger container: wraps children with increasing delays ─────────────────
interface StaggerProps {
  children: ReactNode;
  baseDelay?: number;
  step?: number;
  variant?: AnimationVariant;
  className?: string;
}

export function StaggerReveal({ children, baseDelay = 0, step = 100, variant = "fadeUp", className }: StaggerProps) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className={className}>
      {items.map((child, i) => (
        <ScrollReveal key={i} delay={baseDelay + i * step} variant={variant}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}

// ─── Section wrapper: animates the whole section as a unit ───────────────────
export function SectionReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <ScrollReveal variant="fadeUp" delay={delay} duration={700} className={className}>
      {children}
    </ScrollReveal>
  );
}
