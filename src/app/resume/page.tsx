import {
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";

import { ContactFinale } from "@/components/resume/ContactFinale";
import { getResumeData } from "@/lib/cms/resume";
import { getTextContentsByKeys, parseTextContentArray } from "@/lib/cms/text-content";

const RESUME_TEXT_KEYS = ["resume.contact.marquee"];

export const metadata: Metadata = {
  title: "sscyl.top-简历",
  description:
    "品牌/视觉 AI 设计师陈涛涛的个人简历 — 专注品牌全链路视觉、商业设计落地与 AIGC 工作流。",
  openGraph: {
    title: "sscyl.top-简历",
    description:
      "品牌/视觉 AI 设计师陈涛涛的个人简历 — 专注品牌全链路视觉、商业设计落地与 AIGC 工作流。",
  },
};

export default async function ResumePage() {
  const [resume, texts] = await Promise.all([
    getResumeData(),
    getTextContentsByKeys(RESUME_TEXT_KEYS),
  ]);

  const marqueeContent = texts["resume.contact.marquee"]?.content;
  const marqueeItems =
    marqueeContent && marqueeContent !== "resume.contact.marquee"
      ? parseTextContentArray(marqueeContent)
      : undefined;

  return (
    <main className="relative isolate overflow-hidden bg-page-bg">
      <div className="works-route-blob works-route-blob-a pointer-events-none fixed z-0 h-[980px] w-[980px] rounded-full opacity-62" />
      <div className="works-route-blob works-route-blob-b pointer-events-none fixed z-0 h-[900px] w-[900px] rounded-full opacity-56" />
      <section className="relative min-h-screen overflow-hidden px-4 pb-14 pt-22 md:px-8 md:pt-28">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_22%,rgba(201,162,127,0.12),transparent_26%),radial-gradient(circle_at_78%_48%,rgba(139,215,205,0.1),transparent_30%)]" />
        <div className="absolute inset-0 z-0 bg-[linear-gradient(var(--edge-3)_1px,transparent_1px),linear-gradient(90deg,var(--surface-3)_1px,transparent_1px)] bg-[size:96px_96px] opacity-20" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-10rem)] max-w-7xl flex-col justify-between">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-2 font-mono text-xs uppercase text-ink-3">
              <p>{resume.alias}</p>
              <p>{resume.role}</p>
              <p>Portfolio / Resume 2026</p>
            </div>
            <div className="grid gap-2 text-[13px] text-ink-2 md:justify-items-end md:text-sm">
              <span className="inline-flex items-center gap-2">
                <Mail aria-hidden="true" className="h-4 w-4" />
                {resume.contact.email}
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone aria-hidden="true" className="h-4 w-4" />
                {resume.contact.phone}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" className="h-4 w-4" />
                {resume.location}
              </span>
            </div>
          </div>

          <div className="py-10 md:-translate-y-14">
            <p className="font-mono text-xs uppercase text-copper md:text-sm">
              HI, I&apos;M {resume.name}
            </p>
            <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[0.88] text-ink sm:text-6xl md:text-8xl lg:text-9xl">
              BRAND
              <span className="block text-transparent [-webkit-text-stroke:1px_var(--ink-3)]">
                VISUAL
              </span>
            </h1>
            <div className="mt-5 flex max-w-4xl flex-wrap gap-1.5 md:mt-8 md:gap-2">
              {resume.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-edge-2 bg-surface-3 px-3 py-1.5 font-mono text-[11px] text-ink-2 md:px-4 md:py-2 md:text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6 border-t border-edge-2 pt-8 md:-translate-y-16 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-3xl text-[15px] leading-7 text-ink-2 md:text-lg md:leading-8">
              我是陈涛涛，一名专注于品牌全链路视觉、商业设计落地与 AIGC 工作流的设计师。当前以求职面试为主，同时保留少量品牌视觉与网页视觉服务合作入口。
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-edge px-4 py-2.5 text-[13px] text-ink-2 transition hover:border-edge hover:text-ink md:px-5 md:py-3 md:text-sm"
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
                  className="border-t border-edge-2 pt-4 leading-8 text-ink-2"
                >
                  {strength}
                </p>
              ))}
            </div>
          </ResumeSection>

          <ResumeSection title="社会经历" subtitle="Social experience">
            <div className="space-y-8">
              {resume.experience.map((item) => (
                <article key={item.company} className="border-t border-edge-2 pt-6">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-baseline">
                    <h3 className="text-2xl font-semibold text-ink">
                      {item.company}
                    </h3>
                    <span className="font-mono text-sm text-ink-3">
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
                        className="grid grid-cols-[2rem_1fr] gap-3 leading-8 text-ink-2"
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
                <article key={item.company} className="border-t border-edge-2 pt-5">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-baseline">
                    <h3 className="text-xl font-semibold text-ink">
                      {item.company} / {item.title}
                    </h3>
                    <span className="font-mono text-sm text-ink-3">
                      {item.period}
                    </span>
                  </div>
                  <p className="mt-3 leading-8 text-ink-2">
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
            <div className="border-t border-edge-2 pt-4">
              <div
                data-testid="education-school-summary"
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-4 md:items-start"
              >
                <div>
                  <p className="font-mono text-xs uppercase text-ink-4">
                    {resume.education.schoolEnglish}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold text-ink md:text-2xl">
                    {resume.education.school}
                  </h3>
                </div>
                <div>
                  <p className="font-mono text-xs text-ink-4">
                    {resume.education.majorEnglish}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold text-ink md:text-2xl">
                    {resume.education.major}
                  </h3>
                </div>
                <span className="font-mono text-sm text-ink-3 md:pt-1">
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
                    className="flex h-24 min-h-[60px] flex-col justify-between rounded-lg border border-edge-2 bg-surface-2 p-2.5 md:h-20 md:p-3 lg:h-24 lg:p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase text-ink-4">
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
                            : "text-sm font-medium leading-6 text-ink"
                        }
                      >
                        {achievement.value}
                      </p>
                      {achievement.detail ? (
                        <p className="mt-0.5 text-[11px] text-ink-3">
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
            <div className="border-t border-edge-2">
              {resume.education.activities.map((activity) => (
                <article
                  key={`${activity.period}-${activity.title}`}
                  className="grid gap-1.5 border-b border-edge-2 py-3 md:grid-cols-[7.5rem_11rem_1fr] md:gap-5 md:py-4"
                >
                  <p className="font-mono text-xs text-copper">
                    {activity.period}
                  </p>
                  <h3 className="text-sm font-medium text-ink">
                    {activity.title}
                  </h3>
                  <p className="text-sm leading-6 text-ink-3">
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
        marqueeItems={marqueeItems}
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
      className="grid gap-5 rounded-lg border border-edge-2 bg-surface-3 p-4 md:grid-cols-[0.35fr_1fr] md:gap-8 md:p-8"
    >
      <div>
        <p className="font-mono text-xs uppercase text-copper">{subtitle}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}


