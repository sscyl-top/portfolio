"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { runHeroVideosMigration, runCtaTransformMigration, runCenterLogoMigration, runNameMediaMigration, runCtaFigureLightMigration } from "@/lib/cms/migrations";

const uuidOrNull = (val: FormDataEntryValue | null) => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  return str;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isSchemaCacheError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("schema") || lower.includes("column") || lower.includes("does not exist");
}

async function upsertTextContent(
  serviceClient: ReturnType<typeof createSupabaseServiceClient>,
  key: string,
  content: string,
) {
  // 使用 upsert 避免 select+update/insert 的两次数据库往返
  const { error } = await serviceClient
    .from("text_content")
    .upsert(
      {
        key,
        content,
        page: "site_settings",
        section: "settings",
        sort_order: 0,
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) {
    console.error(`[Settings] Failed to upsert text_content ${key}:`, error.message);
    throw error;
  }
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
  const cta_ticker_logo_scale = Number(formData.get("cta_ticker_logo_scale") ?? 1);
  const cta_ticker_logo_offset_x = Number(formData.get("cta_ticker_logo_offset_x") ?? 0);
  const cta_ticker_logo_offset_y = Number(formData.get("cta_ticker_logo_offset_y") ?? 0);
  const cta_center_logo_scale = Number(formData.get("cta_center_logo_scale") ?? 1);
  const cta_center_logo_offset_x = Number(formData.get("cta_center_logo_offset_x") ?? 0);
  const cta_center_logo_offset_y = Number(formData.get("cta_center_logo_offset_y") ?? 0);

  const tickerLogoIdsRaw = String(formData.get("cta_ticker_logo_media_ids") ?? "").trim();
  const ctaTickerLogoMediaIds = tickerLogoIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(",");

  const serviceClient = createSupabaseServiceClient();

  const saveData: Record<string, unknown> = {
    id: true,
    name: String(formData.get("name") ?? "").trim(),
    nickname: String(formData.get("nickname") ?? "").trim(),
    default_theme: formData.get("default_theme"),
    font_preset: String(formData.get("font_preset") ?? "default").trim(),
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
    social_links,
  };

  // 写入所有已知的 media_id 字段；如果列在 PostgREST schema cache 中还不可见，
  // 下面的 upsert 会报 schema cache 错误，重试逻辑会等待并再次执行 migration 后重试。
  const mediaIdFields = [
    "logo_media_id",
    "name_media_id",
    "avatar_media_id",
    "share_media_id",
    "cta_card_media_id",
    "cta_figure_media_id",
    "cta_figure_light_media_id",
    "cta_ticker_logo_media_id",
    "cta_center_logo_media_id",
    "hero_main_video_media_id",
    "hero_side1_video_media_id",
    "hero_side2_video_media_id",
    "hero_side3_video_media_id",
  ];
  for (const field of mediaIdFields) {
    saveData[field] = uuidOrNull(formData.get(field));
  }

  const ctaTransformValues: Record<string, number> = {
    cta_card_scale: isNaN(cta_card_scale) ? 1 : Math.min(5, Math.max(0.1, cta_card_scale)),
    cta_card_offset_x: isNaN(cta_card_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_x)),
    cta_card_offset_y: isNaN(cta_card_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_card_offset_y)),
    cta_figure_scale: isNaN(cta_figure_scale) ? 1 : Math.min(5, Math.max(0.1, cta_figure_scale)),
    cta_figure_offset_x: isNaN(cta_figure_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_x)),
    cta_figure_offset_y: isNaN(cta_figure_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_figure_offset_y)),
    cta_ticker_logo_scale: isNaN(cta_ticker_logo_scale) ? 1 : Math.min(5, Math.max(0.1, cta_ticker_logo_scale)),
    cta_ticker_logo_offset_x: isNaN(cta_ticker_logo_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_ticker_logo_offset_x)),
    cta_ticker_logo_offset_y: isNaN(cta_ticker_logo_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_ticker_logo_offset_y)),
    cta_center_logo_scale: isNaN(cta_center_logo_scale) ? 1 : Math.min(5, Math.max(0.1, cta_center_logo_scale)),
    cta_center_logo_offset_x: isNaN(cta_center_logo_offset_x) ? 0 : Math.min(500, Math.max(-500, cta_center_logo_offset_x)),
    cta_center_logo_offset_y: isNaN(cta_center_logo_offset_y) ? 0 : Math.min(500, Math.max(-500, cta_center_logo_offset_y)),
  };

  let saveError: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await serviceClient.from("site_settings").upsert(saveData, { onConflict: "id" });
    if (!error) {
      console.log(`[Settings] site_settings saved successfully (attempt ${attempt + 1})`);
      saveError = null;
      break;
    }
    saveError = error.message;
    console.warn(`[Settings] site_settings save attempt ${attempt + 1} failed:`, error.message);
    if (isSchemaCacheError(error.message) && attempt < 7) {
      // 遇到 schema cache 错误时，重新执行 migrations（确保新列已创建），等待更久后重试
      await runHeroVideosMigration().catch(() => {});
      await runCtaTransformMigration().catch(() => {});
      await runCenterLogoMigration().catch(() => {});
      await runNameMediaMigration().catch(() => {});
      await runCtaFigureLightMigration().catch(() => {});
      await wait(2500);
      continue;
    }
    break;
  }

  if (saveError) {
    console.error("[Settings] site_settings save failed after retries:", saveError);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败: ${saveError}`)}`);
  }

  try {
    // 并行写入所有 text_content 记录
    const ctaFigureLightMediaId = uuidOrNull(formData.get("cta_figure_light_media_id"));
    await Promise.all([
      ...Object.entries(ctaTransformValues).map(([key, value]) =>
        upsertTextContent(serviceClient, key, String(value))
      ),
      upsertTextContent(serviceClient, "cta_ticker_logo_media_ids", ctaTickerLogoMediaIds),
      upsertTextContent(serviceClient, "cta_figure_light_media_id", ctaFigureLightMediaId ?? ""),
    ]);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Settings] text_content save failed:", errMsg);
    redirect(`/admin/settings?toast=${encodeURIComponent(`保存失败(text_content): ${errMsg}`)}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/works");
  redirect(`/admin/settings?toast=${encodeURIComponent("设置保存成功")}`);
}
