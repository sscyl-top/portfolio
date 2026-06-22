import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { detectImageDimensions } from "@/lib/cms/media-metadata";

export const runtime = "nodejs";
export const maxDuration = 120; // 2分钟超时

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  // Step 1: Authenticate with session-based client (anon key)
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  // Step 2: All storage + DB ops use service_role (bypasses RLS & storage policies)
  const service = createSupabaseServiceClient();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const altText = String(formData.get("alt_text") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "请选择一个文件" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: `文件大小超出限制（最大 ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB）` },
        { status: 413 },
      );
    }

    const id = randomUUID();
    const storageKey = buildStorageKey(file.name, id);
    const mimeType = file.type || "application/octet-stream";

    // Upload to Supabase Storage (service_role bypasses storage policies)
    const { error: uploadError } = await service.storage
      .from("portfolio-media")
      .upload(storageKey, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return Response.json(
        { error: `文件上传失败: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Detect image dimensions
    let width: number | null = null;
    let height: number | null = null;
    if (mimeType.startsWith("image/")) {
      try {
        const head = Buffer.from(
          new Uint8Array(await file.arrayBuffer(), 0, Math.min(2048, file.size)),
        );
        const dims = detectImageDimensions(mimeType, head);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
      } catch {
        // best-effort
      }
    }

    // Insert media record (service_role bypasses RLS)
    const { data: insertData, error: dbError } = await service
      .from("media_assets")
      .insert({
        id,
        storage_key: storageKey,
        mime_type: mimeType,
        original_name: file.name,
        byte_size: file.size,
        width,
        height,
        alt_text: altText || file.name,
      })
      .select("id, storage_key, original_name")
      .single();

    if (dbError) {
      // Rollback: remove uploaded file
      await service.storage.from("portfolio-media").remove([storageKey]);
      return Response.json(
        { error: `数据库记录保存失败：${dbError.message}` },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      id,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    return Response.json(
      { error: `上传过程中发生错误: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
