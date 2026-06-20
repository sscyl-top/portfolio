const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey && supabaseSecretKey);
}

export function getSupabasePublicConfig() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase public environment variables are not configured");
  }

  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}

export function getSupabaseSecretConfig() {
  const publicConfig = getSupabasePublicConfig();

  if (!supabaseSecretKey) {
    throw new Error("Supabase secret environment variable is not configured");
  }

  return { ...publicConfig, secretKey: supabaseSecretKey };
}
