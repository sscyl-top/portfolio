"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const trackIdSchema = z.object({
  trackId: z.string().uuid(),
});

const addTrackSchema = z.object({
  categoryId: z.string().uuid(),
  mediaId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export async function addMusicTrack(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return { error: "未授权" };

    const parsed = addTrackSchema.safeParse({
      categoryId: formData.get("categoryId"),
      mediaId: formData.get("mediaId"),
      title: formData.get("title") ?? "",
    });

    if (!parsed.success) {
      return { error: "参数无效" };
    }

    const service = createSupabaseServiceClient();
    const { error } = await service.from("music_tracks").insert({
      category_id: parsed.data.categoryId,
      media_id: parsed.data.mediaId,
      title: parsed.data.title,
    });

    if (error) return { error: error.message };

    revalidatePath("/admin/music");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteMusicTrack(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return;

    const parsed = trackIdSchema.safeParse({
      trackId: formData.get("trackId"),
    });
    if (!parsed.success) return;

    const service = createSupabaseServiceClient();

    const { data: track } = await service
      .from("music_tracks")
      .select("media_id")
      .eq("id", parsed.data.trackId)
      .single();

    if (!track) return;

    await service.from("music_tracks").delete().eq("id", parsed.data.trackId);

    const { data: otherUsage } = await service
      .from("music_tracks")
      .select("id")
      .eq("media_id", track.media_id)
      .limit(1);

    if (!otherUsage || otherUsage.length === 0) {
      const { data: mediaRow } = await service
        .from("media_assets")
        .select("storage_key")
        .eq("id", track.media_id)
        .single();

      if (mediaRow) {
        await service.storage.from("portfolio-media").remove([mediaRow.storage_key]);
        await service.from("media_assets").delete().eq("id", track.media_id);
      }
    }

    revalidatePath("/admin/music");
  } catch (e) {
    console.error("deleteMusicTrack error:", e);
  }
}

export async function updateTrackTitle(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return;

    const parsed = z.object({
      trackId: z.string().uuid(),
      title: z.string().trim().min(1).max(200),
    }).safeParse({
      trackId: formData.get("trackId"),
      title: formData.get("title") ?? "",
    });

    if (!parsed.success) return;

    const service = createSupabaseServiceClient();
    await service
      .from("music_tracks")
      .update({ title: parsed.data.title })
      .eq("id", parsed.data.trackId);

    revalidatePath("/admin/music");
  } catch (e) {
    console.error("updateTrackTitle error:", e);
  }
}
