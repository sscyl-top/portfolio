import type { MetadataRoute } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaticSiteSettings } from "@/data/portfolio";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const staticSettings = getStaticSiteSettings();
  let name = staticSettings.name;
  let nickname = staticSettings.logo;
  let theme: "dark" | "light" | "system" = "dark";
  let iconSrc: string | undefined;

  let iconMimeType: string = "image/png";

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select(
        "name,nickname,default_theme,logo_media:media_assets!site_settings_logo_media_id_fkey(storage_key,mime_type,alt_text)",
      )
      .single();

    if (error) {
      console.warn("[manifest] query failed:", error.message);
    }

    if (data) {
      const row = data as {
        name: string | null;
        nickname: string | null;
        default_theme: "dark" | "light" | "system" | null;
        logo_media:
          | { storage_key: string; mime_type: string; alt_text: string }
          | Array<{ storage_key: string; mime_type: string; alt_text: string }>
          | null;
      };

      name = row.name || name;
      nickname = row.nickname || nickname;
      theme = row.default_theme || theme;

      const media = Array.isArray(row.logo_media)
        ? row.logo_media[0]
        : row.logo_media;
      if (media?.storage_key) {
        iconSrc = buildPublicMediaUrl(media.storage_key);
        iconMimeType = media.mime_type || "image/png";
      }
    }
  }

  const backgroundColor = theme === "light" ? "#ffffff" : "#050505";
  const themeColor = theme === "light" ? "#ffffff" : "#050505";

  const icons: MetadataRoute.Manifest["icons"] = iconSrc
    ? [
        { src: iconSrc, sizes: "192x192", type: iconMimeType },
        { src: iconSrc, sizes: "512x512", type: iconMimeType },
      ]
    : [{ src: "/favicon.ico", sizes: "any" }];

  return {
    name,
    short_name: nickname,
    start_url: "/",
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    icons,
  };
}
