"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { buildStorageKey } from "@/lib/cms/admin-model";

const maxUploadBytes = 30 * 1024 * 1024;

const categorySchema = z.object({
  categoryId: z.string().uuid(),
});

const trackSchema = z.object({
  trackId: z.string().uuid(),
  title: z.string().trim().min(1, "标题不能为空").max(200),
});

export async function uploadMusicTrack(formData: FormData) {
  const file = formData.get("file");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || "未命名音乐";

  if (!(file instanceof File) || file.size === 0 || file.size > maxUploadBytes) {
    return { error: "请选择有效的音频文件（最大30MB）" };
  }

  if (!categoryId) {
    return { error: "请选择音乐分类" };
  }

  const parsed = categorySchema.safeParse({ categoryId });
  if (!parsed.success) {
    return { error: "无效的分类" };
  }

  const { client } = await requireAdmin();
  const mediaId = randomUUID();
  const storageKey = buildStorageKey(file.name, mediaId);
  const mimeType = file.type || "audio/mpeg";

  if (!mimeType.startsWith("audio/")) {
    return { error: "请上传音频文件（MP3、WAV、OGG等格式）" };
  }

  const { error: uploadError } = await client.storage
    .from("portfolio-media")
    .upload(storageKey, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: mediaDbError } = await client.from("media_assets").insert({
    id: mediaId,
    storage_key: storageKey,
    mime_type: mimeType,
    original_name: file.name,
    byte_size: file.size,
    alt_text: title,
  });

  if (mediaDbError) {
    await client.storage.from("portfolio-media").remove([storageKey]);
    return { error: mediaDbError.message };
  }

  const trackId = randomUUID();
  const { error: trackDbError } = await client.from("music_tracks").insert({
    id: trackId,
    category_id: parsed.data.categoryId,
    media_id: mediaId,
    title,
  });

  if (trackDbError) {
    await client.storage.from("portfolio-media").remove([storageKey]);
    await client.from("media_assets").delete().eq("id", mediaId);
    return { error: trackDbError.message };
  }

  revalidatePath("/admin/music");
  return { success: true };
}

export async function deleteMusicTrack(formData: FormData) {
  const parsed = z.object({ trackId: z.string().uuid() }).safeParse({
    trackId: formData.get("trackId"),
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();

  const { data: track } = await client
    .from("music_tracks")
    .select("media_id")
    .eq("id", parsed.data.trackId)
    .single();

  if (!track) return;

  await client.from("music_tracks").delete().eq("id", parsed.data.trackId);

  const { data: otherUsage } = await client
    .from("music_tracks")
    .select("id")
    .eq("media_id", track.media_id)
    .limit(1);

  if (!otherUsage || otherUsage.length === 0) {
    const { data: mediaRow } = await client
      .from("media_assets")
      .select("storage_key")
      .eq("id", track.media_id)
      .single();

    if (mediaRow) {
      await client.storage.from("portfolio-media").remove([mediaRow.storage_key]);
      await client.from("media_assets").delete().eq("id", track.media_id);
    }
  }

  revalidatePath("/admin/music");
}

export async function updateTrackTitle(formData: FormData) {
  const parsed = trackSchema.safeParse({
    trackId: formData.get("trackId"),
    title: formData.get("title") ?? "",
  });

  if (!parsed.success) return;

  const { client } = await requireAdmin();
  await client
    .from("music_tracks")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.trackId);

  revalidatePath("/admin/music");
}
