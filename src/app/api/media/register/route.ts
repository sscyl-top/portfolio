import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { detectImageDimensions } from "@/lib/cms/media-metadata";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

export const runtime = "nodejs";

async function downloadFileHead(
  service: ReturnType<typeof createSupabaseServiceClient>,
  storageKey: string,
): Promise<Uint8Array | null> {
  try {
    const { data } = await service.storage.from("portfolio-media").download(storageKey);
    if (data) {
      return new Uint8Array(await data.arrayBuffer()).slice(0, 4096);
    }
  } catch {
    // fall through to public URL
  }

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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  try {
    const body = await request.json();
    const { storage_key, original_name, mime_type, byte_size, alt_text } = body;

    if (!storage_key || !original_name) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
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
