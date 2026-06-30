import { resume as staticResume } from "@/data/portfolio";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBackendReadiness } from "@/lib/supabase/config";

export type ResumeExperience = {
  company: string;
  title: string;
  period: string;
  points: string[];
};

export type ResumeCampus = {
  company: string;
  title: string;
  period: string;
  description: string;
};

export type ResumeAchievement = {
  label: string;
  value: string;
  detail?: string;
};

export type ResumeActivity = {
  period: string;
  title: string;
  description: string;
};

export type ResumeEducation = {
  school: string;
  schoolEnglish: string;
  major: string;
  majorEnglish: string;
  period: string;
  note: string;
  achievements: ResumeAchievement[];
  activities: ResumeActivity[];
};

export type ResumeExpertise = {
  title: string;
  items: string[];
};

export type ResumeDownloads = {
  pdf: string;
  jpg: string;
};

export type ResumeContact = {
  email: string;
  phone: string;
};

export type ResumeData = {
  name: string;
  alias: string;
  role: string;
  positioning: string;
  location: string;
  contact: ResumeContact;
  strengths: string[];
  highlights: string[];
  expertise: ResumeExpertise[];
  experience: ResumeExperience[];
  campus: ResumeCampus[];
  education: ResumeEducation;
  services: string[];
  downloads: ResumeDownloads;
};

export type ResumeRow = {
  name: string;
  alias: string;
  role: string;
  positioning: string;
  location: string;
  email: string;
  phone: string;
  wechat_id: string;
  strengths: string[];
  highlights: string[];
  expertise: ResumeExpertise[];
  experience: ResumeExperience[];
  campus: ResumeCampus[];
  education: ResumeEducation;
  services: string[];
  downloads: ResumeDownloads;
};

export const defaultResumeData: ResumeData = {
  ...staticResume,
  contact: staticResume.contact,
  highlights: staticResume.highlights,
  expertise: staticResume.expertise,
  experience: staticResume.experience,
  campus: staticResume.campus,
  education: staticResume.education,
  services: staticResume.services,
  downloads: staticResume.downloads,
};

export function hasEncodingCorruption(strings: unknown): boolean {
  if (!Array.isArray(strings)) return true;
  return strings.some((s: unknown) => {
    if (typeof s !== "string" || s.length === 0) return true;
    const questionMarkRatio = (s.match(/\?/g) ?? []).length / s.length;
    if (questionMarkRatio > 0.3) return true;
    const hasCjk = /[\u4e00-\u9fff]/.test(s);
    return !hasCjk && s.length > 10;
  });
}

export async function getResumeData(): Promise<ResumeData> {
  try {
    const readiness = getBackendReadiness();
    if (!readiness.cms) throw new Error("CMS not available");

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("resumes")
      .select(
        "name,alias,role,positioning,location,email,phone,wechat_id,strengths,highlights,expertise,experience,campus,education,services,downloads",
      )
      .single();

    if (!data) return defaultResumeData;

    const row = data as ResumeRow;
    return {
      ...defaultResumeData,
      name: row.name || defaultResumeData.name,
      alias: row.alias || defaultResumeData.alias,
      role: row.role || defaultResumeData.role,
      positioning: row.positioning || defaultResumeData.positioning,
      location: row.location || defaultResumeData.location,
      contact: {
        email: row.email || defaultResumeData.contact.email,
        phone: row.phone || defaultResumeData.contact.phone,
      },
      strengths:
        Array.isArray(row.strengths) &&
        row.strengths.length > 0 &&
        !hasEncodingCorruption(row.strengths)
          ? row.strengths
          : defaultResumeData.strengths,
      highlights:
        Array.isArray(row.highlights) && row.highlights.length > 0
          ? row.highlights
          : defaultResumeData.highlights,
      expertise:
        Array.isArray(row.expertise) && row.expertise.length > 0
          ? row.expertise
          : defaultResumeData.expertise,
      experience:
        Array.isArray(row.experience) && row.experience.length > 0
          ? row.experience
          : defaultResumeData.experience,
      campus:
        Array.isArray(row.campus) && row.campus.length > 0
          ? row.campus
          : defaultResumeData.campus,
      education:
        row.education && typeof row.education === "object"
          ? { ...defaultResumeData.education, ...(row.education as object) }
          : defaultResumeData.education,
      services:
        Array.isArray(row.services) && row.services.length > 0
          ? row.services
          : defaultResumeData.services,
      downloads:
        row.downloads && typeof row.downloads === "object"
          ? { ...defaultResumeData.downloads, ...(row.downloads as object) }
          : defaultResumeData.downloads,
    };
  } catch {
    return defaultResumeData;
  }
}
