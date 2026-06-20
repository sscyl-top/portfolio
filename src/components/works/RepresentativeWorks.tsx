"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";

type RepresentativeWorksProps = {
  works: Work[];
};

type RepresentativeCardStyle = CSSProperties & {
  "--slot-x": string;
  "--slot-y": string;
  "--slot-r": string;
  "--slot-spread": string;
  "--card-lift": string;
  "--card-scale": number;
  "--tilt-x": string;
  "--tilt-y": string;
  "--intro-delay": string;
};

const fanSlots = [
  { x: -24, y: 92, r: -18, z: 1 },
  { x: -17, y: 52, r: -11, z: 2 },
  { x: -8.5, y: 18, r: -5.5, z: 3 },
  { x: 0, y: -18, r: 0, z: 7 },
  { x: 8.5, y: 18, r: 5.5, z: 3 },
  { x: 17, y: 52, r: 11, z: 2 },
  { x: 24, y: 92, r: 18, z: 1 },
];

export function RepresentativeWorks({ works }: RepresentativeWorksProps) {
  const displayWorks = works.slice(0, 7);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section className="relative overflow-hidden px-5 pb-40 pt-40 md:px-8 md:pt-48">
      <div className="relative mx-auto max-w-7xl text-center">
        <p className="font-mono text-xs uppercase text-white/45">
          代表作 / Featured Works
        </p>
        <h1 className="mt-4 text-5xl font-semibold text-white md:text-7xl">
          代表作
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
          从品牌全案、视觉系统到 AIGC 提案能力，先用 7 个关键项目建立第一印象。
        </p>

        <div
          className="relative mx-auto mt-20 hidden h-[640px] max-w-7xl md:block"
          onPointerLeave={() => {
            setActiveIndex(null);
            if (frameRef.current !== null) {
              cancelAnimationFrame(frameRef.current);
              frameRef.current = null;
            }
          }}
        >
          <div className="pointer-events-none absolute left-1/2 top-[45%] h-[500px] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/10 blur-3xl" />

          {displayWorks.map((work, index) => {
            const slot = fanSlots[index] ?? fanSlots[fanSlots.length - 1];
            const isActive = activeIndex === index;
            const hasActive = activeIndex !== null;
            const lift = isActive ? -26 : 0;
            const spread = hasActive && !isActive ? slot.x * 0.055 : 0;
            const scale = isActive ? 1.045 : hasActive ? 0.965 : 1;
            const cardStyle: RepresentativeCardStyle = {
              zIndex: isActive ? 30 : slot.z,
              opacity: hasActive && !isActive ? 0.82 : 1,
              filter: hasActive && !isActive ? "saturate(0.88)" : "none",
              "--slot-x": `${slot.x}vw`,
              "--slot-y": `${slot.y}px`,
              "--slot-r": `${slot.r}deg`,
              "--slot-spread": `${spread}vw`,
              "--card-lift": `${lift}px`,
              "--card-scale": scale,
              "--tilt-x": "0deg",
              "--tilt-y": "0deg",
              "--intro-delay": `${index * 95}ms`,
            };

            return (
              <Link
                key={work.slug}
                href={`/works/${work.slug}`}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const target = event.currentTarget;
                  const nextX =
                    ((event.clientX - rect.left) / rect.width - 0.5) * 5.5;
                  const nextY =
                    ((event.clientY - rect.top) / rect.height - 0.5) * -4.5;

                  if (frameRef.current !== null) {
                    cancelAnimationFrame(frameRef.current);
                  }

                  frameRef.current = requestAnimationFrame(() => {
                    target.style.setProperty("--tilt-x", `${nextY}deg`);
                    target.style.setProperty("--tilt-y", `${nextX}deg`);
                    frameRef.current = null;
                  });
                }}
                onPointerLeave={(event) => {
                  event.currentTarget.style.setProperty("--tilt-x", "0deg");
                  event.currentTarget.style.setProperty("--tilt-y", "0deg");
                }}
                className="representative-work-card group absolute left-1/2 top-[46%] block w-[clamp(214px,18vw,278px)] origin-bottom overflow-hidden rounded-[34px] border border-white/15 bg-white/[0.07] p-2 text-left shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-[filter,opacity,border-color,box-shadow] duration-700 hover:border-white/35 hover:shadow-[0_34px_96px_rgba(0,0,0,0.62)] focus-visible:border-copper"
                style={cardStyle}
              >
                <article className="relative h-[clamp(370px,35vw,486px)] overflow-hidden rounded-[28px]">
                  <div className={`absolute inset-0 ${toneClass(work.coverTone)}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.2),transparent_20%),linear-gradient(to_bottom,transparent_42%,rgba(0,0,0,0.84))]" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/48">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{work.year}</span>
                  </div>
                  <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-white/12 bg-black/36 p-3 shadow-2xl backdrop-blur-xl transition duration-500 group-hover:bg-black/48">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-copper">
                          {work.category}
                        </p>
                        <h2 className="mt-1.5 text-lg font-semibold leading-tight text-white">
                          {work.title}
                        </h2>
                      </div>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="mt-1 h-5 w-5 flex-none text-white/45 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
                      />
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs leading-5 text-white/62">
                      {work.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {work.tags.slice(0, 1).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-white/55"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 grid gap-4 md:hidden">
          {displayWorks.map((work) => (
            <Link
              key={work.slug}
              href={`/works/${work.slug}`}
              className="group block overflow-hidden rounded-[28px] border border-white/14 bg-white/[0.07] p-2 text-left shadow-2xl shadow-black/45 backdrop-blur-xl"
            >
              <article className="relative h-[390px] overflow-hidden rounded-[22px]">
                <div className={`absolute inset-0 ${toneClass(work.coverTone)}`} />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_44%,rgba(0,0,0,0.86))]" />
                <div className="absolute inset-x-3 bottom-3 rounded-[18px] border border-white/12 bg-black/40 p-4 backdrop-blur-xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-copper">
                    {work.category} / {work.year}
                  </p>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold leading-tight text-white">
                      {work.title}
                    </h2>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-5 w-5 flex-none text-white/45"
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm leading-6 text-white/62">
                    {work.summary}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
