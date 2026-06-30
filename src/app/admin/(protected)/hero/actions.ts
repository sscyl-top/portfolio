"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const heroVideoSchema = z.object({
  mainVideoMediaId: z.string().uuid().nullable(),
  sideCard1MediaId: z.string().uuid().nullable(),
  sideCard2MediaId: z.string().uuid().nullable(),
  sideCard3MediaId: z.string().uuid().nullable(),
});

type HeroVideoSettings = z.infer<typeof heroVideoSchema>;

// site_settings 表中 hero 视频列名与表单字段的映射
const HERO_VIDEO_COLUMNS: Record<keyof HeroVideoSettings, string> = {
  mainVideoMediaId: "hero_main_video_media_id",
  sideCard1MediaId: "hero_side1_video_media_id",
  sideCard2MediaId: "hero_side2_video_media_id",
  sideCard3MediaId: "hero_side3_video_media_id",
};

export async function saveHeroVideos(formData: FormData) {
  const toUuid = (value: FormDataEntryValue | null): string | null => {
    const str = String(value ?? "").trim();
    return str || null;
  };

  const parsed = heroVideoSchema.safeParse({
    mainVideoMediaId: toUuid(formData.get("mainVideoMediaId")),
    sideCard1MediaId: toUuid(formData.get("sideCard1MediaId")),
    sideCard2MediaId: toUuid(formData.get("sideCard2MediaId")),
    sideCard3MediaId: toUuid(formData.get("sideCard3MediaId")),
  });

  if (!parsed.success) {
    console.error("Hero video validation failed:", parsed.error);
    return;
  }

  const { client } = await requireAdmin();
  const serviceClient = createSupabaseServiceClient();

  // 写入 site_settings 表（前台读取的数据源）
  const siteSettingsUpdate: Record<string, string | null> = {};
  for (const [formKey, column] of Object.entries(HERO_VIDEO_COLUMNS)) {
    siteSettingsUpdate[column] = parsed.data[formKey as keyof HeroVideoSettings];
  }

  const { error: settingsError } = await client
    .from("site_settings")
    .upsert(
      { id: true, ...siteSettingsUpdate },
      { onConflict: "id" },
    );

  if (settingsError) {
    console.error("[Hero] site_settings save failed:", settingsError.message);
    // 不 return，继续写 text_content 后备
  }

  // 同时写入 text_content 作为后备存储（与 settings/actions.ts 一致）
  const now = new Date().toISOString();
  const textRows = Object.entries(HERO_VIDEO_COLUMNS).map(([, column]) => ({
    key: column,
    content: siteSettingsUpdate[column] ?? "",
    page: "site_settings",
    section: "settings",
    sort_order: 0,
    is_active: true,
    deleted_at: null,
    updated_at: now,
  }));

  const { error: textError } = await serviceClient
    .from("text_content")
    .upsert(textRows, { onConflict: "key" });

  if (textError) {
    console.error("[Hero] text_content save failed:", textError.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/hero");
  redirect(`/admin/hero?toast=${encodeURIComponent("Hero配置保存成功")}`);
}

export async function getHeroVideoConfig(): Promise<HeroVideoSettings | null> {
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();

    // 优先从 site_settings 读取（前台渲染的数据源）
    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("hero_main_video_media_id,hero_side1_video_media_id,hero_side2_video_media_id,hero_side3_video_media_id")
      .single();

    if (settingsData) {
      return {
        mainVideoMediaId: settingsData.hero_main_video_media_id ?? null,
        sideCard1MediaId: settingsData.hero_side1_video_media_id ?? null,
        sideCard2MediaId: settingsData.hero_side2_video_media_id ?? null,
        sideCard3MediaId: settingsData.hero_side3_video_media_id ?? null,
      };
    }

    // 后备：从 text_content 读取
    const { data: textData } = await supabase
      .from("text_content")
      .select("key,content")
      .in("key", Object.values(HERO_VIDEO_COLUMNS))
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!textData || textData.length === 0) return null;

    const textMap = new Map(textData.map((item) => [item.key, item.content]));
    const getValue = (column: string): string | null => {
      const val = (textMap.get(column) ?? "").trim();
      return val || null;
    };

    return {
      mainVideoMediaId: getValue(HERO_VIDEO_COLUMNS.mainVideoMediaId),
      sideCard1MediaId: getValue(HERO_VIDEO_COLUMNS.sideCard1MediaId),
      sideCard2MediaId: getValue(HERO_VIDEO_COLUMNS.sideCard2MediaId),
      sideCard3MediaId: getValue(HERO_VIDEO_COLUMNS.sideCard3MediaId),
    };
  } catch {
    return null;
  }
}
