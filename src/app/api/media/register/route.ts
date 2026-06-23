import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { detectImageDimensions } from "@/lib/cms/media-metadata";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Step 1: Authenticate
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  // Step 2: Use service_role for DB insert (bypasses RLS)
  const service = createSupabaseServiceClient();

  try {
    const body = await request.json();
    const { storage_key, original_name, mime_type, byte_size, alt_text } = body;

    if (!storage_key || !original_name) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const id = randomUUID();

    // Detect image dimensions (best-effort)
    let width: number | null = null;
    let height: number | null = null;
    if (mime_type?.startsWith("image/")) {
      try {
        const { data: fileData } = await service.storage
          .from("portfolio-media")
          .download(storage_key);
        
        if (fileData) {
          const head = new Uint8Array(await fileData.arrayBuffer()).slice(0, 2048);
          const dims = detectImageDimensions(mime_type, Buffer.from(head));
          if (dims) {
            width = dims.width;
            height = dims.height;
          }
        }
      } catch {
        // best-effort
      }
    }

    // Insert media record
    const { error: dbError } = await service
      .from("media_assets")
      .insert({
        id,
        storage_key,
        mime_type: mime_type || "application/octet-stream",
        original_name,
        byte_size: byte_size || 0,
        width,
        height,
        alt_text: alt_text || original_name,
      })
      .select("id, storage_key, original_name")
      .single();

    if (dbError) {
      return Response.json(
        { error: `数据库记录保存失败：${dbError.message}` },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      id,
      name: original_name,
      size: byte_size,
    });
  } catch (error) {
    return Response.json(
      { error: `处理失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
