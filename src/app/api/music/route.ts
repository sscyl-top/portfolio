import { DEFAULT_MUSIC_SETTINGS, type MusicSettings } from "@/app/admin/(protected)/music/types";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

// ISR：revalidate=300（5分钟）。后台修改音乐时 actions.ts 已调用 revalidatePath("/api/music") 立即刷新
export const revalidate = 300;

type CategoryRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
};

type TrackRow = {
  id: string;
  category_id: string;
  title: string;
  media_id: string;
};

type MediaRow = {
  id: string;
  storage_key: string;
  mime_type: string;
};

const DEFAULT_CATEGORY_EMOJIS: Record<string, string> = {
  relax: "🌿",
  energetic: "🔥",
  summer: "🌊",
  badass: "😎",
};

const MUSIC_SETTING_KEYS = [
  "music.hide_frontend",
  "music.hide_backend",
  "music.hide_mobile",
  "music.playing_label",
  "music.tip_messages",
];

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    // 第一步：并行获取 categories、tracks、textEntries
    // 不再全表扫描 media_assets——改为第二步仅查询 tracks 引用到的 media
    const [{ data: categories }, { data: tracks }, { data: textEntries }] =
      await Promise.all([
        supabase
          .from("music_categories")
          .select("id,key,label,sort_order")
          .order("sort_order"),
        supabase
          .from("music_tracks")
          .select("id,category_id,title,media_id"),
        supabase
          .from("text_content")
          .select("key,content")
          .in("key", [
            ...MUSIC_SETTING_KEYS,
            "music.category.relax.emoji",
            "music.category.energetic.emoji",
            "music.category.summer.emoji",
            "music.category.badass.emoji",
          ])
          .eq("is_active", true)
          .is("deleted_at", null),
      ]);

    const textMap = new Map<string, string>();
    (textEntries ?? []).forEach((row: { key: string; content: string }) => {
      textMap.set(row.key, row.content);
    });

    const getEmoji = (key: string) =>
      textMap.get(`music.category.${key}.emoji`)?.trim() || DEFAULT_CATEGORY_EMOJIS[key] || "🎵";

    const settings: MusicSettings = {
      hide_frontend: textMap.get("music.hide_frontend") === "true",
      hide_backend: textMap.get("music.hide_backend") === "true",
      hide_mobile: textMap.get("music.hide_mobile") === "true",
      playing_label: textMap.get("music.playing_label")?.trim() || DEFAULT_MUSIC_SETTINGS.playing_label,
      tip_messages: (() => {
        const raw = textMap.get("music.tip_messages");
        if (!raw) return DEFAULT_MUSIC_SETTINGS.tip_messages;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const tips = parsed.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0);
            return tips.length > 0 ? tips : DEFAULT_MUSIC_SETTINGS.tip_messages;
          }
        } catch {}
        return DEFAULT_MUSIC_SETTINGS.tip_messages;
      })(),
    };

    // 第二步：仅查询 tracks 实际引用到的 media_assets（通常只有几条，而非全表扫描）
    const trackMediaIds = ((tracks ?? []) as TrackRow[])
      .map((t) => t.media_id)
      .filter(Boolean);
    const trackMediaUniqueIds = Array.from(new Set(trackMediaIds));
    const { data: medias } = trackMediaUniqueIds.length > 0
      ? await supabase
          .from("media_assets")
          .select("id,storage_key,mime_type")
          .in("id", trackMediaUniqueIds)
          .is("deleted_at", null)
      : { data: [] as MediaRow[] | null };

    const mediaMap = new Map<string, MediaRow>();
    (medias ?? []).forEach((m: MediaRow) => mediaMap.set(m.id, m));

    const categoriesWithTracks = ((categories ?? []) as CategoryRow[]).map((cat) => ({
      id: cat.id,
      key: cat.key,
      label: cat.label,
      emoji: getEmoji(cat.key),
      tracks: ((tracks ?? []) as TrackRow[])
        .filter((t) => t.category_id === cat.id)
        .map((t) => {
          const media = mediaMap.get(t.media_id);
          return media
            ? {
                id: t.id,
                title: t.title,
                url: buildPublicMediaUrl(media.storage_key),
              }
            : null;
        })
        .filter((t): t is { id: string; title: string; url: string } => t !== null),
    }));

    return NextResponse.json({ categories: categoriesWithTracks, settings });
  } catch {
    return NextResponse.json({
      categories: [],
      settings: DEFAULT_MUSIC_SETTINGS,
    });
  }
}
