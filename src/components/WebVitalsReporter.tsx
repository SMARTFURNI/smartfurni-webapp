"use client";

import { useReportWebVitals } from "next/web-vitals";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function WebVitalsReporter({ analyticsId }: { analyticsId?: string }) {
  useReportWebVitals((metric) => {
    if (!analyticsId || typeof window.gtag !== "function") return;
    window.gtag("event", "web_vitals", {
      send_to: analyticsId,
      metric_name: metric.name,
      metric_id: metric.id,
      metric_value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      metric_delta: Math.round(metric.name === "CLS" ? metric.delta * 1000 : metric.delta),
      metric_rating: metric.rating,
      non_interaction: true,
    });
  });

  return null;
}
