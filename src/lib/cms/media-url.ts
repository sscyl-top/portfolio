import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function buildPublicMediaUrl(storageKey: string) {
  const { url } = getSupabasePublicConfig();
  const encodedKey = storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${url}/storage/v1/object/public/portfolio-media/${encodedKey}`;
}

export type OptimizedMediaOptions = {
  width?: number;
  height?: number;
  format?: "webp" | "png" | "jpg";
  quality?: number;
};

export function buildOptimizedMediaUrl(
  storageKey: string,
  _options: OptimizedMediaOptions = {},
) {
  return buildPublicMediaUrl(storageKey);
}
