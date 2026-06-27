"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runCtaTransformMigration, runHeroVideosMigration, runTickerLogosMigration } from "@/lib/cms/migrations";

const uuidOrNull = (val: FormDataEntryValue | null) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  return str;
};

export async function saveSiteSettings(formData: FormData) {
  await requireAdmin();

  const labels = formData.getAll("social_label").map(String);
  const urls = formData.getAll("social_url").map(String);
  const social_links = labels
    .map((label, index) => ({ label: label.trim(), url: (urls[index] ?? "").trim() }))
    .filter((link) => link.label && link.url);

  const updateData: Record<string, unknown> = {
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
    cta_ticker_logo_media_ids: (() => {
      const raw = String(formData.get("cta_ticker_logo_media_ids") ?? "").trim();
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(",");
    })(),
    social_links,
  };

  const cta_card_scale = Number(formData.get("cta_card_scale") ?? 1);
  const cta_card_offset_x = Number(formData.get("cta_card_offset_x") ?? 0);
  const cta_card_offset_y = Number(formData.get("cta_card_offset_y") ?? 0);
  const cta_figure_scale = Number(formData.get("cta_figure_scale") ?? 1);
  const cta_figure_offset_x = Number(formData.get("cta_figure_offset_x") ?? 0);
  const cta_figure_offset_y = Number(formData.get("cta_figure_offset_y") ?? 0);

  updateData.cta_card_scale = isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale));
  updateData.cta_card_offset_x = isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x));
  updateData.cta_card_offset_y = isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y));
  updateData.cta_figure_scale = isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale));
  updateData.cta_figure_offset_x = isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x));
  updateData.cta_figure_offset_y = isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y));

  updateData.hero_main_video_media_id = uuidOrNull(formData.get("hero_main_video_media_id"));
  updateData.hero_side1_video_media_id = uuidOrNull(formData.get("hero_side1_video_media_id"));
  updateData.hero_side2_video_media_id = uuidOrNull(formData.get("hero_side2_video_media_id"));
  updateData.hero_side3_video_media_id = uuidOrNull(formData.get("hero_side3_video_media_id"));

  await runHeroVideosMigration().catch(() => {});
  await runCtaTransformMigration().catch(() => {});
  await runTickerLogosMigration().catch(() => {});

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const serviceClient = createSupabaseServiceClient();

  let upsertResult = await serviceClient.from("site_settings").upsert(updateData, { onConflict: "id" });

  if (upsertResult.error && /column .* does not exist/i.test(upsertResult.error.message)) {
    console.warn("[Settings] Schema cache not ready, waiting and retrying...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    upsertResult = await serviceClient.from("site_settings").upsert(updateData, { onConflict: "id" });
  }

  const { error } = upsertResult;

  if (error) {
    console.error("[Settings] Failed to save site settings:", error.message);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${error.message}`)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}`);
}
