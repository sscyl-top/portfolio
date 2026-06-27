"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runHeroVideosMigration, runTickerLogosMigration } from "@/lib/cms/migrations";

const uuidOrNull = (val: FormDataEntryValue | null) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  return str;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function saveSiteSettings(formData: FormData) {
  await requireAdmin();

  const labels = formData.getAll("social_label").map(String);
  const urls = formData.getAll("social_url").map(String);
  const social_links = labels
    .map((label, index) => ({ label: label.trim(), url: (urls[index] ?? "").trim() }))
    .filter((link) => link.label && link.url);

  const cta_card_scale = Number(formData.get("cta_card_scale") ?? 1);
  const cta_card_offset_x = Number(formData.get("cta_card_offset_x") ?? 0);
  const cta_card_offset_y = Number(formData.get("cta_card_offset_y") ?? 0);
  const cta_figure_scale = Number(formData.get("cta_figure_scale") ?? 1);
  const cta_figure_offset_x = Number(formData.get("cta_figure_offset_x") ?? 0);
  const cta_figure_offset_y = Number(formData.get("cta_figure_offset_y") ?? 0);

  const tickerLogoIdsRaw = String(formData.get("cta_ticker_logo_media_ids") ?? "").trim();

  const baseData: Record<string, unknown> = {
    id: true,
    name: String(formData.get("name") ?? "").trim(),
    nickname: String(formData.get("nickname") ?? "").trim(),
    default_theme: formData.get("default_theme"),
    font_preset: String(formData.get("font_preset") ?? "default").trim(),
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
    logo_media_id: uuidOrNull(formData.get("logo_media_id")),
    avatar_media_id: uuidOrNull(formData.get("avatar_media_id")),
    share_media_id: uuidOrNull(formData.get("share_media_id")),
    cta_card_media_id: uuidOrNull(formData.get("cta_card_media_id")),
    cta_figure_media_id: uuidOrNull(formData.get("cta_figure_media_id")),
    cta_ticker_logo_media_id: uuidOrNull(formData.get("cta_ticker_logo_media_id")),
    hero_main_video_media_id: uuidOrNull(formData.get("hero_main_video_media_id")),
    hero_side1_video_media_id: uuidOrNull(formData.get("hero_side1_video_media_id")),
    hero_side2_video_media_id: uuidOrNull(formData.get("hero_side2_video_media_id")),
    hero_side3_video_media_id: uuidOrNull(formData.get("hero_side3_video_media_id")),
    social_links,
  };

  const tickerLogosData: Record<string, unknown> = {
    id: true,
    cta_ticker_logo_media_ids: tickerLogoIdsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(","),
  };

  const ctaTransformValues: Record<string, number> = {
    cta_card_scale: isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale)),
    cta_card_offset_x: isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x)),
    cta_card_offset_y: isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y)),
    cta_figure_scale: isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale)),
    cta_figure_offset_x: isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x)),
    cta_figure_offset_y: isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y)),
  };

  await runHeroVideosMigration().catch(() => {});
  await runTickerLogosMigration().catch(() => {});

  await wait(1000);

  const serviceClient = createSupabaseServiceClient();

  const { error: baseError } = await serviceClient.from("site_settings").upsert(baseData, { onConflict: "id" });
  if (baseError) {
    console.error("[Settings] base settings save failed:", baseError.message);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${baseError.message}`)}`);
  }
  console.log("[Settings] base settings saved successfully");

  try {
    await serviceClient.from("site_settings").upsert(tickerLogosData, { onConflict: "id" });
  } catch (e) {
    console.warn("[Settings] ticker logos save failed (column may not exist):", e);
  }

  for (const [key, value] of Object.entries(ctaTransformValues)) {
    try {
      const { data: existing } = await serviceClient
        .from("text_content")
        .select("id")
        .eq("key", key)
        .eq("page", "site_settings")
        .limit(1)
        .maybeSingle();

      if (existing) {
        await serviceClient
          .from("text_content")
          .update({ content: String(value), is_active: true, deleted_at: null })
          .eq("id", existing.id);
      } else {
        await serviceClient.from("text_content").insert({
          key,
          content: String(value),
          page: "site_settings",
          sort_order: 0,
          is_active: true,
        });
      }
    } catch (e) {
      console.warn(`[Settings] Failed to save CTA transform ${key}:`, e);
    }
  }
  console.log("[Settings] CTA transform settings saved to text_content successfully");

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}`);
}
