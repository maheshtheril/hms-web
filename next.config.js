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

      // Auth (backend exposes /auth, not /api/auth)
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },

      // Admin + Tenants are under /api on the backend
      { source: "/api/admin/:path*",     destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: "/api/tenants/:path*",   destination: `${BACKEND_URL}/api/tenants/:path*` },

      // Leads + Scheduler live under /api on the backend (fix was here)
      { source: "/api/leads/:path*",     destination: `${BACKEND_URL}/api/leads/:path*` },
      { source: "/api/scheduler/:path*", destination: `${BACKEND_URL}/api/scheduler/:path*` },

      // Uploads
      { source: "/api/uploads/:path*",   destination: `${BACKEND_URL}/api/uploads/:path*` },

      // Optional: tenant signup
      { source: "/api/tenant-signup",    destination: `${BACKEND_URL}/api/tenant-signup` },

      // Catch-all: everything else under /api → backend /api
      { source: "/api/:path*",           destination: `${BACKEND_URL}/api/:path*` },
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
