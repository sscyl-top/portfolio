import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isR2Configured } from "@/lib/r2/config";
import { isCosPublicConfigured } from "@/lib/cos/config";

/**
 * R2 上传的文件 storage_key 以 "r2/" 前缀标记。
 * 通过前缀自动判断文件存储在后端，无需数据库额外字段。
 *
 * R2 文件统一通过应用域名下的代理路由 /api/media/file/ 访问，
 * 避免 r2.dev 开发域名的严格速率限制。
 */
const R2_PREFIX = "r2/";
const R2_PROXY_BASE = "/api/media/file";

export function isR2StorageKey(storageKey: string): boolean {
  return storageKey.startsWith(R2_PREFIX);
}

export function buildPublicMediaUrl(storageKey: string): string {
  if (isR2StorageKey(storageKey) && isR2Configured()) {
    // 通过应用域名代理访问 R2 文件，绕过 r2.dev 速率限制
    // storageKey 形如 "r2/uploads/2026/06/xxx.png" → "/api/media/file/r2/uploads/2026/06/xxx.png"
    return `${R2_PROXY_BASE}/${storageKey}`;
  }

  const { url } = getSupabasePublicConfig();
  return `${url}/storage/v1/object/public/portfolio-media/${storageKey}`;
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

  // R2 通过代理访问时直接返回原文件（R2 不支持变换参数）
  if (isR2StorageKey(storageKey) && isR2Configured()) {
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
    params.set("quality", String(options.quality));
  }

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}
