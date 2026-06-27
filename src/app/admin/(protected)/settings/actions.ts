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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isSchemaCacheError = (msg: string) =>
  /column .* does not exist/i.test(msg) || /schema cache/i.test(msg);

async function retryUpsert(
  client: ReturnType<typeof createSupabaseServiceClient>,
  data: Record<string, unknown>,
  label: string,
  maxAttempts = 6,
  delayMs = 3000
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await client.from("site_settings").upsert(data, { onConflict: "id" });
    if (!error) {
      console.log(`[Settings] ${label} saved successfully`);
      return null;
    }
    if (isSchemaCacheError(error.message) && attempt < maxAttempts - 1) {
      console.warn(`[Settings] ${label} schema not ready (attempt ${attempt + 1}/${maxAttempts}), waiting...`);
      await wait(delayMs);
      continue;
    }
    console.error(`[Settings] ${label} save failed:`, error.message);
    return error.message;
  }
  return "schema cache timeout after retries";
}

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

  const ctaTransformData: Record<string, unknown> = {
    id: true,
    cta_card_scale: isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale)),
    cta_card_offset_x: isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x)),
    cta_card_offset_y: isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y)),
    cta_figure_scale: isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale)),
    cta_figure_offset_x: isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x)),
    cta_figure_offset_y: isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y)),
  };

  const tickerLogosData: Record<string, unknown> = {
    id: true,
    cta_ticker_logo_media_ids: tickerLogoIdsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(","),
  };

  await runHeroVideosMigration().catch(() => {});
  await runCtaTransformMigration().catch(() => {});
  await runTickerLogosMigration().catch(() => {});

  await wait(3000);

  const serviceClient = createSupabaseServiceClient();

  const baseError = await retryUpsert(serviceClient, baseData, "base settings", 6, 3000);
  if (baseError) {
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${baseError}`)}`);
  }

  await retryUpsert(serviceClient, ctaTransformData, "CTA transform", 3, 2000);
  await retryUpsert(serviceClient, tickerLogosData, "ticker logos", 3, 2000);

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}`);
}
