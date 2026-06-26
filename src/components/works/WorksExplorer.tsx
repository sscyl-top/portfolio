"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import { categories, type Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";
import { WorkMediaFrame } from "./WorkMediaFrame";

type WorksExplorerProps = {
  works: Work[];
  categoryNames?: string[];
};

type DisplayWorkItem =
  | {
      kind: "work";
      work: Work;
      index: number;
    }
  | {
      kind: "placeholder";
      id: string;
      index: number;
      coverTone: Work["coverTone"];
      palette: string[];
    };

const placeholderTones: Work["coverTone"][] = ["cyan", "blue", "graphite", "warm"];

export function WorksExplorer({
  works,
  categoryNames = categories,
}: WorksExplorerProps) {
  const [activeCategory, setActiveCategory] = useState(categoryNames[0] ?? "");

  const visibleWorks = useMemo(() => {
    return works.filter((work) => work.category === activeCategory);
  }, [activeCategory, works]);

  const displayItems = useMemo<DisplayWorkItem[]>(() => {
    const workItems: DisplayWorkItem[] = visibleWorks.map((work, index) => ({
      kind: "work",
      work,
      index,
    }));

    const placeholderCount = Math.max(0, 4 - workItems.length);
    const placeholderItems: DisplayWorkItem[] = Array.from(
      { length: placeholderCount },
      (_, offset) => {
        const index = workItems.length + offset;

        return {
          kind: "placeholder",
          id: `${activeCategory}-placeholder-${offset}`,
          index,
          coverTone: placeholderTones[index % placeholderTones.length],
          palette: ["#8bd7cd", "#c9a27f", "#f4f1ea"],
        };
      },
    );

    return [...workItems, ...placeholderItems];
  }, [activeCategory, visibleWorks]);

  return (
    <section id="section-works" className="relative px-4 pb-32 pt-24 md:px-8 md:pt-44 md:pb-48">
      <div className="relative mx-auto max-w-[1500px]">
        <div className="mb-10 text-center">
          <p className="font-mono text-xs uppercase text-copper">
            Projects / Works Archive
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-7xl" data-text-key="works.allWorksTitle">
            全部作品
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/58 md:mt-6 md:text-lg md:leading-8" data-text-key="works.allWorksDescription">
            按视觉设计、品牌全案、概念设计、包装设计、电商设计和工作案例切换。后续接入后台后，每个分类会自动读取你发布的作品数量。
          </p>
        </div>

        <div className="mb-20 flex flex-wrap items-center justify-center gap-2 md:mb-32 md:gap-3">
          {categoryNames.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-3.5 py-2 text-[13px] transition duration-300 md:px-5 md:py-2.5 md:text-sm ${
                  isActive
                    ? "border-white/34 bg-white/14 text-white shadow-[0_0_30px_rgba(139,215,205,0.16)]"
                    : "border-white/10 bg-white/[0.045] text-white/58 hover:border-white/24 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {displayItems.length > 0 ? (
          <div className="grid gap-x-16 gap-y-16 md:grid-cols-2 md:gap-y-24 lg:gap-x-28 lg:gap-y-32">
            {displayItems.map((item) => {
              const isPlaceholder = item.kind === "placeholder";
              const work = item.kind === "work" ? item.work : null;
              const coverTone =
                item.kind === "work" ? item.work.coverTone : item.coverTone;
              const palette =
                item.kind === "work" ? item.work.palette : item.palette;
              const index = item.index;
              const card = (
                <article className="relative">
                  <div className="relative aspect-[1.56] overflow-hidden rounded-xl bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all duration-400 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:rounded-2xl">
                    <div
                      className={`absolute inset-0 opacity-82 saturate-[0.86] transition duration-500 group-hover:scale-[1.02] ${toneClass(
                        coverTone,
                      )}`}
                    />
                    {work?.coverMedia ? (
                      <WorkMediaFrame
                        media={work.coverMedia}
                        tone={coverTone}
                        hover
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_30%,rgba(255,255,255,0.24),transparent_22%),linear-gradient(120deg,rgba(255,255,255,0.08),transparent_34%),linear-gradient(to_bottom,transparent_56%,rgba(0,0,0,0.42))]" />
                    {isPlaceholder ? (
                      <div className="absolute inset-4 rounded-lg border border-dashed border-white/16 bg-black/10" />
                    ) : null}
                    <div className="absolute left-4 top-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white/58 transition-all duration-300 group-hover:text-white/75 md:left-5 md:top-5">
                      {String(index + 1).padStart(2, "0")} /{" "}
                      {work?.year ?? "Next"}
                    </div>
                    <div className="absolute bottom-4 right-4 flex gap-2 transition-all duration-300 group-hover:bottom-5 group-hover:right-5 md:bottom-5 md:right-5">
                      {palette.slice(0, 3).map((color) => (
                        <span
                          key={color}
                          className="h-3 w-3 rounded-full border border-white/32 transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 flex items-start justify-between gap-6 px-0 md:mt-8">
                    <div className="transition-transform duration-400 ease-out group-hover:-translate-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper transition-colors duration-300 group-hover:text-white/70">
                        {work?.category ?? activeCategory}
                      </p>
                      <h3 className="mt-2 max-w-xl text-3xl font-semibold leading-tight text-white transition-all duration-400 ease-out group-hover:translate-x-1 md:text-5xl">
                        {work?.title ?? "Project placeholder"}
                      </h3>
                      <p className="mt-2 line-clamp-1 max-w-xl text-sm leading-6 text-white/64 transition-colors duration-300 group-hover:text-white/75 md:mt-3 md:text-lg md:leading-7">
                        {work?.subtitle ?? "Reserved visual slot for upcoming work."}
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      className={`mt-2 h-6 w-6 shrink-0 transition-all duration-400 ease-out ${
                        isPlaceholder
                          ? "opacity-30"
                          : "text-white/42 group-hover:translate-x-1.5 group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:text-white md:mt-3"
                      }`}
                    />
                  </div>
                </article>
              );

              return item.kind === "work" ? (
                <Link
                  key={item.work.slug}
                  href={`/works/${item.work.slug}?from=works`}
                  className="group block"
                >
                  {card}
                </Link>
              ) : (
                <div key={item.id} className="group block" aria-hidden="true">
                  {card}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/55 md:p-10" data-text-key="works.emptyCategory">
            这个分类还没有发布作品，后续可从后台添加。
          </div>
        )}
      </div>
    </section>
  );
}
