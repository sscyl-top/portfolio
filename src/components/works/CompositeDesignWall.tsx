"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BriefcaseBusiness, FileText, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";

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
  ctaFigureLightUrl?: string;
  ctaTickerLogoUrls?: string[];
  ctaCenterLogoUrl?: string;
  ctaCardScale?: number;
  ctaCardOffsetX?: number;
  ctaCardOffsetY?: number;
  ctaFigureScale?: number;
  ctaFigureOffsetX?: number;
  ctaFigureOffsetY?: number;
  ctaFigureLightScale?: number;
  ctaFigureLightOffsetX?: number;
  ctaFigureLightOffsetY?: number;
  ctaTickerLogoScale?: number;
  ctaTickerLogoOffsetX?: number;
  ctaTickerLogoOffsetY?: number;
  ctaCenterLogoScale?: number;
  ctaCenterLogoOffsetX?: number;
  ctaCenterLogoOffsetY?: number;
};

export function CompositeDesignWall({
  works,
  textOverrides = {},
  ctaCardUrl = "",
  ctaFigureUrl = "",
  ctaFigureLightUrl = "",
  ctaTickerLogoUrls = [],
  ctaCenterLogoUrl = "",
  ctaCardScale = 1,
  ctaCardOffsetX = 0,
  ctaCardOffsetY = 0,
  ctaFigureScale = 1,
  ctaFigureOffsetX = 0,
  ctaFigureOffsetY = 0,
  ctaFigureLightScale,
  ctaFigureLightOffsetX,
  ctaFigureLightOffsetY,
  ctaTickerLogoScale = 1,
  ctaTickerLogoOffsetX = 0,
  ctaTickerLogoOffsetY = 0,
  ctaCenterLogoScale = 1,
  ctaCenterLogoOffsetX = 0,
  ctaCenterLogoOffsetY = 0,
}: CompositeDesignWallProps) {
  const [scrollShift, setScrollShift] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";
  const activeFigureUrl = isLight && ctaFigureLightUrl ? ctaFigureLightUrl : ctaFigureUrl;
  const activeFigureScale = isLight && ctaFigureLightUrl && ctaFigureLightScale !== undefined ? ctaFigureLightScale : ctaFigureScale;
  const activeFigureOffsetX = isLight && ctaFigureLightUrl && ctaFigureLightOffsetX !== undefined ? ctaFigureLightOffsetX : ctaFigureOffsetX;
  const activeFigureOffsetY = isLight && ctaFigureLightUrl && ctaFigureLightOffsetY !== undefined ? ctaFigureLightOffsetY : ctaFigureOffsetY;

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
        setScrollShift(window.scrollY * 0.05);
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
            {textOverrides.compositeKicker || "Early Works / Archive"}
          </p>
          <h2 className="mt-3 text-4xl font-semibold text-ink md:text-7xl" data-text-key="works.compositeTitle">
            {textOverrides.compositeTitle || "早期作品"}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-2 md:text-base md:leading-8" data-text-key="works.compositeDescription">
            {textOverrides.compositeDescription ||
              "用更密集的作品墙展示图案、装备、曲面贴花和多介质延展。当前为开发占位，后续可在后台替换图片与项目内容。"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
          {displayWorks.map((work, index) => {
            const column = index % 4;
            const direction = column % 2 === 0 ? -1 : 1;
            const yOffset = direction * ((scrollShift + column * 12) % 56);
            const mobileColumn = index % 2;
            const mobileDirection = mobileColumn % 2 === 0 ? -1 : 1;
            const mobileYOffset = mobileDirection * ((scrollShift * 0.8 + mobileColumn * 12) % 32);

            return (
              <Link
                key={`${work.slug}-${index}`}
                href={`/works/${work.slug}?from=composite`}
                className="group block overflow-hidden rounded-lg border border-white/15 bg-surface/40 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:border-white/25 hover:bg-surface/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_0_30px_rgba(255,255,255,0.04)] md:p-2"
                style={{
                  transform: window.innerWidth >= 1024 ? `translateY(${yOffset}px)` : `translateY(${mobileYOffset}px)`,
                  transition:
                    "transform 420ms cubic-bezier(.2,.8,.2,1), border-color 300ms ease, background-color 300ms ease",
                }}
              >
                <article className="relative h-[188px] overflow-hidden rounded-md md:h-[300px]">
                  {work.coverMedia ? (
                    <WorkMediaFrame
                      media={work.coverMedia}
                      tone={work.coverTone}
                      className="transition-all duration-500 group-hover:scale-105 group-hover:opacity-0"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 transition duration-700 group-hover:scale-105 group-hover:opacity-0 ${toneClass(
                        work.coverTone,
                      )}`}
                    />
                  )}
                  {work.hoverMedia ? (
                    <WorkMediaFrame
                      media={work.hoverMedia}
                      tone={work.alternateTone}
                      className="scale-105 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 scale-105 opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-70 ${toneClass(
                        work.alternateTone,
                      )}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--surface-3),transparent_40%,var(--overlay-2))]" />
                  <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.7),0_0_6px_rgba(0,0,0,0.35)] md:inset-x-3 md:top-3 md:text-[10px] md:tracking-[0.16em]">
                    <span>{String(work.displayIndex + 1).padStart(2, "0")}</span>
                    <span>{work.year}</span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 rounded-md border border-slate-300/50 bg-white/70 p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12),inset_0_0_20px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl md:bottom-3 md:left-3 md:right-3 md:p-3">
                    <div className="flex items-start justify-between gap-2 md:gap-3">
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-amber-700 md:text-[10px] md:tracking-[0.16em]">
                          {work.tags[0] ?? "Composite"}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 md:mt-1.5 md:text-lg md:leading-tight">
                          {work.title}
                        </h3>
                      </div>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-900 md:mt-1 md:h-4 md:w-4"
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
          className="portfolio-cta-panel relative mt-20 min-h-[580px] px-0 pb-6 pt-12 md:mt-48 md:min-h-[680px] md:pt-16 md:pb-8"
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_52%_24%,rgba(139,215,205,0.16),transparent_30%),radial-gradient(circle_at_50%_92%,var(--overlay),transparent_42%)]" />

          <div className="absolute inset-x-[5%] bottom-6 top-12 z-10 md:inset-x-[8%] md:bottom-10 md:top-12">
            {ctaCardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ctaCardUrl}
                alt=""
                className="cta-card-image h-full w-full object-cover object-top md:object-contain md:object-center"
                style={{
                  transform: `translate(${ctaCardOffsetX}px, ${ctaCardOffsetY}px) scale(${ctaCardScale})`,
                  transformOrigin: "center center",
                }}
              />
            ) : (
              <div className="cta-card-upload-slot h-full w-full" aria-hidden="true" />
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center md:top-28">
            <div
              style={{
                transform: `translate(${ctaCenterLogoOffsetX}px, ${ctaCenterLogoOffsetY}px) scale(${ctaCenterLogoScale})`,
                transformOrigin: "center center",
              }}
            >
              <div className={`cta-logo-fade ${ctaVisible ? "is-visible" : ""}`}>
                {ctaCenterLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ctaCenterLogoUrl}
                    alt="中心Logo"
                    className="cta-logo-img h-auto w-[min(280px,56vw)] md:w-[min(360px,64vw)]"
                  />
                ) : (
                  <Image
                    src={infiniteProgressLogo}
                    alt="无限进步"
                    width={360}
                    height={90}
                    className="cta-logo-img h-auto w-[min(280px,56vw)] md:w-[min(360px,64vw)]"
                  />
                )}
              </div>
            </div>
          </div>

          <div
            className="cta-logo-ticker absolute inset-x-0 bottom-[80px] z-20 overflow-hidden opacity-70 md:bottom-[82px]"
            style={{
              transform: `translate(${ctaTickerLogoOffsetX}px, ${ctaTickerLogoOffsetY}px) scale(${ctaTickerLogoScale})`,
              transformOrigin: "center center",
            }}
          >
            <div className="cta-logo-track flex w-max items-center gap-14 whitespace-nowrap py-2">
              {(() => {
                const hasCustomLogos = ctaTickerLogoUrls.length > 0;
                const logoSrcs = hasCustomLogos ? ctaTickerLogoUrls : [infiniteProgressLogo];
                const minPerSet = 8;
                const repeats = Math.max(1, Math.ceil(minPerSet / logoSrcs.length));
                const oneSet: string[] = [];
                for (let r = 0; r < repeats; r++) {
                  oneSet.push(...logoSrcs);
                }
                const trackLogos = [...oneSet, ...oneSet];
                return trackLogos.map((src, i) => (
                  <div
                    key={i}
                    className="flex h-[clamp(24px,2.8vw,36px)] w-[clamp(80px,9vw,120px)] shrink-0 items-center justify-center"
                  >
                    {src === infiniteProgressLogo ? (
                      <Image
                        src={infiniteProgressLogo}
                        alt=""
                        width={180}
                        height={45}
                        className="h-full w-full object-contain opacity-55 mix-blend-screen"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-contain opacity-55 mix-blend-screen"
                      />
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="absolute bottom-0 left-1/2 z-30 h-[340px] w-[min(380px,72vw)] -translate-x-1/2 md:bottom-0 md:h-[440px] md:w-[min(560px,84vw)]">
            {activeFigureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeFigureUrl}
                alt=""
                className="h-full w-full object-contain object-bottom transition-opacity duration-300"
                style={{
                  transform: `translate(${activeFigureOffsetX}px, ${activeFigureOffsetY}px) scale(${activeFigureScale})`,
                  transformOrigin: "center bottom",
                }}
              />
            ) : (
              <div className="cta-figure-upload-slot h-full w-full" aria-hidden="true" />
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center pb-4 md:pb-2">
            <div className="flex w-full max-w-2xl flex-row items-center justify-center gap-2 px-4 md:gap-6 md:px-8">
              <Link
                href="/resume"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full border border-edge bg-glass-strong px-3 text-xs text-ink backdrop-blur transition hover:border-edge hover:text-ink md:min-h-12 md:flex-none md:gap-1.5 md:px-6 md:text-sm md:w-48"
                data-text-key="works.ctaResume"
              >
                <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                <span className="truncate">{textOverrides.ctaResume || "查看简历"}</span>
              </Link>
              <Link
                href="/resume#hiring-contact"
                className="group inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-black shadow-sm transition hover:bg-gray-100 md:min-h-12 md:flex-none md:gap-1.5 md:px-6 md:text-sm md:w-52"
                data-text-key="works.ctaHiring"
              >
                <BriefcaseBusiness className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                <span className="truncate">{textOverrides.ctaHiring || "聘用联系"}</span>
              </Link>
              <Link
                href="/resume#commercial-contact"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full border border-edge bg-glass-strong px-3 text-xs text-ink backdrop-blur transition hover:border-copper/60 hover:text-ink md:min-h-12 md:flex-none md:gap-1.5 md:px-6 md:text-sm md:w-48"
                data-text-key="works.ctaCommercial"
              >
                <MessagesSquare className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                <span className="truncate">{textOverrides.ctaCommercial || "商业咨询"}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
