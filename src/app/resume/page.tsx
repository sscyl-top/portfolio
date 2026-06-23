import {
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Trophy,
} from "lucide-react";

import { resume as staticResume } from "@/data/portfolio";
import { ContactFinale } from "@/components/resume/ContactFinale";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBackendReadiness } from "@/lib/supabase/config";

export default async function ResumePage() {
  const resume = await getResumeData();
  return (
    <main className="relative isolate overflow-hidden bg-[#050505]">
      <div className="works-route-blob works-route-blob-a pointer-events-none fixed z-0 h-[980px] w-[980px] rounded-full opacity-62" />
      <div className="works-route-blob works-route-blob-b pointer-events-none fixed z-0 h-[900px] w-[900px] rounded-full opacity-56" />
      <section className="relative min-h-screen overflow-hidden px-4 pb-14 pt-22 md:px-8 md:pt-28">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_22%,rgba(201,162,127,0.12),transparent_26%),radial-gradient(circle_at_78%_48%,rgba(139,215,205,0.1),transparent_30%)]" />
        <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:96px_96px] opacity-20" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-10rem)] max-w-7xl flex-col justify-between">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-2 font-mono text-xs uppercase text-white/45">
              <p>{resume.alias}</p>
              <p>{resume.role}</p>
              <p>Portfolio / Resume 2026</p>
            </div>
            <div className="grid gap-2 text-[13px] text-white/64 md:justify-items-end md:text-sm">
              <a
                className="inline-flex items-center gap-2 transition hover:text-white"
                href={`mailto:${resume.contact.email}`}
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
                {resume.contact.email}
              </a>
              <a
                className="inline-flex items-center gap-2 transition hover:text-white"
                href={`tel:${resume.contact.phone}`}
              >
                <Phone aria-hidden="true" className="h-4 w-4" />
                {resume.contact.phone}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" className="h-4 w-4" />
                {resume.location}
              </span>
            </div>
          </div>

          <div className="py-10 md:-translate-y-14">
            <p className="font-mono text-xs uppercase text-copper sm:text-sm md:text-sm">
              HI, I&apos;M {resume.name}
            </p>
            <h1 className="mt-4 max-w-5xl text-[2.6rem] leading-[0.88] text-white sm:text-5xl md:text-8xl lg:text-9xl">
              BRAND
              <span className="block text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.62)]">
                VISUAL
              </span>
            </h1>
            <div className="mt-5 flex max-w-4xl flex-wrap gap-1.5 md:mt-8 md:gap-2">
              {resume.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 font-mono text-[11px] text-white/56 md:px-4 md:py-2 md:text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6 border-t border-white/10 pt-8 md:-translate-y-16 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-3xl text-[15px] leading-7 text-white/66 md:text-lg md:leading-8">
              我是陈涛涛，一名专注于品牌全链路视觉、商业设计落地与 AIGC 工作流的设计师。当前以求职面试为主，同时保留少量品牌视觉与网页视觉服务合作入口。
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={resume.downloads.pdf}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-medium text-black transition hover:bg-copper md:px-5 md:py-3 md:text-sm"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                下载简历 PDF
              </a>
              <a
                href={resume.downloads.jpg}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-[13px] text-white/72 transition hover:border-white/40 hover:text-white md:px-5 md:py-3 md:text-sm"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                下载简历 JPG
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl space-y-6">
          <ResumeSection title="核心优势" subtitle="Core strengths">
            <div className="space-y-4">
              {resume.strengths.map((strength) => (
                <p
                  key={strength}
                  className="border-t border-white/10 pt-4 leading-8 text-white/66"
                >
                  {strength}
                </p>
              ))}
            </div>
          </ResumeSection>

          <ResumeSection title="社会经历" subtitle="Social experience">
            <div className="space-y-8">
              {resume.experience.map((item) => (
                <article key={item.company} className="border-t border-white/10 pt-6">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-baseline">
                    <h3 className="text-2xl font-semibold text-white">
                      {item.company}
                    </h3>
                    <span className="font-mono text-sm text-white/42">
                      {item.period}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-medium text-cyan/80">
                    {item.title}
                  </p>
                  <ol className="mt-4 space-y-3">
                    {item.points.map((point, index) => (
                      <li
                        key={point}
                        className="grid grid-cols-[2rem_1fr] gap-3 leading-8 text-white/62"
                      >
                        <span className="font-mono text-sm text-copper">
                          {index + 1}.
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </ResumeSection>

          <ResumeSection title="校园经历" subtitle="Campus experience">
            <div className="space-y-6">
              {resume.campus.map((item) => (
                <article key={item.company} className="border-t border-white/10 pt-5">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-baseline">
                    <h3 className="text-xl font-semibold text-white">
                      {item.company} / {item.title}
                    </h3>
                    <span className="font-mono text-sm text-white/42">
                      {item.period}
                    </span>
                  </div>
                  <p className="mt-3 leading-8 text-white/60">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </ResumeSection>

          <ResumeSection
            title="教育背景"
            subtitle="Educational background"
            testId="education-section"
          >
            <div className="border-t border-white/10 pt-4">
              <div
                data-testid="education-school-summary"
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-4 md:items-start"
              >
                <div>
                  <p className="font-mono text-xs uppercase text-white/36">
                    {resume.education.schoolEnglish}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold text-white md:text-2xl">
                    {resume.education.school}
                  </h3>
                </div>
                <div>
                  <p className="font-mono text-xs text-white/38">
                    {resume.education.majorEnglish}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold text-white md:text-2xl">
                    {resume.education.major}
                  </h3>
                </div>
                <span className="font-mono text-sm text-white/42 md:pt-1">
                  {resume.education.period}
                </span>
              </div>

              <div
                data-testid="education-achievement-grid"
                className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
              >
                {resume.education.achievements.map((achievement, index) => (
                  <article
                    key={`${achievement.label}-${achievement.value}`}
                    data-testid="education-achievement"
                    className="flex min-h-[60px] flex-col justify-between rounded-lg border border-white/10 bg-black/20 p-2.5 md:h-20 md:p-3 lg:h-24 lg:p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase text-white/34">
                        {achievement.label}
                      </span>
                      {index === 0 ? (
                        <GraduationCap
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-copper"
                        />
                      ) : (
                        <Trophy
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-copper"
                        />
                      )}
                    </div>
                    <div className="-mt-0.5">
                      <p
                        className={
                          index === 0
                            ? "text-2xl font-semibold leading-none text-copper md:text-3xl"
                            : "text-sm font-medium leading-6 text-white/76"
                        }
                      >
                        {achievement.value}
                      </p>
                      {achievement.detail ? (
                        <p className="mt-0.5 text-[11px] text-white/46">
                          {achievement.detail}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

            </div>
          </ResumeSection>

          <ResumeSection
            title="组织与实践"
            subtitle="Activities"
            testId="education-activities-section"
          >
            <div className="border-t border-white/10">
              {resume.education.activities.map((activity) => (
                <article
                  key={`${activity.period}-${activity.title}`}
                  className="grid gap-1.5 border-b border-white/10 py-3 md:grid-cols-[7.5rem_11rem_1fr] md:gap-5 md:py-4"
                >
                  <p className="font-mono text-xs text-copper">
                    {activity.period}
                  </p>
                  <h3 className="text-sm font-medium text-white/78">
                    {activity.title}
                  </h3>
                  <p className="text-sm leading-6 text-white/52">
                    {activity.description}
                  </p>
                </article>
              ))}
            </div>
          </ResumeSection>

        </div>
      </section>

      <ContactFinale
        email={resume.contact.email}
        phone={resume.contact.phone}
        location={resume.location}
      />
    </main>
  );
}

function ResumeSection({
  title,
  subtitle,
  testId,
  children,
}: {
  title: string;
  subtitle: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      className="grid gap-5 rounded-lg border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[0.35fr_1fr] md:gap-8 md:p-8"
    >
      <div>
        <p className="font-mono text-xs uppercase text-copper">{subtitle}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** 合并 CMS 动态数据与静态简历数据 */
async function getResumeData() {
  try {
    const readiness = getBackendReadiness();
    if (!readiness.cms) throw new Error("CMS not available");

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("resumes")
      .select(
        "name,alias,role,positioning,location,email,phone,zcool_url,wechat_id,strengths",
      )
      .single();

    if (!data) return staticResume;

    // merge: CMS provides basic profile + strengths
    // everything else (experience, education, campus, expertise, highlights) stays static
    return {
      ...staticResume,
      name: data.name || staticResume.name,
      alias: data.alias || staticResume.alias,
      role: data.role || staticResume.role,
      positioning: data.positioning || staticResume.positioning,
      location: data.location || staticResume.location,
      contact: {
        ...staticResume.contact,
        email: data.email || staticResume.contact.email,
        phone: data.phone || staticResume.contact.phone,
        zcool: data.zcool_url || staticResume.contact.zcool,
      },
      strengths: Array.isArray(data.strengths) && data.strengths.length > 0 && !hasEncodingCorruption(data.strengths)
        ? data.strengths
        : staticResume.strengths,
    };
  } catch {
    return staticResume;
  }
}

/** 检测数组中是否存在编码损坏（全部是问号或拉丁扩展字符） */
function hasEncodingCorruption(strings: unknown): boolean {
  if (!Array.isArray(strings)) return true;
  return strings.some((s: unknown) => {
    if (typeof s !== "string" || s.length === 0) return true;
    // 损坏的中文 UTF-8 被错误解码后会出现大量连续问号或高位拉丁字符
    const questionMarkRatio = (s.match(/\?/g) ?? []).length / s.length;
    if (questionMarkRatio > 0.3) return true;
    // 正常中文应该有 CJK 字符
    const hasCjk = /[\u4e00-\u9fff]/.test(s);
    return !hasCjk && s.length > 10;
  });
}
