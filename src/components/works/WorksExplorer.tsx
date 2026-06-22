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
    <section className="relative px-4 pb-32 pt-24 md:px-8 md:pt-44 md:pb-48">
      <div className="relative mx-auto max-w-[1500px]">
        <div className="mb-24 text-center">
          <p className="font-mono text-xs uppercase text-copper">
            Projects / Works Archive
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-7xl">
            全部作品
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/58 md:mt-6 md:text-lg md:leading-8">
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
                  <div className="relative aspect-[1.56] overflow-hidden rounded-[28px] bg-white/[0.04] shadow-[0_32px_100px_rgba(0,0,0,0.36)] transition duration-500 group-hover:-translate-y-2 md:rounded-[32px]">
                    <div
                      className={`absolute inset-0 opacity-82 saturate-[0.86] ${toneClass(
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
                      <div className="absolute inset-5 rounded-[22px] border border-dashed border-white/16 bg-black/10" />
                    ) : null}
                    <div className="absolute left-6 top-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
                      {String(index + 1).padStart(2, "0")} /{" "}
                      {work?.year ?? "Next"}
                    </div>
                    <div className="absolute bottom-6 right-6 flex gap-2">
                      {palette.slice(0, 3).map((color) => (
                        <span
                          key={color}
                          className="h-3.5 w-3.5 rounded-full border border-white/32"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 flex items-start justify-between gap-6 px-0">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper">
                        {work?.category ?? activeCategory}
                      </p>
                      <h3 className="mt-2 max-w-xl text-3xl font-semibold leading-tight text-white md:text-5xl">
                        {work?.title ?? "Project placeholder"}
                      </h3>
                      <p className="mt-2 line-clamp-1 max-w-xl text-sm leading-6 text-white/64 md:mt-3 md:text-lg md:leading-7">
                        {work?.summary ?? "Reserved visual slot for upcoming work."}
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      className={`mt-3 h-6 w-6 shrink-0 text-white/42 transition duration-300 ${
                        isPlaceholder
                          ? "opacity-30"
                          : "group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white"
                      }`}
                    />
                  </div>
                </article>
              );

              return item.kind === "work" ? (
                <Link
                  key={item.work.slug}
                  href={`/works/${item.work.slug}`}
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
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/55 md:p-10">
            这个分类还没有发布作品，后续可从后台添加。
          </div>
        )}
      </div>
    </section>
  );
}
