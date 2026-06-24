"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BriefcaseBusiness, FileText, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Work } from "@/data/portfolio";
import { toneClass } from "@/lib/workTone";
import { WorkMediaFrame } from "./WorkMediaFrame";

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

const infiniteProgressLogo = "/brand/infinite-progress-logo.svg";

export type CompositeTextOverrides = {
  compositeKicker?: string;
  compositeTitle?: string;
  compositeDescription?: string;
  ctaResume?: string;
  ctaHiring?: string;
  ctaCommercial?: string;
};

type CompositeDesignWallProps = {
  works: Work[];
  textOverrides?: CompositeTextOverrides;
  ctaCardUrl?: string;
  ctaFigureUrl?: string;
  ctaTickerLogoUrl?: string;
};

export function CompositeDesignWall({
  works,
  textOverrides = {},
  ctaCardUrl = "",
  ctaFigureUrl = "",
  ctaTickerLogoUrl = "",
}: CompositeDesignWallProps) {
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
    <section id="section-composite" className="relative overflow-hidden px-4 pb-8 pt-24 md:px-8 md:pt-48 md:pb-10">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-16 text-center md:mb-28">
          <p className="font-mono text-xs uppercase text-copper" data-text-key="works.compositeKicker">
            {textOverrides.compositeKicker || "Composite Design / Visual Flow"}
          </p>
          <h2 className="mt-3 text-4xl font-semibold text-white md:text-7xl" data-text-key="works.compositeTitle">
            {textOverrides.compositeTitle || "复合设计"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/56 md:text-base md:leading-8" data-text-key="works.compositeDescription">
            {textOverrides.compositeDescription ||
              "用更密集的作品墙展示图案、装备、曲面贴花和多介质延展。当前为开发占位，后续可在后台替换图片与项目内容。"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
          {displayWorks.map((work, index) => {
            const column = index % 4;
            const direction = column % 2 === 0 ? -1 : 1;
            const yOffset = direction * ((scrollShift + column * 10) % 34);

            return (
              <Link
                key={`${work.slug}-${index}`}
                href={`/works/${work.slug}?from=composite`}
                className="group block overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-2 transition duration-500 hover:-translate-y-2 hover:border-white/30 hover:bg-white/[0.07]"
                style={{
                  transform: `translateY(${yOffset}px)`,
                  transition:
                    "transform 420ms cubic-bezier(.2,.8,.2,1), border-color 300ms ease, background-color 300ms ease",
                }}
              >
                <article className="relative h-[200px] overflow-hidden rounded-md md:h-[300px]">
                  {work.coverMedia ? (
                    work.coverMedia.mimeType === "image/gif" ? (
                      <img
                        src={work.coverMedia.url}
                        alt={work.coverMedia.alt}
                        className="absolute inset-0 h-full w-full object-cover opacity-72 saturate-[0.72] transition-all duration-500 group-hover:scale-105 group-hover:opacity-0"
                        loading="lazy"
                      />
                    ) : (
                      <WorkMediaFrame
                        media={work.coverMedia}
                        tone={work.coverTone}
                        className="opacity-72 saturate-[0.72] transition-all duration-500 group-hover:scale-105 group-hover:opacity-0"
                      />
                    )
                  ) : (
                    <div
                      className={`absolute inset-0 opacity-72 saturate-[0.72] transition duration-700 group-hover:scale-105 group-hover:opacity-0 ${toneClass(
                        work.coverTone,
                      )}`}
                    />
                  )}
                  {work.hoverMedia ? (
                    work.hoverMedia.mimeType === "image/gif" ? (
                      <img
                        src={work.hoverMedia.url}
                        alt={work.hoverMedia.alt}
                        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
                        loading="lazy"
                      />
                    ) : (
                      <WorkMediaFrame
                        media={work.hoverMedia}
                        tone={work.alternateTone}
                        className="scale-105 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
                      />
                    )
                  ) : (
                    <div
                      className={`absolute inset-0 scale-105 opacity-0 saturate-[0.72] transition duration-700 group-hover:scale-100 group-hover:opacity-70 ${toneClass(
                        work.alternateTone,
                      )}`}
                    />
                  )}
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
          className="portfolio-cta-panel relative mt-24 min-h-[480px] px-0 pb-6 pt-8 md:mt-48 md:min-h-[680px] md:pt-16 md:pb-8"
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_52%_24%,rgba(139,215,205,0.16),transparent_30%),radial-gradient(circle_at_50%_92%,rgba(0,0,0,0.72),transparent_42%)]" />

          <div className="absolute inset-x-[4%] bottom-6 top-8 z-10 md:inset-x-[8%] md:bottom-10 md:top-12">
            {ctaCardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ctaCardUrl}
                alt=""
                className="h-full w-full object-contain object-center"
              />
            ) : (
              <div className="cta-card-upload-slot h-full w-full" aria-hidden="true" />
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center md:top-28">
            <Image
              src={infiniteProgressLogo}
              alt="无限进步"
              width={360}
              height={90}
              className={`cta-logo-image h-auto w-[min(360px,64vw)] ${
                ctaVisible ? "is-visible" : ""
              }`}
            />
          </div>

          <div className="cta-logo-ticker absolute inset-x-0 bottom-[140px] z-20 h-24 overflow-hidden opacity-70 md:bottom-[150px]">
            <div className="cta-logo-track flex h-full w-max items-center gap-16 whitespace-nowrap">
              {Array.from({ length: 2 }).map((_, groupIndex) => (
                <div key={groupIndex} className="flex items-center gap-16">
                  {Array.from({ length: 6 }).map((_, logoIndex) => {
                    const logoSrc = ctaTickerLogoUrl || infiniteProgressLogo;
                    return ctaTickerLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${groupIndex}-${logoIndex}`}
                        src={logoSrc}
                        alt=""
                        className="h-auto w-[clamp(150px,15vw,240px)] opacity-55 mix-blend-screen object-contain"
                      />
                    ) : (
                      <Image
                        key={`${groupIndex}-${logoIndex}`}
                        src={logoSrc}
                        alt=""
                        width={240}
                        height={60}
                        className="h-auto w-[clamp(150px,15vw,240px)] opacity-55 mix-blend-screen"
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-1/2 z-30 h-[440px] w-[min(560px,84vw)] -translate-x-1/2">
            {ctaFigureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ctaFigureUrl}
                alt=""
                className="h-full w-full object-contain object-bottom"
              />
            ) : (
              <div className="cta-figure-upload-slot h-full w-full" aria-hidden="true" />
            )}
          </div>

          <div className="relative z-40 mx-auto flex min-h-[440px] max-w-6xl flex-col items-center justify-end text-center md:min-h-[620px]">
            <div className="flex w-full flex-col items-center justify-center gap-5 pb-6 sm:w-auto sm:flex-row sm:gap-9 md:pb-5">
              <Link
                href="/resume"
                className="inline-flex min-h-12 w-full flex-row-reverse items-center justify-between rounded-full border border-white/15 bg-black/45 px-6 text-sm text-white/78 backdrop-blur transition hover:border-white/35 hover:text-white sm:w-48"
                data-text-key="works.ctaResume"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                {textOverrides.ctaResume || "查看简历"}
              </Link>
              <Link
                href="/resume#hiring-contact"
                className="group inline-flex min-h-12 w-full flex-row-reverse items-center justify-between rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-cyan sm:w-52"
                data-text-key="works.ctaHiring"
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                {textOverrides.ctaHiring || "聘用联系"}
              </Link>
              <Link
                href="/resume#commercial-contact"
                className="inline-flex min-h-12 w-full flex-row-reverse items-center justify-between rounded-full border border-white/15 bg-black/45 px-6 text-sm text-white/78 backdrop-blur transition hover:border-copper/60 hover:text-white sm:w-48"
                data-text-key="works.ctaCommercial"
              >
                <MessagesSquare className="h-4 w-4" aria-hidden="true" />
                {textOverrides.ctaCommercial || "商业咨询"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
