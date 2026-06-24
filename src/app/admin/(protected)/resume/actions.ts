"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-session";

const resumeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  alias: z.string().trim().max(120),
  role: z.string().trim().max(120),
  positioning: z.string().trim().max(500),
  location: z.string().trim().max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(30),
  zcool_url: z.string().trim().max(200),
  wechat_id: z.string().trim().max(60),
});

const experienceSchema = z.object({
  company: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  period: z.string().trim().min(1).max(80),
  points: z.array(z.string().trim().min(1)).default([]),
});

const campusSchema = z.object({
  company: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  period: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1000),
});

const achievementSchema = z.object({
  label: z.string().trim().max(80),
  value: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(120).optional(),
});

const activitySchema = z.object({
  period: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
});

const educationSchema = z.object({
  school: z.string().trim().min(1).max(120),
  schoolEnglish: z.string().trim().max(120),
  major: z.string().trim().min(1).max(120),
  majorEnglish: z.string().trim().max(120),
  period: z.string().trim().min(1).max(80),
  note: z.string().trim().max(500),
  achievements: z.array(achievementSchema).default([]),
  activities: z.array(activitySchema).default([]),
});

const expertiseSchema = z.object({
  title: z.string().trim().min(1).max(80),
  items: z.array(z.string().trim().min(1)).default([]),
});

const downloadsSchema = z.object({
  pdf: z.string().trim().max(200),
  jpg: z.string().trim().max(200),
});

function collectIndexedArray(formData: FormData, prefix: string): string[] {
  const values: string[] = [];
  let index = 0;
  while (true) {
    const value = formData.get(`${prefix}_${index}`);
    if (value === null) break;
    values.push(String(value));
    index++;
  }
  return values;
}

function collectGroupArray(formData: FormData, groupPrefix: string): string[][] {
  const groups: string[][] = [];
  let index = 0;
  while (true) {
    const items = formData
      .getAll(`${groupPrefix}_${index}`)
      .map(String)
      .filter((s) => s.trim());
    if (items.length === 0) break;
    groups.push(items);
    index++;
  }
  return groups;
}

export async function saveResume(formData: FormData) {
  const parsed = resumeSchema.safeParse({
    name: formData.get("name"),
    alias: formData.get("alias") ?? "",
    role: formData.get("role"),
    positioning: formData.get("positioning") ?? "",
    location: formData.get("location") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    zcool_url: formData.get("zcool_url") ?? "",
    wechat_id: formData.get("wechat_id") ?? "",
  });

  if (!parsed.success) {
    return { success: false, error: "基本信息校验失败", details: parsed.error.flatten() };
  }

  const strengths = formData
    .getAll("strength")
    .map(String)
    .filter((s) => s.trim());
  const highlights = formData
    .getAll("highlight")
    .map(String)
    .filter((s) => s.trim());
  const services = formData
    .getAll("service")
    .map(String)
    .filter((s) => s.trim());

  const experienceCompanies = formData.getAll("experience_company").map(String);
  const experienceTitles = formData.getAll("experience_title").map(String);
  const experiencePeriods = formData.getAll("experience_period").map(String);
  const experiencePointsGroups = collectGroupArray(formData, "experience_points");
  const experienceRaw = experienceCompanies
    .map((company, i) => ({
      company,
      title: experienceTitles[i] ?? "",
      period: experiencePeriods[i] ?? "",
      points: experiencePointsGroups[i] ?? [],
    }))
    .filter((item) => item.company.trim() && item.title.trim());

  // safeParse — 不再抛出未捕获异常
  const experience = experienceRaw
    .map((item) => experienceSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);

  const campusCompanies = formData.getAll("campus_company").map(String);
  const campusTitles = formData.getAll("campus_title").map(String);
  const campusPeriods = formData.getAll("campus_period").map(String);
  const campusDescriptions = formData.getAll("campus_description").map(String);
  const campusRaw = campusCompanies
    .map((company, i) => ({
      company,
      title: campusTitles[i] ?? "",
      period: campusPeriods[i] ?? "",
      description: campusDescriptions[i] ?? "",
    }))
    .filter((item) => item.company.trim() && item.title.trim());

  const campus = campusRaw
    .map((item) => campusSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);

  const expertiseTitles = formData.getAll("expertise_title").map(String);
  const expertiseItemsGroups = collectGroupArray(formData, "expertise_items");
  const expertiseRaw = expertiseTitles
    .map((title, i) => ({
      title,
      items: expertiseItemsGroups[i] ?? [],
    }))
    .filter((item) => item.title.trim());

  const expertise = expertiseRaw
    .map((item) => expertiseSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);

  const achievementLabels = formData.getAll("achievement_label").map(String);
  const achievementValues = formData.getAll("achievement_value").map(String);
  const achievementDetails = formData.getAll("achievement_detail").map(String);
  const achievementsRaw = achievementValues
    .map((value, i) => ({
      label: achievementLabels[i] ?? "",
      value,
      detail: achievementDetails[i] || undefined,
    }))
    .filter((item) => item.value.trim());

  const achievements = achievementsRaw
    .map((item) => achievementSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);

  const activityPeriods = formData.getAll("activity_period").map(String);
  const activityTitles = formData.getAll("activity_title").map(String);
  const activityDescriptions = formData.getAll("activity_description").map(String);
  const activitiesRaw = activityPeriods
    .map((period, i) => ({
      period,
      title: activityTitles[i] ?? "",
      description: activityDescriptions[i] ?? "",
    }))
    .filter((item) => item.period.trim() && item.title.trim());

  const activities = activitiesRaw
    .map((item) => activitySchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);

  // education 用 safeParse 替代 parse，避免 ZodError 未捕获
  const eduResult = educationSchema.safeParse({
    school: formData.get("education_school"),
    schoolEnglish: formData.get("education_schoolEnglish") ?? "",
    major: formData.get("education_major"),
    majorEnglish: formData.get("education_majorEnglish") ?? "",
    period: formData.get("education_period") ?? "",
    note: formData.get("education_note") ?? "",
    achievements,
    activities,
  });

  if (!eduResult.success) {
    return { success: false, error: "教育背景校验失败", details: eduResult.error.flatten() };
  }

  const dlResult = downloadsSchema.safeParse({
    pdf: formData.get("download_pdf") ?? "",
    jpg: formData.get("download_jpg") ?? "",
  });

  if (!dlResult.success) {
    return { success: false, error: "下载链接校验失败", details: dlResult.error.flatten() };
  }

  try {
    const { client } = await requireAdmin();

    const upsertPayload: Record<string, unknown> = {
      id: true,
      ...parsed.data,
      strengths,
      highlights,
      expertise,
      experience,
      campus,
      education: eduResult.data,
      services,
      downloads: dlResult.data,
    };

    const { error } = await client.from("resumes").upsert(upsertPayload as Record<string, unknown>);

    if (error) {
      return { success: false, error: error.message, code: error.code, hint: error.hint };
    }
  } catch (authErr) {
    return { success: false, error: `管理员鉴权失败: ${authErr instanceof Error ? authErr.message : String(authErr)}` };
  }

  revalidatePath("/");
  revalidatePath("/resume");
  revalidatePath("/admin/resume");

  return { success: true };
}
