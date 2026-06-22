import { CapabilityBands } from "@/components/home/CapabilityBands";
import { HeroShowcase, type HeroData } from "@/components/home/HeroShowcase";
import { resume as staticResume } from "@/data/portfolio";
import { getBackendReadiness } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const data = await getHomeData();

  return (
    <main>
      <HeroShowcase data={data.hero} />
      <CapabilityBands strengths={data.strengths} />
    </main>
  );
}

async function getHomeData() {
  try {
    const readiness = getBackendReadiness();
    if (!readiness.supabase) throw new Error("Supabase not configured");

    const supabase = await createSupabaseServerClient();
    const { data: resumeRow } = await supabase
      .from("resumes")
      .select("positioning,strengths")
      .single();

    if (!resumeRow) throw new Error("No resume data");

    return {
      hero: {
        positioning: (resumeRow.positioning as string) || staticResume.positioning,
        downloadsPdf: staticResume.downloads.pdf,
      } satisfies HeroData,
      strengths: Array.isArray(resumeRow.strengths) && (resumeRow.strengths as string[]).length > 0
        ? (resumeRow.strengths as string[])
        : staticResume.strengths,
    };
  } catch {
    return {
      hero: {
        positioning: staticResume.positioning,
        downloadsPdf: staticResume.downloads.pdf,
      } satisfies HeroData,
      strengths: staticResume.strengths,
    };
  }
}
