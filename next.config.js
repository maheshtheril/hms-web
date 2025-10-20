// web/next.config.js
// Full, corrected Next.js config — safe for Render builds.
// - Always read env via process.env to avoid ReferenceError.
// - Expose NEXT_PUBLIC_BACKEND_URL to client at build time.
// - Use BACKEND constant for rewrites (no undefined identifiers).
// - Keep images, webpack alias, and standalone output for Render.

const path = require("path");

const BACKEND =
  (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.trim()) ||
  (process.env.BACKEND_URL && process.env.BACKEND_URL.trim()) ||
  "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Expose chosen backend URL to the client at build time.
  env: {
    NEXT_PUBLIC_BACKEND_URL: BACKEND,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },

  async rewrites() {
    // Use BACKEND (resolved at build time) for destinations.
    return [
      // Health check
      { source: "/api/health", destination: `${BACKEND}/healthz` },

      // Auth (backend exposes /auth, not /api/auth)
      { source: "/api/auth/:path*", destination: `${BACKEND}/auth/:path*` },

      // Admin + Tenants are under /api on the backend
      { source: "/api/admin/:path*", destination: `${BACKEND}/api/admin/:path*` },
      { source: "/api/tenants/:path*", destination: `${BACKEND}/api/tenants/:path*` },

      // Leads + Scheduler live under /api on the backend
      { source: "/api/leads/:path*", destination: `${BACKEND}/api/leads/:path*` },
      { source: "/api/scheduler/:path*", destination: `${BACKEND}/api/scheduler/:path*` },

      // Uploads
      { source: "/api/uploads/:path*", destination: `${BACKEND}/api/uploads/:path*` },

      // Optional: tenant signup
      { source: "/api/tenant-signup", destination: `${BACKEND}/api/tenant-signup` },

      // Catch-all: everything else under /api → backend /api
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
    ];
  },

  // Standalone builds are convenient for Render
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };
    return config;
  },

  // relax build-time type/lint restrictions if needed (use with caution)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
