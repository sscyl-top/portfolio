import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isR2Configured, buildR2PublicUrl } from "@/lib/r2/config";
import { isCosPublicConfigured, buildCosPublicUrl } from "@/lib/cos/config";

export type StorageBackend = "supabase" | "r2" | "cos";

export function buildPublicMediaUrl(storageKey: string, backend?: StorageBackend): string {
  const effectiveBackend = backend ?? "supabase";

  if (effectiveBackend === "r2" && isR2Configured()) {
    return buildR2PublicUrl(storageKey);
  }
  if (effectiveBackend === "cos" && isCosPublicConfigured()) {
    return buildCosPublicUrl(storageKey);
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
  backend?: StorageBackend,
) {
  const baseUrl = buildPublicMediaUrl(storageKey, backend);
  const effectiveBackend = backend ?? "supabase";

  if (effectiveBackend === "r2" && isR2Configured()) {
    return baseUrl;
  }

  if (effectiveBackend === "cos" && isCosPublicConfigured()) {
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
