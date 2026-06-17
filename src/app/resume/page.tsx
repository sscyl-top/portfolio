import { Download, Mail, MapPin, Phone } from "lucide-react";

import { resume } from "@/data/portfolio";

export default function ResumePage() {
  return (
    <main>
      <section className="relative min-h-screen overflow-hidden px-5 pb-20 pt-32 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(201,162,127,0.14),transparent_26%),radial-gradient(circle_at_78%_48%,rgba(139,215,205,0.12),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:96px_96px] opacity-20" />

        <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl flex-col justify-between">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-2 font-mono text-xs uppercase text-white/45">
              <p>{resume.alias}</p>
              <p>{resume.role}</p>
              <p>Portfolio / Resume 2026</p>
            </div>
            <div className="grid gap-3 text-sm text-white/64 md:justify-items-end">
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

          <div className="py-16">
            <p className="font-mono text-sm uppercase text-copper">
              HI, I&apos;M {resume.name}
            </p>
            <h1 className="mt-5 max-w-5xl text-6xl font-semibold leading-[0.84] text-white md:text-8xl lg:text-9xl">
              BRAND
              <span className="block text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.62)]">
                VISUAL
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-xl leading-9 text-white/66">
              我是陈涛涛，一名专注于品牌全链路视觉、商业设计落地与 AIGC 工作流的设计师。当前以求职面试为主，同时保留少量品牌视觉与网页视觉服务合作入口。
            </p>
          </div>

          <div className="grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex flex-wrap gap-2">
              {resume.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-mono text-xs text-white/56"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={resume.downloads.pdf}
                download
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-copper"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                下载 PDF
              </a>
              <a
                href={resume.downloads.jpg}
                download
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-white/72 transition hover:border-white/40 hover:text-white"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                下载 JPG
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
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

          <ResumeSection title="教育背景" subtitle="Educational background">
            <div className="border-t border-white/10 pt-6">
              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-baseline">
                <h3 className="text-xl font-semibold text-white">
                  {resume.education.school} / {resume.education.major}
                </h3>
                <span className="font-mono text-sm text-white/42">
                  {resume.education.period}
                </span>
              </div>
              <p className="mt-4 leading-8 text-white/60">
                {resume.education.note}
              </p>
            </div>
          </ResumeSection>

          <section className="grid gap-6 rounded-lg border border-copper/25 bg-copper/10 p-6 md:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="font-mono text-xs uppercase text-copper">
                Design service
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                设计服务合作
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-black/25 px-3 py-1.5 text-sm text-white/66"
                >
                  {service}
                </span>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ResumeSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-8 rounded-lg border border-white/10 bg-white/[0.035] p-6 md:grid-cols-[0.35fr_1fr] md:p-8">
      <div>
        <p className="font-mono text-xs uppercase text-copper">{subtitle}</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}
