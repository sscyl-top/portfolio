import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isCosConfigured, buildCosPublicUrl } from "@/lib/cos/config";

export function buildPublicMediaUrl(storageKey: string) {
  if (isCosConfigured()) {
    return buildCosPublicUrl(storageKey);
  }

  const { url } = getSupabasePublicConfig();
  return `${url}/storage/v1/object/public/portfolio-media/${storageKey}`;
}

export type OptimizedMediaOptions = {
  width?: number;
  height?: number;
  format?: "webp" | "png" | "jpg";
};

export function buildOptimizedMediaUrl(
  storageKey: string,
  options: OptimizedMediaOptions = {},
) {
  const url = buildPublicMediaUrl(storageKey);

  if (isCosConfigured()) {
    return url;
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

  const query = params.toString();
  return query ? `${url}?${query}` : url;
}
