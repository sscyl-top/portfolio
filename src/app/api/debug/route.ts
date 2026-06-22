import { NextResponse } from "next/server";
import { getBackendReadiness } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getBackendReadiness();

  return NextResponse.json({
    supabase: readiness.supabase,
    cms: readiness.cms,
    env: {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
    },
    // Only show first 30 chars to avoid leaking full keys
    urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 50) ?? null,
  });
}
