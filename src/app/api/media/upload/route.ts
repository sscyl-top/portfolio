import { randomUUID, createHash } from "node:crypto";

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
  if (isR2Configured()) return "r2";
  if (isCosConfigured()) return "cos";
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

    const mimeType = file.type || "application/octet-stream";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // 计算文件内容 SHA-256 哈希，用于去重
    const contentHash = createHash("sha256").update(buffer).digest("hex");

    // 查重：如果已存在相同 content_hash 且未删除的记录，直接复用，不再上传存储
    const { data: existing } = await service
      .from("media_assets")
      .select("id, storage_key, mime_type, original_name, byte_size")
      .eq("content_hash", contentHash)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return Response.json({
        ok: true,
        id: existing.id,
        storage_key: existing.storage_key,
        mime_type: existing.mime_type,
        original_name: existing.original_name,
        byte_size: existing.byte_size,
        name: existing.original_name,
        size: existing.byte_size,
        deduplicated: true,
      });
    }

    const id = randomUUID();
    const baseKey = buildStorageKey(file.name, id);
    // R2上传的文件storage_key加 "r2/" 前缀，用于URL构建时区分存储后端
    const storageKey = backend === "r2" ? `r2/${baseKey}` : baseKey;

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
        content_hash: contentHash,
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
