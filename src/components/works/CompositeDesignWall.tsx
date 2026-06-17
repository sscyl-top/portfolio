"use client";

import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, FileText, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

        <div className="relative mt-44 overflow-hidden rounded-[2rem] border border-white/10 bg-[#20231f] px-6 py-14 shadow-[0_34px_100px_rgba(0,0,0,0.5)] md:px-12 md:py-20">
          <div className="contour-lines pointer-events-none absolute inset-0 opacity-45" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-36 w-[46%] -translate-x-1/2 rounded-b-full bg-[#9aaa70]/10 blur-3xl" />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/42">
              Infinite Progress
            </p>
            <div className="mt-5 text-5xl font-black tracking-[0.08em] text-white md:text-7xl">
              无限进步
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/56">
              以求职面试为主，同时保留品牌视觉、网页视觉和商业设计咨询合作入口。
            </p>

            <div className="mt-12 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/resume"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-6 py-3 text-sm font-medium text-white/78 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white sm:w-auto"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                查看简历
              </Link>
              <Link
                href="mailto:3020714732@qq.com?subject=Portfolio%20Hiring%20Contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-6 py-3 text-sm font-medium text-white/78 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white sm:w-auto"
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                聘用联系
              </Link>
              <Link
                href="mailto:3020714732@qq.com?subject=Commercial%20Design%20Consulting"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#b8c56a]/30 bg-[#b8c56a] px-6 py-3 text-sm font-semibold text-[#171a15] shadow-[0_0_30px_rgba(184,197,106,0.16)] transition hover:bg-[#c4d174] sm:w-auto"
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
