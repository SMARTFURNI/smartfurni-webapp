import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Tắt Next.js Client Router Cache để tránh các trang auth bị cache
  // Khi navigate bằng <Link>, Next.js sẽ luôn fetch lại từ server
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent bundling Node.js-only modules (fs, path) into the client bundle.
      // These are used in server-side stores (product-store, order-store, admin-store)
      // but some client components import from those files — webpack needs to know
      // to skip these modules on the client side.
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
        };
    }
    return config;
  },
};

export default nextConfig;
