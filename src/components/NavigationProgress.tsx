"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  minimum: 0.15,
  easing: "ease",
  speed: 300,
  showSpinner: false,
  trickleSpeed: 200,
});

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();

    if (prevPathRef.current !== null && prevPathRef.current !== currentPath) {
      // Navigation completed — finish the bar
      NProgress.done();
    }
    prevPathRef.current = currentPath;
  }, [pathname, searchParams]);

  // Intercept link clicks to start progress bar immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Only internal links, not anchors, not external
      if (
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !href.includes("#") &&
        !target.hasAttribute("download") &&
        !target.getAttribute("target")
      ) {
        // Don't start if same page
        const currentPath = window.location.pathname + window.location.search;
        const targetPath = href;
        if (currentPath !== targetPath) {
          NProgress.start();
          // Safety timeout — stop after 10s if navigation stalls
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => NProgress.done(), 10000);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <style>{`
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: #C9A84C;
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        box-shadow: 0 0 10px #C9A84C, 0 0 5px #C9A84C;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #C9A84C, 0 0 5px #C9A84C;
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}</style>
  );
}
