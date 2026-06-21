"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-session";
import { buildStorageKey } from "@/lib/cms/admin-model";

const maxUploadBytes = 25 * 1024 * 1024;

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

  const { error: uploadError } = await client.storage
    .from("portfolio-media")
    .upload(storageKey, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) return;

  await client.from("media_assets").insert({
    id,
    storage_key: storageKey,
    mime_type: mimeType,
    original_name: file.name,
    byte_size: file.size,
    alt_text: altText,
  });

  revalidatePath("/admin/media");
}
