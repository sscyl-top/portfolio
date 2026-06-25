"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { runMusicSettingsMigration } from "@/lib/cms/migrations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

import { DEFAULT_MUSIC_SETTINGS, DEFAULT_TIP_MESSAGES, type MusicSettings } from "./types";

function normalizeMusicSettings(row: {
  hide_frontend: boolean;
  hide_backend: boolean;
  tip_messages: string[] | unknown;
  playing_label: string;
} | null): MusicSettings {
  if (!row) return DEFAULT_MUSIC_SETTINGS;
  const tips = Array.isArray(row.tip_messages)
    ? row.tip_messages.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  return {
    hide_frontend: !!row.hide_frontend,
    hide_backend: !!row.hide_backend,
    tip_messages: tips.length > 0 ? tips : DEFAULT_TIP_MESSAGES,
    playing_label: (row.playing_label && row.playing_label.trim()) || DEFAULT_MUSIC_SETTINGS.playing_label,
  };
}

export async function getMusicSettings(): Promise<MusicSettings> {
  try {
    await runMusicSettingsMigration().catch(() => {});
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("music_settings")
      .select("hide_frontend,hide_backend,tip_messages,playing_label")
      .eq("id", true)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_MUSIC_SETTINGS;
    }
    return normalizeMusicSettings(data);
  } catch {
    return DEFAULT_MUSIC_SETTINGS;
  }
}

const categoryUpdateSchema = z.object({
  categoryId: z.string().uuid(),
  label: z.string().trim().min(1).max(50),
  emoji: z.string().trim().max(8).default("🎵"),
});

export async function updateCategory(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return { error: "未授权" };

    const parsed = categoryUpdateSchema.safeParse({
      categoryId: formData.get("categoryId"),
      label: formData.get("label") ?? "",
      emoji: formData.get("emoji") ?? "🎵",
    });

    if (!parsed.success) {
      return { error: "参数无效：名称1-50字，emoji最多8个字符" };
    }

    const emoji = parsed.data.emoji || "🎵";
    const service = createSupabaseServiceClient();
    const { error } = await service
      .from("music_categories")
      .update({ label: parsed.data.label, emoji })
      .eq("id", parsed.data.categoryId);

    if (error) return { error: error.message };

    revalidatePath("/admin/music");
    revalidatePath("/api/music");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function saveMusicSettings(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return { error: "未授权" };

    await runMusicSettingsMigration().catch(() => {});

    const hideFrontend = formData.get("hide_frontend") === "on";
    const hideBackend = formData.get("hide_backend") === "on";
    const playingLabel = String(formData.get("playing_label") ?? "").trim() || DEFAULT_MUSIC_SETTINGS.playing_label;

    const tipMessages = formData.getAll("tip_message")
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);

    if (tipMessages.length === 0) {
      tipMessages.push(...DEFAULT_TIP_MESSAGES);
    }

    const service = createSupabaseServiceClient();
    const { error } = await service.from("music_settings").upsert(
      {
        id: true,
        hide_frontend: hideFrontend,
        hide_backend: hideBackend,
        tip_messages: tipMessages,
        playing_label: playingLabel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) return { error: error.message };

    revalidatePath("/admin/music");
    revalidatePath("/");
    revalidatePath("/api/music");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

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
