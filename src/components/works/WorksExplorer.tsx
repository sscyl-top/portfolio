"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

import { categories, type Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type WorksExplorerProps = {
  works: Work[];
};

type PointerState = {
  x: number;
  y: number;
  active: boolean;
};

const slotOffsets = [-28, 28, -8, 48];

function fillFourWorks(categoryWorks: Work[]) {
  if (categoryWorks.length === 0) {
    return [];
  }

  return Array.from({ length: 4 }, (_, index) => categoryWorks[index % categoryWorks.length]);
}

export function WorksExplorer({ works }: WorksExplorerProps) {
  const [pointer, setPointer] = useState<PointerState>({
    x: 0.52,
    y: 0.45,
    active: false,
  });

  const groupedWorks = useMemo(() => {
    return categories
      .map((category) => {
        const categoryWorks = works.filter((work) => work.category === category);

        return {
          category,
          works: fillFourWorks(categoryWorks),
          total: categoryWorks.length,
        };
      })
      .filter((group) => group.works.length > 0);
  }, [works]);

  return (
    <section
      className="relative isolate overflow-hidden px-5 pb-28 pt-24 md:px-8"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
          active: true,
        });
      }}
      onPointerLeave={() => {
        setPointer((current) => ({ ...current, active: false }));
      }}
    >
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,#050505_0%,#07100f_46%,#050505_100%)]" />
      <div className="allworks-drift allworks-drift-a pointer-events-none absolute -z-10 h-[760px] w-[760px] rounded-full opacity-75 blur-3xl" />
      <div className="allworks-drift allworks-drift-b pointer-events-none absolute -z-10 h-[660px] w-[660px] rounded-full opacity-65 blur-3xl" />
      <div
        className="allworks-glow allworks-glow-a pointer-events-none absolute -z-10 h-[720px] w-[720px] rounded-full opacity-85 blur-3xl"
        style={{
          left: `${pointer.x * 100}%`,
          top: `${pointer.y * 100}%`,
          transform: `translate(-50%, -50%) translate(${pointer.active ? -34 : -70}px, ${pointer.active ? -18 : 18}px)`,
        }}
      />
      <div
        className="allworks-glow allworks-glow-b pointer-events-none absolute -z-10 h-[620px] w-[620px] rounded-full opacity-75 blur-3xl"
        style={{
          left: `${100 - pointer.x * 64}%`,
          top: `${18 + pointer.y * 54}%`,
          transform: `translate(-50%, -50%) translate(${pointer.active ? 46 : 80}px, ${pointer.active ? 26 : -8}px)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:86px_86px] opacity-20" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <p className="font-mono text-xs uppercase text-copper">
            Projects / Works Archive
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-tight text-white md:text-7xl">
            全部作品
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/58">
            按视觉设计、品牌全案、概念设计、包装设计、电商设计和工作案例归档。每个分类先展示 4 个代表卡片，后续接入后台后会自动读取你发布的作品。
          </p>
        </div>

        <div className="space-y-24">
          {groupedWorks.map((group, groupIndex) => (
            <section
              key={group.category}
              className="relative min-h-[720px] rounded-lg border border-white/8 bg-black/[0.16] px-4 py-10 backdrop-blur-[2px] md:px-10 md:py-14"
            >
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.035] blur-2xl" />
              <div className="relative z-10 mx-auto mb-10 max-w-xl text-center md:absolute md:left-1/2 md:top-1/2 md:mb-0 md:-translate-x-1/2 md:-translate-y-1/2">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-copper">
                  {String(groupIndex + 1).padStart(2, "0")} / {group.total} Works
                </p>
                <h3 className="mt-4 text-4xl font-semibold text-white md:text-6xl">
                  {group.category}
                </h3>
                <p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-white/52">
                  这个分类先展示 4 个关键入口，更多作品后续由后台内容自动补充。
                </p>
              </div>

              <div className="relative z-20 grid gap-5 md:grid-cols-2 md:gap-x-[28%] md:gap-y-12">
                {group.works.map((work, index) => {
                  const repulseX = pointer.active
                    ? ((index % 2 === 0 ? -1 : 1) * pointer.x - 0.5) * 10
                    : 0;
                  const repulseY = pointer.active
                    ? ((index < 2 ? -1 : 1) * pointer.y - 0.5) * 8
                    : 0;

                  return (
                    <Link
                      key={`${group.category}-${work.slug}-${index}`}
                      href={`/works/${work.slug}`}
                      className="group block overflow-hidden rounded-lg border border-white/12 bg-white/[0.045] p-2 shadow-2xl shadow-black/35 backdrop-blur-xl transition duration-500 hover:border-white/32 hover:bg-white/[0.075]"
                      style={{
                        transform: `translate(${repulseX}px, ${slotOffsets[index] + repulseY}px)`,
                      }}
                    >
                      <article className="relative h-[310px] overflow-hidden rounded-md md:h-[340px]">
                        <div className={`absolute inset-0 ${toneClass(work.coverTone)}`} />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_28%,rgba(255,255,255,0.2),transparent_21%),linear-gradient(to_bottom,transparent_46%,rgba(0,0,0,0.82))]" />
                        <div className="absolute inset-x-4 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <span>{work.year}</span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 rounded-md border border-white/10 bg-black/34 p-4 backdrop-blur-md">
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <p className="font-mono text-[11px] uppercase text-copper">
                                {work.category}
                              </p>
                              <h4 className="mt-2 text-2xl font-semibold leading-tight text-white">
                                {work.title}
                              </h4>
                            </div>
                            <ArrowUpRight
                              aria-hidden="true"
                              className="mb-1 h-5 w-5 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                            />
                          </div>
                          <p className="mt-3 line-clamp-1 text-sm leading-6 text-white/56">
                            {work.summary}
                          </p>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
