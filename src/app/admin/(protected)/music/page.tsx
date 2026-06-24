import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MusicManager } from "./MusicManager";

export const dynamic = "force-dynamic";

type Category = {
  id: string;
  key: string;
  label: string;
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

    const [{ data: categories, error: catErr }, { data: tracks, error: trkErr }] =
      await Promise.all([
        supabase.from("music_categories").select("*").order("sort_order"),
        supabase
          .from("music_tracks")
          .select("id,category_id,title,sort_order,media_id")
          .order("sort_order"),
      ]);

    if (catErr || trkErr) {
      console.error("Music page query error:", catErr || trkErr);
      return { categories: [], tracks: [] };
    }

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

    const tracksWithMedia: Track[] = ((tracks ?? []) as any[]).map((t) => ({
      id: t.id,
      category_id: t.category_id,
      title: t.title,
      sort_order: t.sort_order,
      media_id: t.media_id,
      media: mediaMap.get(t.media_id) ?? null,
    }));

    return {
      categories: (categories ?? []) as Category[],
      tracks: tracksWithMedia,
    };
  } catch (e) {
    console.error("Music page error:", e);
    return { categories: [], tracks: [] };
  }
}

export default async function AdminMusicPage() {
  const { categories, tracks } = await fetchMusicData();

  return <MusicManager categories={categories} tracks={tracks} />;
}
