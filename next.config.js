// web/next.config.js
const path = require("path");

// Server-only: do NOT expose this to the browser
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
      // Health check
      { source: "/api/health", destination: `${BACKEND_URL}/healthz` },

      // ✅ Backend has /auth (NOT /api/auth)
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },

      // ✅ Backend has /api/admin/*
      { source: "/api/admin/:path*", destination: `${BACKEND_URL}/api/admin/:path*` },

      // ✅ Backend has /api/tenants/* (plural)
      { source: "/api/tenants/:path*", destination: `${BACKEND_URL}/api/tenants/:path*` },

      // Optional: make tenant-signup explicit (also covered by catch-all below)
      { source: "/api/tenant-signup", destination: `${BACKEND_URL}/api/tenant-signup` },

      // Catch-all: everything else under /api → backend /api
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
    ];
  },

  // Standalone is good for Render
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };
    return config;
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
