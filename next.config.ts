import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["pg"],
  env: {
    // 暴露 R2 直连 URL 配置到客户端（避免通过 Vercel 代理造成双倍带宽）
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "",
    NEXT_PUBLIC_R2_BUCKET: process.env.R2_BUCKET || "",
    NEXT_PUBLIC_R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
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
      // R2 直连域名（r2.dev 开发域 + 用户自定义域名）
      {
        hostname: "*.r2.dev",
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
