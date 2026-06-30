import { randomUUID, createHash } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { detectImageDimensions } from "@/lib/cms/media-metadata";
import { isR2Configured, uploadR2Object, deleteR2Object } from "@/lib/r2/client";
import { isCosConfigured, uploadCosObject, deleteCosObject } from "@/lib/cos/client";
import { generateImageVariants, isOptimizableImage, buildVariantStorageKey } from "@/lib/cms/image-variants";
import { runImageVariantsMigration } from "@/lib/cms/migrations";

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
  // 认证与初始化移入 try，避免 Supabase 连接/Cookie 异常时返回 HTML 错误页导致客户端 JSON 解析失败
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) {
      return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
    }

    const service = createSupabaseServiceClient();
    const backend = getStorageBackend();

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

    // 查重：如果已存在相同 content_hash 的记录，直接复用，不再上传存储
    // 容错：如果 content_hash 列尚未迁移，查询会失败，此时跳过查重正常上传
    // 注意：不去过滤 deleted_at——若命中软删记录，复活该记录（清空 deleted_at）而非新建，
    // 避免相同内容文件被重复上传到 R2 造成存储泄漏
    const { data: existing, error: dedupError } = await service
      .from("media_assets")
      .select("id, storage_key, mime_type, original_name, byte_size, deleted_at")
      .eq("content_hash", contentHash)
      .limit(1)
      .maybeSingle();

    if (existing && !dedupError) {
      // 命中软删记录时复活（清空 deleted_at），让媒体库重新显示
      if (existing.deleted_at) {
        await service
          .from("media_assets")
          .update({ deleted_at: null })
          .eq("id", existing.id);
      }
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
    const hasContentHashColumn = !dedupError;

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

    // 生成多尺寸图片（thumb + large），用于前台不同场景
    // 仅对可优化的图片生成（排除 GIF、SVG）
    let thumbStorageKey: string | null = null;
    let largeStorageKey: string | null = null;
    if (isOptimizableImage(mimeType) && backend === "r2") {
      try {
        const variants = await generateImageVariants(buffer, mimeType);
        thumbStorageKey = buildVariantStorageKey(storageKey, "thumb");
        largeStorageKey = buildVariantStorageKey(storageKey, "large");
        // 并行上传 thumb 和 large 到 R2
        await Promise.all([
          uploadR2Object(thumbStorageKey, variants.thumb, variants.thumbContentType),
          uploadR2Object(largeStorageKey, variants.large, variants.largeContentType),
        ]);
      } catch (err) {
        // 多尺寸生成失败不阻断主流程，回退到原图
        console.warn("[Media Upload] image variants generation failed:", (err as Error).message);
        thumbStorageKey = null;
        largeStorageKey = null;
      }
    }

    const insertData: Record<string, unknown> = {
      id,
      storage_key: storageKey,
      mime_type: mimeType,
      original_name: file.name,
      byte_size: file.size,
      width,
      height,
      alt_text: altText || file.name,
    };
    // 仅在列存在时才写入，避免列不存在导致 insert 失败
    if (hasContentHashColumn) {
      insertData.content_hash = contentHash;
    }
    if (thumbStorageKey) {
      insertData.thumb_storage_key = thumbStorageKey;
    }
    if (largeStorageKey) {
      insertData.large_storage_key = largeStorageKey;
    }

    // 确保 thumb_storage_key/large_storage_key 列存在（迁移幂等，有进程级 flag，仅冷启动首次执行）
    // 在 insert 前调用，给 PostgREST schema cache 刷新留出时间（R2 上传+变体生成期间）
    await runImageVariantsMigration().catch(() => {});

    let { error: dbError } = await service
      .from("media_assets")
      .insert(insertData)
      .select("id, storage_key, original_name")
      .single();

    // 容错：若列仍不存在（schema cache 未刷新），去掉 thumb/large 字段重试
    // 变体文件已在 R2，只是暂未关联到 DB 记录（不影响主流程，后续迁移后新上传会正常关联）
    if (dbError && /does not exist/i.test(dbError.message ?? "")) {
      const fallbackData = { ...insertData };
      delete fallbackData.thumb_storage_key;
      delete fallbackData.large_storage_key;
      const retry = await service
        .from("media_assets")
        .insert(fallbackData)
        .select("id, storage_key, original_name")
        .single();
      dbError = retry.error;
    }

    if (dbError) {
      if (backend === "r2") {
        await deleteR2Object(storageKey).catch(() => {});
        if (thumbStorageKey) await deleteR2Object(thumbStorageKey).catch(() => {});
        if (largeStorageKey) await deleteR2Object(largeStorageKey).catch(() => {});
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
