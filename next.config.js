// web/next.config.js

/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

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
      // Auth endpoints
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },

      // Admin / Tenant (safe to keep)
      { source: "/api/admin/:path*", destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: "/api/tenant/:path*", destination: `${BACKEND_URL}/api/tenant/:path*` },

      // Everything else under /api → backend /api
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },

      // If you ever serve files from the backend, uncomment:
      // { source: "/files/:path*", destination: `${BACKEND_URL}/files/:path*` },
    ];
  },

  // Use standalone only for production deploys (Render/Docker)
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  env: {
    NEXT_PUBLIC_BACKEND_URL: BACKEND_URL,
  },
};

module.exports = nextConfig;
