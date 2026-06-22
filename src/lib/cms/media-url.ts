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