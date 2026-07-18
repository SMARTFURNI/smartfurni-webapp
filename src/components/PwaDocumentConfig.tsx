"use client";

import { useLayoutEffect } from "react";

interface PwaDocumentConfigProps {
  manifestHref: string;
  themeColor?: string;
}

/**
 * Next.js keeps the root manifest link when nested layouts are rendered.
 * Replace it before the browser can start an Add-to-Home-Screen flow so each
 * internal workspace is installed with its own identity and start URL.
 */
export default function PwaDocumentConfig({
  manifestHref,
  themeColor = "#0B111B",
}: PwaDocumentConfigProps) {
  useLayoutEffect(() => {
    let manifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) {
      manifest = document.createElement("link");
      manifest.rel = "manifest";
      document.head.appendChild(manifest);
    }
    manifest.href = manifestHref;

    let theme = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.name = "theme-color";
      document.head.appendChild(theme);
    }
    theme.content = themeColor;
  }, [manifestHref, themeColor]);

  return null;
}
