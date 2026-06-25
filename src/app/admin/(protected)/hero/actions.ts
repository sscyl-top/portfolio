"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const heroVideoSchema = z.object({
  mainVideoMediaId: z.string().uuid().nullable(),
  sideCard1MediaId: z.string().uuid().nullable(),
  sideCard2MediaId: z.string().uuid().nullable(),
  sideCard3MediaId: z.string().uuid().nullable(),
});

type HeroVideoSettings = z.infer<typeof heroVideoSchema>;

type PageModule = {
  id: string;
  type: string;
  sort_order: number;
  is_visible: boolean;
  settings: Record<string, unknown>;
};

const HERO_MODULE_ID = "hero-videos";
const HERO_MODULE_TYPE = "hero_videos";

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

  const { data: existing } = await client
    .from("pages")
    .select("slug,title,modules,seo_title,seo_description")
    .eq("slug", "home")
    .single();

  const existingModules = (existing?.modules as PageModule[] | null) ?? [];
  const filteredModules = existingModules.filter(
    (m) => m.id !== HERO_MODULE_ID,
  );

  const heroModule: PageModule = {
    id: HERO_MODULE_ID,
    type: HERO_MODULE_TYPE,
    sort_order: 0,
    is_visible: true,
    settings: parsed.data,
  };

  const { error } = await client.from("pages").upsert(
    {
      slug: "home",
      title: existing?.title ?? "首页",
      seo_title: existing?.seo_title ?? "首页",
      seo_description: existing?.seo_description ?? "",
      modules: [heroModule, ...filteredModules],
    },
    { onConflict: "slug" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin/hero");
  redirect(`/admin/hero?toast=${encodeURIComponent("Hero配置保存成功")}`);
}

export async function getHeroVideoConfig(): Promise<HeroVideoSettings | null> {
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
      .from("pages")
      .select("modules")
      .eq("slug", "home")
      .single();

    if (!data?.modules) return null;

    const modules = data.modules as PageModule[];
    const heroModule = modules.find((m) => m.id === HERO_MODULE_ID);

    if (!heroModule) return null;

    const settings = heroModule.settings as Partial<HeroVideoSettings>;
    return {
      mainVideoMediaId: settings.mainVideoMediaId ?? null,
      sideCard1MediaId: settings.sideCard1MediaId ?? null,
      sideCard2MediaId: settings.sideCard2MediaId ?? null,
      sideCard3MediaId: settings.sideCard3MediaId ?? null,
    };
  } catch {
    return null;
  }
}
