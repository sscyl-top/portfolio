import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";

/**
 * Browser-safe Supabase client using the publishable (anon) key.
 * Can only perform operations allowed by Storage RLS policies.
 */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey);
}
