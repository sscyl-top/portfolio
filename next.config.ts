import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/portfolio-media/**",
        port: "54321",
        protocol: "http",
      },
      {
        hostname: "localhost",
        pathname: "/storage/v1/object/public/portfolio-media/**",
        port: "54321",
        protocol: "http",
      },
      {
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/portfolio-media/**",
        protocol: "https",
      },
      {
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/portfolio-media/**",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
