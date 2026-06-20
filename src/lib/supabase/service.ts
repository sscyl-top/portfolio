import { createClient } from "@supabase/supabase-js";

import { getSupabaseSecretConfig } from "./config";

export function createSupabaseServiceClient() {
  const { url, secretKey } = getSupabaseSecretConfig();

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
