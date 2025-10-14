// web/next.config.js
const path = require("path");

// Single source of truth (server-only)
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      // Map FE /api/health -> BE /healthz (you said /healthz returns ok)
      { source: "/api/health", destination: `${BACKEND_URL}/healthz` },

      // If your backend mounts auth under /api/auth, keep this form:
      { source: "/api/auth/:path*",   destination: `${BACKEND_URL}/api/auth/:path*` },

      // Admin / Tenant (under /api)
      { source: "/api/admin/:path*",  destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: "/api/tenant/:path*", destination: `${BACKEND_URL}/api/tenant/:path*` },

      // Catch-all: everything else under /api -> backend /api
      { source: "/api/:path*",        destination: `${BACKEND_URL}/api/:path*` },
      // { source: "/files/:path*",    destination: `${BACKEND_URL}/files/:path*` }, // enable if needed
    ];
  },

  // Standalone for Render builds
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  // 🚫 DO NOT expose backend URL to the browser
  // env: {},

  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };
    return config;
  },

  // Keep your build error ignores if you really need them
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
