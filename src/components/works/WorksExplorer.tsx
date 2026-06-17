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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const caseWorks = useMemo(() => {
    return works.filter((work) => categories.includes(work.category));
  }, [works]);

  const visibleWorks = useMemo(() => {
    if (!activeCategory) {
      return caseWorks;
    }

    return caseWorks.filter((work) => work.category === activeCategory);
  }, [activeCategory, caseWorks]);

  return (
    <section className="space-y-10">
      <div
        className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3 pb-2"
        aria-label="作品分类"
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-5 py-2 text-sm transition ${
              activeCategory === category
                ? "border-white bg-white text-black"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30 hover:text-white"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleWorks.map((work, index) => (
          <Link
            key={work.slug}
            href={`/works/${work.slug}`}
            className={`group block overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-3 transition duration-500 hover:-translate-y-1 hover:border-white/30 ${
              index % 3 === 1 ? "md:mt-10" : ""
            }`}
            aria-label={`${work.title} 作品详情`}
          >
            <div
              className={`relative min-h-[360px] overflow-hidden rounded-md ${toneClass(
                work.coverTone,
              )}`}
            >
              <div className="absolute inset-4 rounded-md border border-white/10 bg-black/18" />
              <div className="absolute left-6 top-6 flex gap-2">
                {work.palette.slice(0, 3).map((color) => (
                  <span
                    key={color}
                    className="h-3.5 w-3.5 rounded-full border border-white/30"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="absolute bottom-4 left-4 right-4 rounded-md border border-white/10 bg-black/28 p-4 backdrop-blur-md">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase text-white/45">
                      {work.category} / {work.year}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
                      {work.title}
                    </h2>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="mb-1 h-5 w-5 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                  />
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/56">
                  {work.summary}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
