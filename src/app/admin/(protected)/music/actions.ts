"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthorizedAdmin } from "@/lib/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

import { DEFAULT_MUSIC_SETTINGS, DEFAULT_TIP_MESSAGES, type MusicSettings } from "./types";

const MUSIC_SETTING_KEYS = [
  "music.hide_frontend",
  "music.hide_backend",
  "music.playing_label",
  "music.tip_messages",
] as const;

const DEFAULT_CATEGORY_EMOJIS: Record<string, string> = {
  relax: "🌿",
  energetic: "🔥",
  summer: "🌊",
  badass: "😎",
};

export function getCategoryEmojiKey(categoryKey: string): string {
  return `music.category.${categoryKey}.emoji`;
}

async function fetchMusicTextEntries(keys: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("text_content")
    .select("key,content")
    .in("key", keys)
    .eq("is_active", true)
    .is("deleted_at", null);
  const map = new Map<string, string>();
  (data ?? []).forEach((row: { key: string; content: string }) => {
    map.set(row.key, row.content);
  });
  return map;
}

async function upsertMusicTextEntry(
  service: ReturnType<typeof createSupabaseServiceClient>,
  key: string,
  content: string,
) {
  const existing = await service
    .from("text_content")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (existing.data?.id) {
    const { error } = await service
      .from("text_content")
      .update({ content, is_active: true, deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await service.from("text_content").insert({
      key,
      content,
      page: "music",
      section: "settings",
      sort_order: 0,
      is_active: true,
    });
    if (error) throw error;
  }
}

export async function getMusicSettings(): Promise<MusicSettings> {
  try {
    const map = await fetchMusicTextEntries([...MUSIC_SETTING_KEYS]);
    return {
      hide_frontend: map.get("music.hide_frontend") === "true",
      hide_backend: map.get("music.hide_backend") === "true",
      playing_label: map.get("music.playing_label")?.trim() || DEFAULT_MUSIC_SETTINGS.playing_label,
      tip_messages: (() => {
        const raw = map.get("music.tip_messages");
        if (!raw) return DEFAULT_TIP_MESSAGES;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const tips = parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
            return tips.length > 0 ? tips : DEFAULT_TIP_MESSAGES;
          }
        } catch {}
        return DEFAULT_TIP_MESSAGES;
      })(),
    };
  } catch {
    return DEFAULT_MUSIC_SETTINGS;
  }
}

export async function getCategoryEmojis(categoryKeys: string[]): Promise<Record<string, string>> {
  const emojiKeys = categoryKeys.map(getCategoryEmojiKey);
  const map = await fetchMusicTextEntries(emojiKeys);
  const result: Record<string, string> = {};
  for (const key of categoryKeys) {
    const val = map.get(getCategoryEmojiKey(key));
    result[key] = val?.trim() || DEFAULT_CATEGORY_EMOJIS[key] || "🎵";
  }
  return result;
}

export async function saveMusicSettings(formData: FormData) {
  try {
    throw new Error("NEW_CODE_V3_DEPLOYED");
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return { error: "未授权" };

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

    await Promise.all([
      upsertMusicTextEntry(service, "music.hide_frontend", hideFrontend ? "true" : "false"),
      upsertMusicTextEntry(service, "music.hide_backend", hideBackend ? "true" : "false"),
      upsertMusicTextEntry(service, "music.playing_label", playingLabel),
      upsertMusicTextEntry(service, "music.tip_messages", JSON.stringify(tipMessages)),
    ]);

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

export async function updateCategory(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getAuthorizedAdmin(supabase);
    if (!user) return { error: "未授权" };

    const parsed = z.object({
      categoryId: z.string().uuid(),
      categoryKey: z.string().min(1),
      label: z.string().trim().min(1, "分类名称不能为空").max(50, "分类名称最多50个字符"),
      emoji: z.string().trim().max(8, "emoji最多8个字符").default("🎵"),
    }).safeParse({
      categoryId: formData.get("categoryId"),
      categoryKey: formData.get("categoryKey") ?? "",
      label: formData.get("label") ?? "",
      emoji: formData.get("emoji") ?? "🎵",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "参数无效" };
    }

    const emoji = parsed.data.emoji.trim() || DEFAULT_CATEGORY_EMOJIS[parsed.data.categoryKey] || "🎵";

    const service = createSupabaseServiceClient();

    const { error: labelErr } = await service
      .from("music_categories")
      .update({ label: parsed.data.label })
      .eq("id", parsed.data.categoryId);

    if (labelErr) return { error: labelErr.message };

    await upsertMusicTextEntry(service, getCategoryEmojiKey(parsed.data.categoryKey), emoji);

    revalidatePath("/admin/music");
    revalidatePath("/api/music");
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
