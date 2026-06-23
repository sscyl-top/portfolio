import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Builds the public read URL for an object in the portfolio-media bucket.
 * The bucket is public (see the CMS foundation migration), so no signed URL
 * is required. The URL is deterministic from the Supabase project URL and the
 * storage key, which keeps it usable in server components without a client.
 */
export function buildPublicMediaUrl(storageKey: string) {
  const { url } = getSupabasePublicConfig();

  return `${url}/storage/v1/object/public/portfolio-media/${storageKey}`;
}

export type OptimizedMediaOptions = {
  width?: number;
  height?: number;
  format?: "webp" | "png" | "jpg";
};

/**
 * Builds a public read URL with Supabase Storage image transformation
 * parameters. Only meaningful for image objects; non-image keys still
 * receive the same URL shape and the storage layer ignores the parameters.
 */
export function buildOptimizedMediaUrl(
  storageKey: string,
  options: OptimizedMediaOptions = {},
) {
  const url = buildPublicMediaUrl(storageKey);
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
