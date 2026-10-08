import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: process.env.NODE_ENV === "production" ? "1mb" : "26mb",
    },
  },
};

export default nextConfig;
