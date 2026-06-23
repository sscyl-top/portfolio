import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * 定时发布任务入口。
 * 调用方需通过 query 传入 ?secret=<CRON_SECRET> 做简单鉴权。
 * 查找 scheduled_publish_at <= now 且 status = 'draft' 的作品，
 * 将其设为已发布并清空 scheduled_publish_at。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
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
