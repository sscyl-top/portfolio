import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * 定时发布任务入口。
 *
 * 鉴权方式（按优先级）：
 * 1. Authorization: Bearer <CRON_SECRET>  — Vercel Cron 推荐方式
 * 2. ?secret=<CRON_SECRET>                — 手动触发 / 向后兼容
 *
 * 查找 scheduled_publish_at <= now 且 status = 'draft' 的作品，
 * 将其设为已发布并清空 scheduled_publish_at。
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

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  // 优先检查 Authorization header（Vercel Cron 自动注入）
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (bearer === cronSecret) return true;
  }

  // 向后兼容：query string ?secret=
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  if (querySecret && querySecret === cronSecret) return true;

  return false;
}
