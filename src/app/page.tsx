import type { Metadata } from "next";
import { HeroShowcase, type HeroData, type HeroTextOverrides } from "@/components/home/HeroShowcase";
import { CapabilityBands } from "@/components/home/CapabilityBands.client";
import { resume as staticResume } from "@/data/portfolio";
import { getBackendReadiness } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getTextContentsByKeys,
  parseTextContentArray,
} from "@/lib/cms/text-content";
import type { CapabilityTextOverrides } from "@/components/home/CapabilityBands";
import { createServerCmsRepository } from "@/lib/cms/repository";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "sscyl.top-首页",
};

export default async function Home() {
  const data = await getHomeData();

  return (
    <main className="home-dark-scope">
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
    kicker: pickText(texts, "hero.kicker"),
    experienceLabel: pickText(texts, "hero.experience"),
    experienceYears: pickText(texts, "hero.experience.years"),
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

    const repo = await createServerCmsRepository();
    const supabase = await createSupabaseServerClient();

    const [resumeResult, siteSettings, texts] = await Promise.all([
      supabase
        .from("resumes")
        .select("positioning,strengths")
        .single(),
      repo.getSiteSettings(),
      getTextContentsByKeys(HOME_TEXT_KEYS),
    ]);

    const resumeRow = resumeResult.data;

    return {
      hero: {
        positioning: (resumeRow?.positioning as string) || staticResume.positioning,
        downloadsPdf: staticResume.downloads.pdf,
        textOverrides: buildHeroTextOverrides(texts),
        mainVideoUrl: siteSettings.heroMainVideoUrl,
        sideCard1VideoUrl: siteSettings.heroSide1VideoUrl,
        sideCard2VideoUrl: siteSettings.heroSide2VideoUrl,
        sideCard3VideoUrl: siteSettings.heroSide3VideoUrl,
      } satisfies HeroData,
      strengths: Array.isArray(resumeRow?.strengths) && (resumeRow?.strengths as string[]).length > 0
        ? (resumeRow!.strengths as string[])
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
