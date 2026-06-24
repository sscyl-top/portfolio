import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_CONTENT_LENGTH = 1000;
const MAX_AUTHOR_LENGTH = 60;

type CommentRow = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
};

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const workId = await getWorkIdBySlug(slug);
  if (!workId) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("work_comments")
    .select("id, author_name, content, created_at")
    .eq("work_id", workId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch comments", error);
    return NextResponse.json({ error: "获取评论失败" }, { status: 500 });
  }

  return NextResponse.json({ comments: (data ?? []) as CommentRow[] });
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

  let body: {
    authorName?: string;
    content?: string;
    _company?: string;
  } = {};
  try {
    body = (await request.json()) as {
      authorName?: string;
      content?: string;
      _company?: string;
    };
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  // Honeypot：机器人会填充隐藏字段 _company，命中则静默丢弃
  if (body._company && body._company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
  }

  const authorName = (body.authorName?.trim() || "匿名").slice(0, MAX_AUTHOR_LENGTH);
  const trimmedContent = content.slice(0, MAX_CONTENT_LENGTH);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("work_comments").insert({
    work_id: workId,
    author_name: authorName,
    content: trimmedContent,
    is_approved: false,
  });

  if (error) {
    console.error("Failed to submit comment", error);
    return NextResponse.json({ error: "评论提交失败" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
