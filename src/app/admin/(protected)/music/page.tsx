import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryEmojis, getMusicSettings } from "./actions";
import type { MusicSettings } from "./types";
import { MusicManager } from "./MusicManager";

export const dynamic = "force-dynamic";

type Category = {
  id: string;
  key: string;
  label: string;
  emoji?: string;
  sort_order: number;
};

type Track = {
  id: string;
  category_id: string;
  title: string;
  sort_order: number;
  media_id: string;
  media: {
    id: string;
    storage_key: string;
    mime_type: string;
    original_name: string;
  } | null;
};

async function fetchMusicData() {
  try {
    const supabase = await createSupabaseServerClient();

    const categoriesPromise = supabase
      .from("music_categories")
      .select("id,key,label,sort_order")
      .order("sort_order");

    const tracksPromise = supabase
      .from("music_tracks")
      .select("id,category_id,title,sort_order,media_id")
      .order("sort_order");

    const [{ data: categories, error: catErr }, { data: tracks, error: trkErr }] =
      await Promise.all([categoriesPromise, tracksPromise]);

    if (catErr) {
      console.error("Music categories query error:", catErr);
    }
    if (trkErr) {
      console.error("Music tracks query error:", trkErr);
    }

    const safeCategories: Category[] = [];
    const safeTracks: Track[] = [];

    if (!catErr && categories) {
      const categoryKeys = (categories as Category[]).map((c) => c.key);
      const emojiMap = await getCategoryEmojis(categoryKeys);
      for (const c of categories as Category[]) {
        safeCategories.push({
          ...c,
          emoji: emojiMap[c.key] || "🎵",
        });
      }
    }

    if (!trkErr && tracks && safeCategories.length > 0) {
      const mediaIds = [
        ...new Set(
          ((tracks ?? []) as { media_id: string }[]).map((t) => t.media_id),
        ),
      ];

      const { data: medias } = mediaIds.length
        ? await supabase
            .from("media_assets")
            .select("id,storage_key,mime_type,original_name")
            .in("id", mediaIds)
        : { data: [] };

      const mediaMap = new Map();
      (medias ?? []).forEach((m) => mediaMap.set(m.id, m));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of tracks as any[]) {
        safeTracks.push({
          id: t.id,
          category_id: t.category_id,
          title: t.title,
          sort_order: t.sort_order,
          media_id: t.media_id,
          media: mediaMap.get(t.media_id) ?? null,
        });
      }
    }

    return { categories: safeCategories, tracks: safeTracks };
  } catch (e) {
    console.error("Music page error:", e);
    return { categories: [], tracks: [] };
  }
}

export default async function AdminMusicPage() {
  const [{ categories, tracks }, settings] = await Promise.all([
    fetchMusicData(),
    getMusicSettings(),
  ]);

  return <MusicManager categories={categories} tracks={tracks} settings={settings as MusicSettings} />;
}
