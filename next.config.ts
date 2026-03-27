import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Tắt Next.js Client Router Cache để tránh các trang auth bị cache
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  // Externalize server-only packages (mysql2, pg, googleapis) from server bundle
  serverExternalPackages: ["mysql2", "pg", "pg-native", "googleapis", "google-auth-library"],
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
              request === "googleapis" ||
              request === "google-auth-library")
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
