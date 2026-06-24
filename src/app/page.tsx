import { HeroShowcase, type HeroData, type HeroTextOverrides } from "@/components/home/HeroShowcase";
import { CapabilityBands } from "@/components/home/CapabilityBands.client";
import { resume as staticResume } from "@/data/portfolio";
import { getBackendReadiness } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPublicMediaUrl } from "@/lib/cms/media-url";
import {
  getTextContentsByKeys,
  parseTextContentArray,
} from "@/lib/cms/text-content";
import type { CapabilityTextOverrides } from "@/components/home/CapabilityBands";

type HeroVideoSettings = {
  mainVideoMediaId?: string | null;
  sideCard1MediaId?: string | null;
  sideCard2MediaId?: string | null;
  sideCard3MediaId?: string | null;
};

type PageModule = {
  id: string;
  type: string;
  settings: Record<string, unknown>;
};

type MediaAssetRow = {
  id: string;
  storage_key: string;
};

export default async function Home() {
  const data = await getHomeData();

  return (
    <main>
      <HeroShowcase data={data.hero} />
      <CapabilityBands strengths={data.strengths} textOverrides={data.textOverrides} />
    </main>
  );
}

const HOME_TEXT_KEYS = [
  "hero.title.desktop",
  "hero.title.mobile",
  "hero.experience",
  "home.hero.ticker",
  "contact.invitation",
  "cta.works",
  "cta.resume",
  "cta.hiring",
  "footer.copyright",
  "home.strengths.title",
];

function pickText(
  texts: Record<string, { content: string; styles: Record<string, string> }>,
  key: string,
): string | undefined {
  const content = texts[key]?.content;
  // getTextContentsByKeys falls back to the key itself when a record is missing,
  // so treat the key value as "not configured" and keep component defaults.
  if (!content || content === key) return undefined;
  return content;
}

function pickTextArray(
  texts: Record<string, { content: string; styles: Record<string, string> }>,
  key: string,
): string[] | undefined {
  const content = texts[key]?.content;
  if (!content || content === key) return undefined;
  const arr = parseTextContentArray(content);
  return arr.length > 0 ? arr : undefined;
}

function buildHeroTextOverrides(
  texts: Record<string, { content: string; styles: Record<string, string> }>,
): HeroTextOverrides {
  return {
    desktopTitle: pickText(texts, "hero.title.desktop"),
    mobileTitle: pickText(texts, "hero.title.mobile"),
    experienceLabel: pickText(texts, "hero.experience"),
    tickerItems: pickTextArray(texts, "home.hero.ticker"),
  };
}

function buildCapabilityTextOverrides(
  texts: Record<string, { content: string; styles: Record<string, string> }>,
): CapabilityTextOverrides {
  return {
    strengthsTitle: pickText(texts, "home.strengths.title"),
    contactInvitation: pickText(texts, "contact.invitation"),
    ctaWorks: pickText(texts, "cta.works"),
    ctaResume: pickText(texts, "cta.resume"),
    ctaHiring: pickText(texts, "cta.hiring"),
    footerCopyright: pickText(texts, "footer.copyright"),
  };
}

async function getHomeData() {
  try {
    const readiness = getBackendReadiness();
    if (!readiness.supabase) throw new Error("Supabase not configured");

    const supabase = await createSupabaseServerClient();

    // Fetch resume data, hero video config, and global text overrides in parallel
    const [resumeResult, pageResult, texts] = await Promise.all([
      supabase
        .from("resumes")
        .select("positioning,strengths")
        .single(),
      supabase
        .from("pages")
        .select("modules")
        .eq("slug", "home")
        .single(),
      getTextContentsByKeys(HOME_TEXT_KEYS),
    ]);

    const resumeRow = resumeResult.data;
    if (!resumeRow) throw new Error("No resume data");

    // Extract hero video config from page modules
    const heroSettings = extractHeroSettings(pageResult.data?.modules);

    // Resolve media IDs to public URLs
    const heroVideoUrls = await resolveHeroVideoUrls(supabase, heroSettings);

    return {
      hero: {
        positioning: (resumeRow.positioning as string) || staticResume.positioning,
        downloadsPdf: staticResume.downloads.pdf,
        textOverrides: buildHeroTextOverrides(texts),
        ...heroVideoUrls,
      } satisfies HeroData,
      strengths: Array.isArray(resumeRow.strengths) && (resumeRow.strengths as string[]).length > 0
        ? (resumeRow.strengths as string[])
        : staticResume.strengths,
      textOverrides: buildCapabilityTextOverrides(texts),
    };
  } catch {
    return {
      hero: {
        positioning: staticResume.positioning,
        downloadsPdf: staticResume.downloads.pdf,
      } satisfies HeroData,
      strengths: staticResume.strengths,
      textOverrides: buildCapabilityTextOverrides({}),
    };
  }
}

function extractHeroSettings(modules: unknown): HeroVideoSettings | null {
  if (!Array.isArray(modules)) return null;

  const heroModule = (modules as PageModule[]).find(
    (m) => m.id === "hero-videos",
  );

  if (!heroModule) return null;

  return heroModule.settings as HeroVideoSettings;
}

async function resolveHeroVideoUrls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  settings: HeroVideoSettings | null,
): Promise<Partial<HeroData>> {
  if (!settings) return {};

  const mediaIds = [
    settings.mainVideoMediaId,
    settings.sideCard1MediaId,
    settings.sideCard2MediaId,
    settings.sideCard3MediaId,
  ].filter((id): id is string => Boolean(id));

  if (mediaIds.length === 0) return {};

  const { data: mediaRows } = await supabase
    .from("media_assets")
    .select("id,storage_key")
    .in("id", mediaIds);

  const mediaMap = new Map<string, string>(
    ((mediaRows ?? []) as MediaAssetRow[]).map((m) => [
      m.id,
      buildPublicMediaUrl(m.storage_key),
    ]),
  );

  return {
    mainVideoUrl: settings.mainVideoMediaId
      ? mediaMap.get(settings.mainVideoMediaId)
      : undefined,
    sideCard1VideoUrl: settings.sideCard1MediaId
      ? mediaMap.get(settings.sideCard1MediaId)
      : undefined,
    sideCard2VideoUrl: settings.sideCard2MediaId
      ? mediaMap.get(settings.sideCard2MediaId)
      : undefined,
    sideCard3VideoUrl: settings.sideCard3MediaId
      ? mediaMap.get(settings.sideCard3MediaId)
      : undefined,
  };
}
