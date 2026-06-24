// CDN 加速与图片优化工具
//
// 站点媒体存储在 Supabase Storage（portfolio-media bucket，公开读取），
// 通过 Next.js Image Optimization API（/_next/image）对 Supabase 图片进行
// AVIF/WebP 转换与尺寸压缩，再经由 Vercel Edge Network 缓存加速。
//
// 该工具用于在无法直接使用 next/image <Image> 组件的场景下（如 CSS 背景图、
// 动态拼接等）手动构造优化后的图片 URL。

// 默认目标宽度（像素），与 next/image 常用断点对齐
const DEFAULT_WIDTH = 1200;

// 默认压缩质量（1-100），与 next/image 默认值一致
const DEFAULT_QUALITY = 75;

// Supabase Storage 公开读取路径标识，用于判断 URL 是否来自 portfolio-media bucket。
// 该路径与 next.config.ts 中 images.remotePatterns 的 pathname 保持一致。
const SUPABASE_STORAGE_PATH = "/storage/v1/object/public/portfolio-media/";

/**
 * 判断给定 URL 是否指向 Supabase Storage 的 portfolio-media bucket。
 * 同时兼容本地开发（127.0.0.1:54321 / localhost:54321）与线上（*.supabase.co / *.supabase.in）环境。
 */
function isSupabaseMediaUrl(url: string): boolean {
  return url.includes(SUPABASE_STORAGE_PATH);
}

/**
 * 生成经过 Next.js Image Optimization API 优化的图片 URL。
 *
 * - 若 URL 来自 Supabase Storage，返回 `/_next/image?url=...&w=...&q=...` 格式，
 *   由 Next.js 服务端进行 AVIF/WebP 转换与尺寸压缩，再经由 Vercel Edge Network 缓存加速。
 * - 若 URL 为外部图片（非 Supabase），直接返回原 URL，避免越权代理。
 *
 * @param url 原始图片 URL
 * @param width 目标宽度（像素），默认 1200
 * @param quality 压缩质量（1-100），默认 75
 */
export function getOptimizedImageUrl(
  url: string,
  width: number = DEFAULT_WIDTH,
  quality: number = DEFAULT_QUALITY,
): string {
  // 非 Supabase 图片不经过 Next.js 优化代理，直接返回原 URL
  if (!isSupabaseMediaUrl(url)) {
    return url;
  }

  const params = new URLSearchParams({
    url,
    w: String(width),
    q: String(quality),
  });

  return `/_next/image?${params.toString()}`;
}
