import { randomUUID, createHash } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { detectImageDimensions } from "@/lib/cms/media-metadata";
import { buildPublicMediaUrl, isR2StorageKey } from "@/lib/cms/media-url";
import { getR2Object, deleteR2Object } from "@/lib/r2/client";
import { runMediaContentHashMigration } from "@/lib/cms/migrations";

export const runtime = "nodejs";

// 直传场景下载完整文件计算哈希的大小阈值，超过则跳过查重
const DEDUP_MAX_BYTES = 50 * 1024 * 1024;

async function downloadFileHead(
  service: ReturnType<typeof createSupabaseServiceClient>,
  storageKey: string,
): Promise<Uint8Array | null> {
  // R2 文件：直接通过 R2 SDK 拉取，不经过自身代理路由（避免递归调用与三倍带宽）
  if (isR2StorageKey(storageKey)) {
    try {
      const obj = await getR2Object(storageKey);
      if (obj && obj.body) {
        const buf = Buffer.isBuffer(obj.body) ? obj.body : Buffer.from(obj.body);
        return new Uint8Array(buf.slice(0, 4096));
      }
    } catch {
      // best-effort
    }
    return null;
  }

  // 非 R2 文件：先尝试 Supabase 直读（注意：会下载完整文件，应仅用于小图）
  try {
    const { data } = await service.storage.from("portfolio-media").download(storageKey);
    if (data) {
      return new Uint8Array(await data.arrayBuffer()).slice(0, 4096);
    }
  } catch {
    // fall through to public URL
  }

  // 最后兜底：通过 Supabase 公开 URL 拉取头部（不经过自身代理路由）
  try {
    const publicUrl = buildPublicMediaUrl(storageKey);
    const res = await fetch(publicUrl);
    if (res.ok) {
      const reader = res.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (total < 4096) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.length;
        }
        const combined = new Uint8Array(Math.min(total, 4096));
        let offset = 0;
        for (const chunk of chunks) {
          const need = Math.min(chunk.length, combined.length - offset);
          combined.set(chunk.slice(0, need), offset);
          offset += need;
          if (offset >= combined.length) break;
        }
        return combined;
      }
    }
  } catch {
    // best-effort
  }
  return null;
}

/**
 * 下载完整文件内容用于计算 content_hash。
 * 仅对小于 DEDUP_MAX_BYTES 的文件调用，避免大文件下载开销。
 */
async function downloadFullFile(
  service: ReturnType<typeof createSupabaseServiceClient>,
  storageKey: string,
): Promise<Buffer | null> {
  // R2 文件：通过 R2 SDK 拉取完整内容
  if (isR2StorageKey(storageKey)) {
    try {
      const obj = await getR2Object(storageKey);
      if (obj && obj.body) {
        return Buffer.isBuffer(obj.body) ? obj.body : Buffer.from(obj.body);
      }
    } catch {
      // best-effort
    }
    return null;
  }

  // 非 R2 文件：通过 Supabase Storage 下载完整文件
  try {
    const { data } = await service.storage.from("portfolio-media").download(storageKey);
    if (data) {
      return Buffer.from(await data.arrayBuffer());
    }
  } catch {
    // best-effort
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  // 确保 content_hash 列存在（幂等，进程级 flag 仅冷启动首次执行）
  await runMediaContentHashMigration().catch(() => {});

  try {
    const body = await request.json();
    const { storage_key, original_name, mime_type, byte_size, alt_text } = body;

    if (!storage_key || !original_name) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 直传场景查重：文件较小时下载完整内容计算哈希，大文件跳过查重
    let contentHash: string | null = null;
    let hasContentHashColumn = true; // 假设列存在，查重失败时设为 false
    const sizeNum = Number(byte_size) || 0;
    if (sizeNum > 0 && sizeNum <= DEDUP_MAX_BYTES) {
      try {
        const fullBuffer = await downloadFullFile(service, storage_key);
        if (fullBuffer) {
          contentHash = createHash("sha256").update(fullBuffer).digest("hex");
        }
      } catch {
        // best-effort，查重失败不阻塞注册
      }
    }

    if (contentHash) {
      // 直传查重：与 upload route 对齐，不去过滤 deleted_at
      // 命中软删记录时复活（清空 deleted_at），并清理刚直传到 R2 的新文件，避免存储泄漏
      const { data: existing, error: dedupError } = await service
        .from("media_assets")
        .select("id, storage_key, mime_type, original_name, byte_size, deleted_at")
        .eq("content_hash", contentHash)
        .limit(1)
        .maybeSingle();

      if (dedupError) {
        // content_hash 列可能尚未迁移，跳过查重
        hasContentHashColumn = false;
      } else if (existing) {
        // 命中软删记录：复活 + 清理刚直传的新文件
        if (existing.deleted_at) {
          await service
            .from("media_assets")
            .update({ deleted_at: null })
            .eq("id", existing.id);
          // 清理刚直传到 R2 的新文件（旧文件仍在原 storage_key）
          if (isR2StorageKey(storage_key)) {
            await deleteR2Object(storage_key).catch(() => {});
          }
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
    }

    const id = randomUUID();

    let width: number | null = null;
    let height: number | null = null;
    if (mime_type?.startsWith("image/")) {
      try {
        const head = await downloadFileHead(service, storage_key);
        if (head) {
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

    const insertData: Record<string, unknown> = {
      id,
      storage_key,
      mime_type: mime_type || "application/octet-stream",
      original_name,
      byte_size: byte_size || 0,
      width,
      height,
      alt_text: alt_text || original_name,
    };
    // 仅在 content_hash 列存在时才写入，避免列不存在导致 insert 失败
    if (hasContentHashColumn && contentHash) {
      insertData.content_hash = contentHash;
    }

    const { error: dbError } = await service
      .from("media_assets")
      .insert(insertData)
      .select("id, storage_key, original_name")
      .single();

    if (dbError) {
      return Response.json(
        { error: `数据库记录保存失败：${dbError.message}` },
        { status: 500 },
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
      { status: 500 },
    );
  }
}
