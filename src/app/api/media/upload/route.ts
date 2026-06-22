import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { requireAdmin } from "@/lib/admin-session";
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
  // Authenticate
  const { client: supabase } = await requireAdmin();

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

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("portfolio-media")
      .upload(storageKey, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", uploadError);
      return Response.json(
        { error: "文件上传失败，请稍后重试" },
        { status: 500 },
      );
    }

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
    }

    // Detect video duration via ffprobe when available
    let durationMs: number | null = null;
    if (mimeType.startsWith("video/")) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempPath = join(tmpdir(), `media-${randomUUID()}.tmp`);
        try {
          await writeFile(tempPath, buffer);
          durationMs = await detectVideoDuration(tempPath);
        } finally {
          await unlink(tempPath).catch(() => {});
        }
      } catch {
        // ffprobe unavailable — skip silently
      }
    }

    // Insert media record
    const { error: dbError } = await supabase.from("media_assets").insert({
      id,
      storage_key: storageKey,
      mime_type: mimeType,
      original_name: file.name,
      byte_size: file.size,
      width,
      height,
      duration_ms: durationMs,
      alt_text: altText || null,
    });

    if (dbError) {
      console.error("Media record insert failed:", dbError);
      return Response.json(
        { error: "记录保存失败，但文件已上传" },
        { status: 207 },
      );
    }

    return Response.json({
      ok: true,
      id,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return Response.json(
      { error: "上传过程中发生错误，请稍后重试" },
      { status: 500 },
    );
  }
}
