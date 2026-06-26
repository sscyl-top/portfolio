import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 性能优化：移除 X-Powered-By 响应头，减少不必要的响应头开销
  poweredByHeader: false,
  // 性能优化：启用 React 严格模式，提前暴露潜在问题
  reactStrictMode: true,
  // 性能优化：启用 gzip 压缩传输
  compress: true,
  // 性能优化：生产环境不生成浏览器端 Source Maps，减小产物体积
  productionBrowserSourceMaps: false,
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
