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

export async function saveSiteSettings(formData: FormData) {
  await requireAdmin();

  const labels = formData.getAll("social_label").map(String);
  const urls = formData.getAll("social_url").map(String);
  const social_links = labels
    .map((label, index) => ({ label: label.trim(), url: (urls[index] ?? "").trim() }))
    .filter((link) => link.label && link.url);

  // 1. 基础字段数据（一定存在的列）
  const baseUpdateData: Record<string, unknown> = {
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
    social_links,
  };

  // 2. CTA变换字段
  const cta_card_scale = Number(formData.get("cta_card_scale") ?? 1);
  const cta_card_offset_x = Number(formData.get("cta_card_offset_x") ?? 0);
  const cta_card_offset_y = Number(formData.get("cta_card_offset_y") ?? 0);
  const cta_figure_scale = Number(formData.get("cta_figure_scale") ?? 1);
  const cta_figure_offset_x = Number(formData.get("cta_figure_offset_x") ?? 0);
  const cta_figure_offset_y = Number(formData.get("cta_figure_offset_y") ?? 0);

  const ctaTransformData: Record<string, unknown> = {
    id: true,
    cta_card_scale: isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale)),
    cta_card_offset_x: isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x)),
    cta_card_offset_y: isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y)),
    cta_figure_scale: isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale)),
    cta_figure_offset_x: isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x)),
    cta_figure_offset_y: isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y)),
  };

  // 3. Hero视频字段
  const heroVideosData: Record<string, unknown> = {
    id: true,
    hero_main_video_media_id: uuidOrNull(formData.get("hero_main_video_media_id")),
    hero_side1_video_media_id: uuidOrNull(formData.get("hero_side1_video_media_id")),
    hero_side2_video_media_id: uuidOrNull(formData.get("hero_side2_video_media_id")),
    hero_side3_video_media_id: uuidOrNull(formData.get("hero_side3_video_media_id")),
  };

  // 4. Ticker logos字段
  const tickerLogoIdsRaw = String(formData.get("cta_ticker_logo_media_ids") ?? "").trim();
  const tickerLogosData: Record<string, unknown> = {
    id: true,
    cta_ticker_logo_media_ids: tickerLogoIdsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join(","),
  };

  // 先尝试运行迁移
  const heroMigrationOk = await runHeroVideosMigration().catch(() => false);
  const ctaMigrationOk = await runCtaTransformMigration().catch(() => false);
  const tickerMigrationOk = await runTickerLogosMigration().catch(() => false);

  // 等待schema刷新
  await wait(1500);

  const serviceClient = createSupabaseServiceClient();
  let hasError = false;
  let errorMessage = "";

  // 先保存基础字段（必须成功）
  const tryUpsert = async (data: Record<string, unknown>, label: string, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { error } = await serviceClient.from("site_settings").upsert(data, { onConflict: "id" });
      if (!error) {
        console.log(`[Settings] ${label} saved successfully`);
        return true;
      }
      if (/column .* does not exist/i.test(error.message) && attempt < retries) {
        console.warn(`[Settings] ${label} columns not ready, waiting and retrying...`);
        await wait(2000);
        continue;
      }
      console.error(`[Settings] Failed to save ${label}:`, error.message);
      return { error: error.message };
    }
    return false;
  };

  // 保存基础字段
  const baseResult = await tryUpsert(baseUpdateData, "base settings");
  if (baseResult && typeof baseResult === "object" && "error" in baseResult) {
    hasError = true;
    errorMessage = baseResult.error;
  }

  // 只有迁移成功时才尝试保存可选字段
  if (ctaMigrationOk) {
    const ctaResult = await tryUpsert(ctaTransformData, "CTA transform settings");
    if (ctaResult && typeof ctaResult === "object" && "error" in ctaResult) {
      console.warn("[Settings] CTA transform save failed, but base settings saved");
    }
  }

  if (heroMigrationOk) {
    const heroResult = await tryUpsert(heroVideosData, "hero videos settings");
    if (heroResult && typeof heroResult === "object" && "error" in heroResult) {
      console.warn("[Settings] Hero videos save failed, but base settings saved");
    }
  }

  if (tickerMigrationOk) {
    const tickerResult = await tryUpsert(tickerLogosData, "ticker logos settings");
    if (tickerResult && typeof tickerResult === "object" && "error" in tickerResult) {
      console.warn("[Settings] Ticker logos save failed, but base settings saved");
    }
  }

  if (hasError) {
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${errorMessage}`)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}`);
}
