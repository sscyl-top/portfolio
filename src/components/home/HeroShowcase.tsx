"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, Sparkles } from "lucide-react";
import gsap from "gsap";

import { AmbientParticles } from "@/components/home/AmbientParticles";
import { resume } from "@/data/portfolio";

export function HeroShowcase() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!root || prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.from("[data-hero-reveal]", {
        y: 34,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: "power3.out",
      });
      gsap.to("[data-float-card]", {
        y: -12,
        duration: 3.8,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        stagger: 0.18,
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative min-h-screen overflow-hidden px-5 pb-20 pt-28 md:px-8"
    >
      <AmbientParticles />
      <div className="grain" />
      <div className="absolute inset-x-0 top-20 z-10 border-y border-white/10 bg-white/[0.025] py-3">
        <div className="ticker-viewport font-mono text-xs text-white/40">
          <div className="ticker-track">
            {[0, 1].map((group) => (
              <div className="ticker-group" key={group}>
                {resume.highlights
                  .concat(resume.highlights)
                  .map((item, index) => (
                    <span key={`${group}-${item}-${index}`}>{item}</span>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto flex min-h-[calc(100vh-9rem)] max-w-[1720px] items-center justify-center">
        <div className="relative w-full py-10">
          <HeroMainCard />
          <HeroSideCards />

          <div
            data-hero-reveal
            className="mx-auto mt-10 grid max-w-[1280px] gap-6 md:grid-cols-[0.58fr_1fr_auto] md:items-end"
          >
            <p className="font-mono text-sm font-semibold uppercase text-white/82">
              AI / 3D / Motion Design Studio
            </p>
            <p className="max-w-xl text-sm leading-7 text-white/58">
              {resume.strengths[0]}
            </p>
            <span className="font-mono text-sm text-white/68">YR26</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMainCard() {
  return (
    <div
      data-hero-reveal
      className="relative mx-auto aspect-[16/9] w-full max-w-[1280px] overflow-hidden rounded-lg border border-white/15 bg-[radial-gradient(circle_at_66%_30%,rgba(139,215,205,0.22),transparent_28%),radial-gradient(circle_at_34%_72%,rgba(201,162,127,0.16),transparent_34%),linear-gradient(135deg,#191c1d,#050505_66%,#11100e)] p-5 shadow-2xl shadow-black"
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-35" />
      <div className="relative z-10 flex items-center justify-between font-mono text-xs uppercase text-white/50">
        <span>CT DESIGN SYSTEM</span>
        <span>VIDEO SLOT / YR26</span>
      </div>

      <div className="absolute left-5 top-14 rounded-full border border-white/12 bg-black/35 px-4 py-2 font-mono text-xs uppercase text-white/58">
        Upload video here
      </div>

      <div className="absolute bottom-8 left-8 right-8 z-10">
        <p className="font-mono text-xs uppercase text-copper">
          Brand Visual / AI Design / Web Experience
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-[1.02] text-white md:text-5xl">
          让品牌视觉拥有可被记住的数字现场
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/62 md:text-base">
          {resume.positioning}
        </p>
      </div>
    </div>
  );
}

function HeroSideCards() {
  return (
    <>
      <FloatingImageCard
        className="-left-1 top-[27%] hidden w-56 md:block xl:left-9"
        tone="mono"
      />
      <FloatingImageCard
        className="left-[13%] top-[22%] hidden w-48 md:block"
        tone="warm"
      />
      <HeroActions />
      <FloatingImageCard
        className="right-0 top-[69%] hidden w-80 lg:block xl:right-8"
        tone="graphite"
        wide
      />

      <div
        data-float-card
        data-hero-reveal
        className="absolute right-[1%] top-[28%] hidden w-40 rounded-lg border border-white/12 bg-white/[0.06] p-5 backdrop-blur xl:block"
      >
        <Sparkles className="h-6 w-6 text-copper" aria-hidden="true" />
        <p className="mt-6 text-4xl font-semibold text-white">5Y+</p>
        <p className="mt-2 text-xs leading-5 text-white/50">
          品牌视觉与商业设计实践
        </p>
      </div>
    </>
  );
}

function HeroActions() {
  return (
    <div
      data-hero-reveal
      className="absolute right-[14%] top-[47%] hidden w-52 space-y-3 md:block xl:right-[18%]"
    >
      <Link
        href="/works"
        className="group flex items-center justify-between rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-medium text-black shadow-2xl shadow-black/40 transition hover:bg-copper"
      >
        查看作品
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Link>
      <a
        href={resume.downloads.pdf}
        download
        className="group flex items-center justify-between rounded-full border border-white/15 bg-black/35 px-5 py-3 text-sm text-white/78 backdrop-blur transition hover:border-white/40 hover:text-white"
      >
        下载简历
        <Download aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  );
}

function FloatingImageCard({
  className,
  tone,
  wide = false,
}: {
  className: string;
  tone: "mono" | "warm" | "graphite";
  wide?: boolean;
}) {
  const tones = {
    mono: "bg-[radial-gradient(circle_at_52%_36%,rgba(255,255,255,0.32),transparent_26%),linear-gradient(135deg,#1b1b1b,#050505_68%)]",
    warm:
      "bg-[radial-gradient(circle_at_50%_35%,rgba(245,231,206,0.42),transparent_24%),radial-gradient(circle_at_48%_70%,rgba(201,72,53,0.28),transparent_30%),linear-gradient(135deg,#3b3027,#0a0908_72%)]",
    graphite:
      "bg-[radial-gradient(circle_at_62%_42%,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_32%_60%,rgba(139,215,205,0.18),transparent_24%),linear-gradient(135deg,#202426,#050505_68%)]",
  };

  return (
    <div
      data-float-card
      data-hero-reveal
      className={`absolute overflow-hidden rounded-lg border border-white/12 shadow-2xl shadow-black/45 ${className}`}
    >
      <div
        className={`${wide ? "aspect-[2.2/1]" : "aspect-[1.18/1]"} ${
          tones[tone]
        }`}
      />
    </div>
  );
}
