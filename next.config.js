// web/next.config.js
const path = require("path");

/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const baseConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },

  async rewrites() {
    return [
      // Auth endpoints
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },

      // Admin / Tenant (safe to keep)
      { source: "/api/admin/:path*", destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: "/api/tenant/:path*", destination: `${BACKEND_URL}/api/tenant/:path*` },

      // Everything else under /api → backend /api
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      // { source: "/files/:path*", destination: `${BACKEND_URL}/files/:path*` },
    ];
  },

  // Use standalone only for production deploys (Render/Docker)
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  env: {
    NEXT_PUBLIC_BACKEND_URL: BACKEND_URL,
  },

  // 🔑 Add the alias so Next/Webpack resolves "@/*" like tsconfig does
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname), // maps "@/..." to project root
    };
    return config;
  },
};

// Keep your “ignore type/eslint errors during build” override
module.exports = {
  ...baseConfig,
  typescript: { ...(baseConfig.typescript || {}), ignoreBuildErrors: true },
  eslint: { ...(baseConfig.eslint || {}), ignoreDuringBuilds: true },
};
