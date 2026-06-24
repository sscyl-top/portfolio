import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MusicManager } from "./MusicManager";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
};

type TrackWithMedia = {
  id: string;
  category_id: string;
  title: string;
  sort_order: number;
  media: {
    id: string;
    storage_key: string;
    mime_type: string;
    original_name: string;
  } | null;
};

type TrackRow = {
  id: string;
  category_id: string;
  title: string;
  sort_order: number;
  media_id: string;
};

type MediaRow = {
  id: string;
  storage_key: string;
  mime_type: string;
  original_name: string;
};

export default async function AdminMusicPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: categories }, { data: tracks }, { data: medias }] =
    await Promise.all([
      supabase.from("music_categories").select("*").order("sort_order"),
      supabase
        .from("music_tracks")
        .select("id,category_id,title,sort_order,media_id")
        .order("sort_order"),
      supabase
        .from("media_assets")
        .select("id,storage_key,mime_type,original_name")
        .is("deleted_at", null),
    ]);

  const mediaMap = new Map<string, MediaRow>();
  ((medias ?? []) as MediaRow[]).forEach((m) => mediaMap.set(m.id, m));

  const tracksWithMedia: TrackWithMedia[] = ((tracks ?? []) as TrackRow[]).map(
    (t) => {
      const m = mediaMap.get(t.media_id);
      return {
        id: t.id,
        category_id: t.category_id,
        title: t.title,
        sort_order: t.sort_order,
        media: m
          ? {
              id: m.id,
              storage_key: m.storage_key,
              mime_type: m.mime_type,
              original_name: m.original_name,
            }
          : null,
      };
    },
  );

  return (
    <MusicManager
      categories={((categories ?? []) as CategoryRow[])}
      tracks={tracksWithMedia}
    />
  );
}
