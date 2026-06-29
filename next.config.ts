import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  env: {
    NEXT_PUBLIC_COS_BUCKET: process.env.COS_BUCKET || "",
    NEXT_PUBLIC_COS_REGION: process.env.COS_REGION || "",
    NEXT_PUBLIC_COS_CDN_DOMAIN: process.env.COS_CDN_DOMAIN || "",
  },
  images: {
    unoptimized: true,
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
      {
        hostname: "*.myqcloud.com",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
