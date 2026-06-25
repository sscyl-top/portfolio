import { DEFAULT_MUSIC_SETTINGS, type MusicSettings } from "@/app/admin/(protected)/music/types";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  "music.playing_label",
  "music.tip_messages",
];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const [{ data: categories }, { data: tracks }, { data: medias }, { data: textEntries }] =
      await Promise.all([
        supabase
          .from("music_categories")
          .select("id,key,label,sort_order")
          .order("sort_order"),
        supabase
          .from("music_tracks")
          .select("id,category_id,title,media_id"),
        supabase
          .from("media_assets")
          .select("id,storage_key,mime_type")
          .is("deleted_at", null),
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
