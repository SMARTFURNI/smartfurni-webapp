import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "SmartFurni Bed Control",
    short_name: "SmartFurni Bed",
    description: "Điều khiển giường công thái học và nệm thông minh SmartFurni qua Bluetooth hoặc Wi‑Fi.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0B111B",
    theme_color: "#C9A84C",
    lang: "vi-VN",
    categories: ["lifestyle", "health", "utilities"],
    icons: [
      { src: "/smartfurni-favicon-v4.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/smartfurni-favicon-v4.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Điều khiển tư thế", short_name: "Tư thế", url: "/dashboard?view=control", icons: [{ src: "/smartfurni-favicon-v4.png", sizes: "512x512" }] },
      { name: "Lịch ngủ", short_name: "Lịch ngủ", url: "/dashboard?view=routine", icons: [{ src: "/smartfurni-favicon-v4.png", sizes: "512x512" }] },
    ],
  };
}
