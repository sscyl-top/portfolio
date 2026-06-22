import { randomUUID } from "node:crypto";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { detectImageDimensions } from "@/lib/cms/media-metadata";
import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function detectVideoDuration(filePath: string): Promise<number | null> {
  return new Promise<number | null>((resolve) => {
    execFile(
      "ffprobe",
      [
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        filePath,
      ],
      { timeout: 15000 },
      (err, stdout) => {
        if (err) return resolve(null);
        const seconds = parseFloat(stdout.trim());
        resolve(Number.isFinite(seconds) ? Math.round(seconds * 1000) : null);
      },
    );
  });
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ===== UPLOAD API START =====`);

  // Authenticate
  const supabase = await createSupabaseServerClient();
  const user = await getAuthorizedAdmin(supabase);
  if (!user) {
    console.error(`[${timestamp}] Auth FAILED: no admin user`);
    return Response.json({ error: "未授权，请重新登录" }, { status: 401 });
  }
  console.log(`[${timestamp}] Auth OK: ${user.email}`);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const altText = String(formData.get("alt_text") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "请选择一个文件" }, { status: 400 });
    }
    console.log(`[${timestamp}] File: ${file.name}, size: ${file.size}, type: ${file.type}`);

    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: `文件大小超出限制（最大 ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB）` },
        { status: 413 },
      );
    }

    const id = randomUUID();
    const storageKey = buildStorageKey(file.name, id);
    const mimeType = file.type || "application/octet-stream";
    console.log(`[${timestamp}] Storage key: ${storageKey}`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("portfolio-media")
      .upload(storageKey, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[${timestamp}] Storage upload FAILED:`, uploadError);
      return Response.json(
        { error: `文件上传失败: ${uploadError.message}` },
        { status: 500 },
      );
    }
    console.log(`[${timestamp}] Storage upload OK`);

    // Detect image dimensions
    let width: number | null = null;
    let height: number | null = null;
    if (mimeType.startsWith("image/")) {
      const head = Buffer.from(
        new Uint8Array(await file.arrayBuffer(), 0, Math.min(2048, file.size)),
      );
      const dims = detectImageDimensions(mimeType, head);
      if (dims) {
        width = dims.width;
        height = dims.height;
      }
      console.log(`[${timestamp}] Image dimensions: ${width}x${height}`);
    }

    // Insert media record
    const { data: insertData, error: dbError } = await supabase
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
      console.error(`[${timestamp}] DB insert FAILED:`, dbError);
      await supabase.storage.from("portfolio-media").remove([storageKey]);
      console.log(`[${timestamp}] Cleaned up storage file`);
      return Response.json(
        { error: `数据库记录保存失败：${dbError.message}` },
        { status: 500 },
      );
    }

    console.log(`[${timestamp}] DB insert OK:`, insertData);
    console.log(`[${timestamp}] ===== UPLOAD API END (success) =====\n`);

    return Response.json({
      ok: true,
      id,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error(`[${timestamp}] Upload API EXCEPTION:`, error);
    return Response.json(
      { error: `上传过程中发生错误: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
