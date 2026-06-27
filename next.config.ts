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
    // 启用现代图片格式（AVIF 优先，其次 WebP），显著减小图片体积
    formats: ["image/avif", "image/webp"],
    // 图片缓存最小 TTL（秒），减少重复图片处理开销
    minimumCacheTTL: 60,
    qualities: [75, 85, 90],
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
