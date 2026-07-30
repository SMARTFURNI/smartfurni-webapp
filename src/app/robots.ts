import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Ảnh public mới được phục vụ qua API media. Rule cụ thể này phải
        // dài hơn `/api/` để Googlebot có thể thu thập ảnh nhưng vẫn giữ
        // toàn bộ API quản trị/CRM ngoài chỉ mục.
        allow: ["/", "/api/media/public/"],
        disallow: [
          "/api/",
          "/admin/",
          "/crm/",
          "/checkout/",
          "/dashboard/",
          "/crm-login",
          "/orders",
          "/price-list-print",
          "/nps/",
        ],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
