import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      ...["/admin-manifest.webmanifest", "/crm-manifest.webmanifest", "/smart-bed-manifest.webmanifest"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      })),
    ];
  },
  // Redirect domain gốc sang www (PA Vietnam không hỗ trợ CNAME cho @)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "smartfurni.com.vn" }],
        destination: "https://www.smartfurni.com.vn/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    if (process.env.MEDIA_SERVE_LEGACY_UPLOADS_FROM_BUCKET !== "true") {
      return [];
    }
    return {
      // Chỉ bật sau khi `media:railway:upload` và `media:railway:verify`
      // thành công. URL công khai `/uploads/...` không đổi nên Google Images,
      // Open Graph và các liên kết cũ không phải lập chỉ mục lại.
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: "/api/media/public/legacy/uploads/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    // Middleware bao phủ toàn bộ CRM và mặc định chỉ giữ 10MB request body.
    // Giới hạn ứng dụng cho video/file là 40MB, nên cần chừa thêm biên để
    // request raw binary không bị cắt mất phần cuối của MP4/MOV.
    middlewareClientMaxBodySize: "50mb",
    // Bật Client Router Cache: dynamic 30s giúp sidebar chuyển trang nhanh
    // Trang auth dùng middleware redirect nên không bị ảnh hưởng bởi cache
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Tăng giới hạn body size cho upload video 200MB
    serverActions: {
      bodySizeLimit: "250mb",
    },
  },
  // Externalize server-only packages (mysql2, pg, googleapis) from server bundle
  serverExternalPackages: ["mysql2", "pg", "pg-native", "googleapis", "google-auth-library", "google-ads-api", "zca-js", "sharp", "web-push"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent bundling Node.js-only modules into the client bundle.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        dns: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        buffer: false,
        events: false,
        string_decoder: false,
        timers: false,
        // mysql2 node: URI scheme modules
        diagnostics_channel: false,
        perf_hooks: false,
        worker_threads: false,
        child_process: false,
        async_hooks: false,
        v8: false,
      };

      // Externalize mysql2, pg, googleapis and node: scheme modules from client bundle
      const prevExternals = config.externals || [];
      config.externals = [
        ...(Array.isArray(prevExternals) ? prevExternals : [prevExternals]),
        function ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) {
          if (
            request &&
            (request.startsWith("node:") ||
              request === "mysql2" ||
              request === "mysql2/promise" ||
              request === "pg" ||
              request === "pg-native" ||
              request === "pg-pool" ||
              request === "google-ads-api" ||
              request === "googleapis" ||
              request === "google-auth-library" ||
              request === "zca-js" ||
              request === "sharp")
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
