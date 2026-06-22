import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RegisterPayload {
  storage_key: string;
  mime_type: string;
  original_name: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  alt_text: string;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  try {
    const body: RegisterPayload = await request.json();

    // Validate required fields
    if (
      !body.storage_key ||
      !body.mime_type ||
      !body.original_name ||
      typeof body.byte_size !== "number"
    ) {
      return Response.json({ error: "缺少必要的元数据字段" }, { status: 400 });
    }

    const id = randomUUID();

    const { error: dbError } = await supabase
      .from("media_assets")
      .insert({
        id,
        storage_key: body.storage_key,
        mime_type: body.mime_type,
        original_name: body.original_name,
        byte_size: body.byte_size,
        width: body.width ?? null,
        height: body.height ?? null,
        alt_text: body.alt_text || body.original_name,
      });

    if (dbError) {
      console.error("[media/register] DB insert failed:", dbError);
      return Response.json(
        { error: `数据库保存失败：${dbError.message}` },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, id, storage_key: body.storage_key });
  } catch (error) {
    console.error("[media/register] Exception:", error);
    return Response.json(
      { error: `注册失败: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
