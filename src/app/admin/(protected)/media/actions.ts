﻿﻿﻿﻿﻿﻿"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { buildStorageKey } from "@/lib/cms/admin-model";
import { detectImageDimensions } from "@/lib/cms/media-metadata";
import { isCosConfigured, uploadCosObject, deleteCosObject } from "@/lib/cos/client";
import { execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function detectVideoDuration(file: File): Promise<number | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const tempPath = join(tmpdir(), `codex-media-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, buffer);

    const duration = await new Promise<number | null>((resolve) => {
      execFile(
        "ffprobe",
        [
          "-v",
          "quiet",
          "-show_entries",
          "format=duration",
          "-of",
          "csv=p=0",
          tempPath,
        ],
        { timeout: 15000 },
        (err, stdout) => {
          if (err) return resolve(null);
          const seconds = parseFloat(stdout.trim());
          resolve(Number.isFinite(seconds) ? Math.round(seconds * 1000) : null);
        },
      );
    });

    return duration;
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

const maxUploadBytes = 25 * 1024 * 1024;

const idSchema = z.object({ id: z.string().uuid() });

const altTextSchema = z.object({
  id: z.string().uuid(),
  alt_text: z.string().trim().max(500),
});

export async function uploadMediaAsset(formData: FormData) {
  const file = formData.get("file");
  const altText = String(formData.get("alt_text") ?? "").trim();

  if (!(file instanceof File) || file.size === 0 || file.size > maxUploadBytes) {
    return;
  }

  const { client } = await requireAdmin();
  const id = randomUUID();
  const storageKey = buildStorageKey(file.name, id);
  const mimeType = file.type || "application/octet-stream";

  if (isCosConfigured()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadCosObject(storageKey, buffer, mimeType);
  } else {
    const { error: uploadError } = await client.storage
      .from("portfolio-media")
      .upload(storageKey, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);
  }

  // Read the first 2 KiB for image dimension detection. Sharp is not
  // required; PNG/JPEG/GIF/WebP headers are parsed in pure JS.
  let width: number | null = null;
  let height: number | null = null;
  if (mimeType.startsWith("image/")) {
    const head = Buffer.from(await file.arrayBuffer().then((ab) => {
      const view = new Uint8Array(ab, 0, Math.min(2048, ab.byteLength));
      return view;
    }));
    const dims = detectImageDimensions(mimeType, head);
    if (dims) {
      width = dims.width;
      height = dims.height;
    }
  }

  // Detect video duration via ffprobe when available, skipping on failure.
  let durationMs: number | null = null;
  if (mimeType.startsWith("video/")) {
    try {
      durationMs = await detectVideoDuration(file);
    } catch {
      // ffprobe unavailable or file corrupt — skip silently.
    }
  }

  const { error: dbError } = await client.from("media_assets").insert({
    id,
    storage_key: storageKey,
    mime_type: mimeType,
    original_name: file.name,
    byte_size: file.size,
    width,
    height,
    duration_ms: durationMs,
    alt_text: altText || file.name,
  });

  if (dbError) {
    if (isCosConfigured()) {
      await deleteCosObject(storageKey).catch(() => {});
    } else {
      await client.storage.from("portfolio-media").remove([storageKey]).catch(() => {});
    }
    throw new Error(dbError.message);
  }

  revalidatePath("/admin/media");
}

export async function updateMediaAltText(formData: FormData) {
  const parsed = altTextSchema.safeParse({
    id: formData.get("id"),
    alt_text: formData.get("alt_text") ?? "",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  const { error } = await client
    .from("media_assets")
    .update({ alt_text: parsed.data.alt_text })
    .eq("id", parsed.data.id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/media");
  redirect(`/admin/media?toast=alt-saved&id=${encodeURIComponent(parsed.data.id)}`);
}

export async function deleteMediaAsset(formData: FormData) {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  const { client } = await requireAdmin();

  // Soft-delete the metadata row. The storage object is left in place so
  // existing work blocks keep rendering; hard removal happens via a later
  // cleanup pass once no media_usages reference it.
  const { error } = await client
    .from("media_assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/media");
}