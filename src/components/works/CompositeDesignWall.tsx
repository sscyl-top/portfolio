"use client";

import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, FileText, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type CompositeDesignWallProps = {
  works: Work[];
};

const toneFallbacks = [
  "bronze",
  "orange",
  "graphite",
  "cyan",
  "blue",
  "warm",
  "mono",
  "red",
];

export function CompositeDesignWall({ works }: CompositeDesignWallProps) {
  const [scrollShift, setScrollShift] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const displayWorks = useMemo(() => {
    if (works.length === 0) {
      return [];
    }

    return Array.from({ length: 16 }, (_, index) => {
      const work = works[index % works.length];
      return {
        ...work,
        displayIndex: index,
        alternateTone: toneFallbacks[(index + 3) % toneFallbacks.length],
      };
    });
  }, [works]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrollShift(window.scrollY * 0.035);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const element = ctaRef.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCtaVisible(entry.isIntersecting);
      },
      { threshold: 0.28 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (displayWorks.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden px-5 pb-10 pt-48 md:px-8">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-28 text-center">
          <p className="font-mono text-xs uppercase text-copper">
            Composite Design / Visual Flow
          </p>
          <h2 className="mt-4 text-5xl font-semibold text-white md:text-7xl">
            复合设计
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/56">
            用更密集的作品墙展示图案、装备、曲面贴花和多介质延展。当前为开发占位，后续可在后台替换图片与项目内容。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayWorks.map((work, index) => {
            const column = index % 4;
            const direction = column % 2 === 0 ? -1 : 1;
            const yOffset = direction * ((scrollShift + column * 10) % 34);

            return (
              <Link
                key={`${work.slug}-${index}`}
                href={`/works/${work.slug}`}
                className="group block overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-2 transition duration-500 hover:-translate-y-2 hover:border-white/30 hover:bg-white/[0.07]"
                style={{
                  transform: `translateY(${yOffset}px)`,
                  transition:
                    "transform 420ms cubic-bezier(.2,.8,.2,1), border-color 300ms ease, background-color 300ms ease",
                }}
              >
                <article className="relative h-[300px] overflow-hidden rounded-md">
                  <div
                    className={`absolute inset-0 opacity-72 saturate-[0.72] transition duration-700 group-hover:scale-105 group-hover:opacity-0 ${toneClass(
                      work.coverTone,
                    )}`}
                  />
                  <div
                    className={`absolute inset-0 scale-105 opacity-0 saturate-[0.72] transition duration-700 group-hover:scale-100 group-hover:opacity-70 ${toneClass(
                      work.alternateTone,
                    )}`}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_34%,rgba(0,0,0,0.82))]" />
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/48">
                    <span>{String(work.displayIndex + 1).padStart(2, "0")}</span>
                    <span>{work.year}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/10 bg-black/34 p-3 backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-copper">
                          {work.tags[0] ?? "Composite"}
                        </p>
                        <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-tight text-white">
                          {work.title}
                        </h3>
                      </div>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-white/45 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                      />
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        <div
          ref={ctaRef}
          className="portfolio-cta-panel relative mt-48 min-h-[720px] overflow-hidden bg-[#20251e] px-6 pb-8 pt-20 shadow-[0_34px_110px_rgba(0,0,0,0.52)] md:px-12 md:pt-24"
        >
          <div className="contour-lines pointer-events-none absolute inset-0 opacity-42" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-[linear-gradient(to_top,rgba(9,10,8,0.9),transparent)]" />

          <div
            className={`cta-logo-mark pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 text-center text-5xl font-black tracking-[0.16em] text-[#d7e589] md:text-7xl ${
              ctaVisible ? "is-visible" : ""
            }`}
          >
            無限進步
          </div>

          <div className="cta-logo-ticker absolute inset-x-0 bottom-[104px] z-10 h-20 overflow-hidden text-[#b7c96e]/78">
            <div className="cta-logo-track flex h-full w-max items-center gap-12 whitespace-nowrap font-mono text-2xl font-black uppercase tracking-[0.24em] md:text-4xl">
              {Array.from({ length: 2 }).map((_, groupIndex) => (
                <div key={groupIndex} className="flex items-center gap-12">
                  <span>無限進步</span>
                  <span>Brand Visual</span>
                  <span>AI Design</span>
                  <span>Web Experience</span>
                  <span>Design Service</span>
                  <span>無限進步</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-1/2 z-20 h-[420px] w-[min(560px,84vw)] -translate-x-1/2">
            <div className="absolute bottom-0 left-1/2 h-[360px] w-[330px] -translate-x-1/2 rounded-t-[180px] bg-[radial-gradient(circle_at_50%_22%,rgba(222,229,196,0.18),transparent_22%),linear-gradient(135deg,#151811,#27261d_42%,#11130f)] shadow-[0_-22px_100px_rgba(190,205,111,0.12)]" />
            <div className="absolute left-1/2 top-4 h-[176px] w-[176px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_42%_28%,rgba(255,255,255,0.88),rgba(202,216,132,0.68)_28%,#10130d_55%,#050604_100%)] shadow-[0_20px_70px_rgba(0,0,0,0.45)]" />
            <div className="absolute left-1/2 top-[82px] h-10 w-[206px] -translate-x-1/2 rounded-full bg-[#050604] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18)]" />
            <div className="absolute left-1/2 top-[54px] h-[150px] w-[228px] -translate-x-1/2 rounded-t-full border-[12px] border-[#b7c96e]/55 border-b-transparent opacity-70" />
          </div>

          <div className="relative z-30 mx-auto flex min-h-[620px] max-w-6xl flex-col items-center text-center">
            <h2 className="mt-40 max-w-4xl text-5xl font-black leading-tight tracking-[0.02em] text-white md:text-7xl">
              把完整的视觉能力带到真实项目里
            </h2>

            <div className="mt-auto flex w-full flex-col items-center justify-center gap-3 pb-6 sm:w-auto sm:flex-row md:pb-4">
              <Link
                href="/resume"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-6 py-3 text-sm font-medium text-white/78 backdrop-blur-md transition hover:border-white/28 hover:bg-white/[0.12] hover:text-white sm:w-auto"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                查看简历
              </Link>
              <Link
                href="mailto:3020714732@qq.com?subject=Portfolio%20Hiring%20Contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#c6d970]/30 bg-[#c6d970] px-7 py-3 text-sm font-semibold text-[#171a13] shadow-[0_0_34px_rgba(198,217,112,0.18)] transition hover:bg-[#d2e47c] sm:w-auto"
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                聘用联系
              </Link>
              <Link
                href="mailto:3020714732@qq.com?subject=Commercial%20Design%20Consulting"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-6 py-3 text-sm font-medium text-white/78 backdrop-blur-md transition hover:border-white/28 hover:bg-white/[0.12] hover:text-white sm:w-auto"
              >
                <MessagesSquare className="h-4 w-4" aria-hidden="true" />
                商业咨询
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
