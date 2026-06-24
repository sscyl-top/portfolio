import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * 定时发布任务入口。
 *
 * 鉴权方式：Authorization: Bearer <CRON_SECRET>（Vercel Cron 自动注入）
 * 使用时序安全比较防止密钥泄露。
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await service
    .from("works")
    .update({ status: "published", published_at: now, scheduled_publish_at: null })
    .eq("status", "draft")
    .lte("scheduled_publish_at", now)
    .select("id,title,slug");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    published: (data ?? []).length,
    works: data ?? [],
  });
}

/** 时序安全的字符串比较 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (bearer && safeEqual(bearer, cronSecret)) return true;
  }

  return false;
}
