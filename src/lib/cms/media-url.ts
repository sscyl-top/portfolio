import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isCosPublicConfigured } from "@/lib/cos/config";

/**
 * R2 上传的文件 storage_key 以 "r2/" 前缀标记。
 * 通过前缀自动判断文件存储在后端，无需数据库额外字段。
 *
 * R2 文件直连 CDN URL 访问（默认 r2.dev 开发域，生产建议配置 R2_PUBLIC_URL
 * 自定义域名）。这样不经过 Vercel 代理，避免双倍带宽消耗。
 */
const R2_PREFIX = "r2/";
const R2_PROXY_BASE = "/api/media/file";

export function isR2StorageKey(storageKey: string): boolean {
  return storageKey.startsWith(R2_PREFIX);
}

/**
 * 构建 R2 直连 URL（客户端 + 服务端通用）。
 * 优先使用 NEXT_PUBLIC_R2_PUBLIC_URL（自定义域名）；
 * 否则使用 NEXT_PUBLIC_R2_BUCKET.NEXT_PUBLIC_R2_ACCOUNT_ID.r2.dev；
 * 如果两者都未配置（本地开发无 R2），降级走 Vercel 代理。
 */
function buildR2DirectUrl(storageKey: string): string {
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${storageKey}`;
  }

  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET;
  const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
  if (bucket && accountId) {
    return `https://${bucket}.${accountId}.r2.dev/${storageKey}`;
  }

  // 本地开发或未配置 R2 直连时，降级走代理（生产不应触发）
  return `${R2_PROXY_BASE}/${storageKey}`;
}

export function buildPublicMediaUrl(storageKey: string): string {
  if (isR2StorageKey(storageKey)) {
    return buildR2DirectUrl(storageKey);
  }

  const { url } = getSupabasePublicConfig();
  return `${url}/storage/v1/object/public/portfolio-media/${storageKey}`;
}

/**
 * 构建 thumb 尺寸图片 URL（卡片展示用）。
 * 如果没有 thumb_storage_key，回退到原图 URL。
 */
export function buildThumbMediaUrl(thumbStorageKey: string | null | undefined, originalStorageKey: string): string {
  if (thumbStorageKey) {
    return buildPublicMediaUrl(thumbStorageKey);
  }
  return buildPublicMediaUrl(originalStorageKey);
}

/**
 * 构建 large 尺寸图片 URL（详情页展示用）。
 * 如果没有 large_storage_key，回退到原图 URL。
 */
export function buildLargeMediaUrl(largeStorageKey: string | null | undefined, originalStorageKey: string): string {
  if (largeStorageKey) {
    return buildPublicMediaUrl(largeStorageKey);
  }
  return buildPublicMediaUrl(originalStorageKey);
}

export type OptimizedMediaOptions = {
  width?: number;
  height?: number;
  format?: "webp" | "png" | "jpg";
  quality?: number;
};

export function buildOptimizedMediaUrl(
  storageKey: string,
  options: OptimizedMediaOptions = {},
) {
  const baseUrl = buildPublicMediaUrl(storageKey);

  // R2 通过直连访问时直接返回原文件（R2 不支持变换参数）
  if (isR2StorageKey(storageKey)) {
    return baseUrl;
  }

  if (isCosPublicConfigured()) {
    const parts: string[] = [];
    if (options.width || options.height) {
      const w = options.width ? String(Math.round(options.width)) : "";
      const h = options.height ? `x${Math.round(options.height)}` : "";
      parts.push(`thumbnail/${w}${h}`);
    }
    if (options.format) {
      parts.push(`format/${options.format}`);
    }
    const quality = options.quality ?? 90;
    parts.push(`quality/${quality}`);
    if (parts.length === 0) return baseUrl;
    const separator = baseUrl.includes("?") ? "|" : "?";
    return `${baseUrl}${separator}imageMogr2/${parts.join("/")}`;
  }

  const params = new URLSearchParams();

  if (options.width && Number.isFinite(options.width)) {
    params.set("width", String(Math.round(options.width)));
  }
  if (options.height && Number.isFinite(options.height)) {
    params.set("height", String(Math.round(options.height)));
  }
  if (options.format) {
    params.set("format", options.format);
  }
  if (options.quality && Number.isFinite(options.quality)) {
    params.set("quality", String(Math.round(options.quality)));
  }

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}
