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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const [{ data: categories }, { data: tracks }, { data: medias }] =
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
      ]);

    const mediaMap = new Map<string, MediaRow>();
    (medias ?? []).forEach((m: MediaRow) => mediaMap.set(m.id, m));

    const categoriesWithTracks = ((categories ?? []) as CategoryRow[]).map(
      (cat) => ({
        id: cat.id,
        key: cat.key,
        label: cat.label,
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

    return NextResponse.json({ categories: categoriesWithTracks });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
