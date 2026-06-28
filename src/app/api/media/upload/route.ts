import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { detectImageDimensions } from "@/lib/cms/media-metadata";
import { isR2Configured, uploadR2Object, deleteR2Object } from "@/lib/r2/client";
import { isCosConfigured, uploadCosObject, deleteCosObject } from "@/lib/cos/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

type StorageBackend = "r2" | "cos" | "supabase";

function getStorageBackend(): StorageBackend {
  return "supabase";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const backend = getStorageBackend();

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (backend === "r2") {
      try {
        await uploadR2Object(storageKey, buffer, mimeType);
      } catch (err) {
        return Response.json(
          { error: `R2上传失败: ${(err as Error).message}` },
          { status: 500 },
        );
      }
    } else if (backend === "cos") {
      try {
        await uploadCosObject(storageKey, buffer, mimeType);
      } catch (err) {
        return Response.json(
          { error: `COS上传失败: ${(err as Error).message}` },
          { status: 500 },
        );
      }
    } else {
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
    }

    let width: number | null = null;
    let height: number | null = null;
    if (mimeType.startsWith("image/")) {
      try {
        const head = Buffer.from(
          new Uint8Array(arrayBuffer, 0, Math.min(4096, file.size)),
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

    const { error: dbError } = await service
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
      if (backend === "r2") {
        await deleteR2Object(storageKey).catch(() => {});
      } else if (backend === "cos") {
        await deleteCosObject(storageKey).catch(() => {});
      } else {
        await service.storage.from("portfolio-media").remove([storageKey]);
      }
      return Response.json(
        { error: `数据库记录保存失败：${dbError.message}` },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      id,
      storage_key: storageKey,
      mime_type: mimeType,
      original_name: file.name,
      byte_size: file.size,
      name: file.name,
      size: file.size,
      storage_backend: backend,
    });
  } catch (error) {
    return Response.json(
      { error: `上传过程中发生错误: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
