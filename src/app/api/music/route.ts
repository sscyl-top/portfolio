import { DEFAULT_MUSIC_SETTINGS, type MusicSettings } from "@/app/admin/(protected)/music/types";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import { runMusicSettingsMigration } from "@/lib/cms/migrations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  key: string;
  label: string;
  emoji?: string;
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

export async function GET() {
  try {
    await runMusicSettingsMigration().catch(() => {});
    const supabase = await createSupabaseServerClient();

    const [{ data: categories }, { data: tracks }, { data: medias }] =
      await Promise.all([
        supabase
          .from("music_categories")
          .select("*")
          .order("sort_order"),
        supabase
          .from("music_tracks")
          .select("id,category_id,title,media_id"),
        supabase
          .from("media_assets")
          .select("id,storage_key,mime_type")
          .is("deleted_at", null),
      ]);

    // 单独查询settings，表不存在时优雅降级
    let settings: MusicSettings = DEFAULT_MUSIC_SETTINGS;
    try {
      const { data: s } = await supabase
        .from("music_settings")
        .select("hide_frontend,hide_backend,tip_messages,playing_label")
        .eq("id", true)
        .maybeSingle();

      if (s) {
        const tips = Array.isArray(s.tip_messages)
          ? s.tip_messages.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
          : [];
        settings = {
          hide_frontend: !!s.hide_frontend,
          hide_backend: !!s.hide_backend,
          tip_messages: tips.length > 0 ? tips : DEFAULT_MUSIC_SETTINGS.tip_messages,
          playing_label: (s.playing_label && String(s.playing_label).trim()) || DEFAULT_MUSIC_SETTINGS.playing_label,
        };
      }
    } catch {
      // 表不存在，使用默认设置
    }

    const mediaMap = new Map<string, MediaRow>();
    (medias ?? []).forEach((m: MediaRow) => mediaMap.set(m.id, m));

    const categoriesWithTracks = ((categories ?? []) as CategoryRow[]).map(
      (cat) => ({
        id: cat.id,
        key: cat.key,
        label: cat.label,
        emoji: cat.emoji || "🎵",
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
          .filter(
            (t): t is { id: string; title: string; url: string } => t !== null,
          ),
      }),
    );

    return NextResponse.json({ categories: categoriesWithTracks, settings });
  } catch {
    return NextResponse.json({
      categories: [],
      settings: DEFAULT_MUSIC_SETTINGS,
    });
  }
}
