"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import { categories, type Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type WorksExplorerProps = {
  works: Work[];
};

export function WorksExplorer({ works }: WorksExplorerProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  const visibleWorks = useMemo(() => {
    return works.filter((work) => work.category === activeCategory);
  }, [activeCategory, works]);

  return (
    <section className="relative px-5 pb-48 pt-32 md:px-8 md:pt-44">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-24 text-center">
          <p className="font-mono text-xs uppercase text-copper">
            Projects / Works Archive
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-tight text-white md:text-7xl">
            全部作品
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/58">
            按视觉设计、品牌全案、概念设计、包装设计、电商设计和工作案例切换。后续接入后台后，每个分类会自动读取你发布的作品数量。
          </p>
        </div>

        <div className="mb-32 flex flex-wrap items-center justify-center gap-3">
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-5 py-2.5 text-sm transition duration-300 ${
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

        {visibleWorks.length > 0 ? (
          <div className="grid gap-x-14 gap-y-20 md:grid-cols-2 lg:gap-x-24 lg:gap-y-28">
            {visibleWorks.map((work, index) => (
              <Link
                key={work.slug}
                href={`/works/${work.slug}`}
                className="group block"
              >
                <article className="relative">
                  <div className="relative aspect-[1.72] overflow-hidden rounded-[24px] bg-white/[0.04] shadow-[0_28px_90px_rgba(0,0,0,0.32)] transition duration-500 group-hover:-translate-y-2 md:rounded-[28px]">
                    <div className={`absolute inset-0 opacity-78 saturate-[0.82] ${toneClass(work.coverTone)}`} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_30%,rgba(255,255,255,0.2),transparent_20%),linear-gradient(120deg,rgba(255,255,255,0.06),transparent_32%),linear-gradient(to_bottom,transparent_55%,rgba(0,0,0,0.38))]" />
                    <div className="absolute left-5 top-5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
                      {String(index + 1).padStart(2, "0")} / {work.year}
                    </div>
                    <div className="absolute bottom-5 right-5 flex gap-2">
                      {work.palette.slice(0, 3).map((color) => (
                        <span
                          key={color}
                          className="h-3 w-3 rounded-full border border-white/32"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-9 flex items-start justify-between gap-6 px-0">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper">
                        {work.category}
                      </p>
                      <h3 className="mt-3 max-w-xl text-4xl font-semibold leading-tight text-white md:text-5xl">
                        {work.title}
                      </h3>
                      <p className="mt-3 line-clamp-1 max-w-xl text-lg leading-7 text-white/64">
                        {work.summary}
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="mt-3 h-6 w-6 shrink-0 text-white/42 transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white"
                    />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-10 text-center text-white/55">
            这个分类还没有发布作品，后续可从后台添加。
          </div>
        )}
      </div>
    </section>
  );
}
