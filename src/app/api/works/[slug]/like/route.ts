import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

async function getWorkIdBySlug(slug: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("works")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();
  return data?.id ?? null;
}

async function countLikes(workId: string): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase
    .from("work_likes")
    .select("*", { count: "exact", head: true })
    .eq("work_id", workId);
  return count ?? 0;
}

async function hasLiked(workId: string, sessionId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("work_likes")
    .select("id")
    .eq("work_id", workId)
    .eq("session_id", sessionId)
    .maybeSingle();
  return Boolean(data);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const workId = await getWorkIdBySlug(slug);
  if (!workId) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 });
  }

  const sessionId =
    request.nextUrl.searchParams.get("sessionId")?.trim() ?? "";
  const count = await countLikes(workId);
  const liked = sessionId ? await hasLiked(workId, sessionId) : false;

  return NextResponse.json({ liked, count });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const workId = await getWorkIdBySlug(slug);
  if (!workId) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 });
  }

  let body: { sessionId?: string } = {};
  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("work_likes")
    .upsert(
      { work_id: workId, session_id: sessionId },
      { onConflict: "work_id,session_id" },
    );

  if (error) {
    console.error("Failed to like work", error);
    return NextResponse.json({ error: "点赞失败" }, { status: 500 });
  }

  return NextResponse.json({ liked: true, count: await countLikes(workId) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const workId = await getWorkIdBySlug(slug);
  if (!workId) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 });
  }

  let body: { sessionId?: string } = {};
  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("work_likes")
    .delete()
    .eq("work_id", workId)
    .eq("session_id", sessionId);

  if (error) {
    console.error("Failed to unlike work", error);
    return NextResponse.json({ error: "取消点赞失败" }, { status: 500 });
  }

  return NextResponse.json({ liked: false, count: await countLikes(workId) });
}
