import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = new URL(process.env.API_ORIGIN ?? "http://localhost:8080").origin;
    return [{ source: "/api/v1/:path*", destination: `${origin}/api/v1/:path*` }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: process.env.NODE_ENV === "production" ? "1mb" : "26mb",
    },
  },
};

export default nextConfig;
