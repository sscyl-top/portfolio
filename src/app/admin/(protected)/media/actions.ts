"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { buildStorageKey } from "@/lib/cms/admin-model";

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