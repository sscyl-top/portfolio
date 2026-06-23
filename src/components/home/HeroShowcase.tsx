"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, Sparkles } from "lucide-react";
import gsap from "gsap";

import { AmbientParticles } from "@/components/home/AmbientParticles";
import { toneClass } from "@/lib/workTone";
import { resume as staticResume } from "@/data/portfolio";

export type HeroData = {
  positioning?: string;
  downloadsPdf?: string;
  mainVideoUrl?: string;
  sideCard1VideoUrl?: string;
  sideCard2VideoUrl?: string;
  sideCard3VideoUrl?: string;
};

// merged data available to all sub-components
let resume = { ...staticResume };

// Video URLs set from CMS data — updated on each render
let heroVideos = {
  main: "",
  side1: "",
  side2: "",
  side3: "",
};

const heroFloatingMediaCards = [
  {
    // mono: 始终挂在左外侧，宽屏逐渐回缩
    className:
      "z-20 -left-14 top-[32%] hidden w-[200px] h-[155px] md:block lg:w-[240px] lg:h-[186px] xl:w-[280px] xl:h-[217px] xl:-left-20 2xl:-left-28",
    tone: "mono" as const,
    videoKey: "side1" as const,
  },
  {
    // warm: 窄屏挂左外侧，xl 以上才回缩到边缘内侧
    className:
      "z-10 -left-2 top-[15%] hidden w-[180px] h-[137px] md:block lg:left-0 lg:w-[215px] lg:h-[163px] xl:left-2 xl:w-[250px] xl:h-[190px] 2xl:left-4",
    tone: "warm" as const,
    videoKey: "side2" as const,
  },
  {
    // graphite: lg 起挂在右外侧，宽屏更靠右
    className:
      "-right-[calc(2.75rem+3vw)] top-[69%] hidden w-72 h-[150px] lg:block xl:w-96 xl:h-[200px] 2xl:-right-[calc(5rem+3vw)]",
    tone: "graphite" as const,
    videoKey: "side3" as const,
    wide: true,
  },
];

export function HeroShowcase({ data }: { data?: HeroData }) {
  // merge CMS data on top of static resume for this render
  resume = {
    ...staticResume,
    ...(data ?? {}),
    downloads: {
      ...staticResume.downloads,
      pdf: data?.downloadsPdf ?? staticResume.downloads.pdf,
    },
  };
  heroVideos = {
    main: data?.mainVideoUrl ?? "",
    side1: data?.sideCard1VideoUrl ?? "",
    side2: data?.sideCard2VideoUrl ?? "",
    side3: data?.sideCard3VideoUrl ?? "",
  };
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
      className="relative min-h-screen overflow-hidden px-4 pb-16 pt-24 md:px-8 md:pt-32"
    >
      <AmbientParticles />
      <div className="grain" />
      <div className="absolute inset-x-0 top-16 z-10 border-y border-white/10 bg-white/[0.025] py-2.5 md:top-24 md:py-3">
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

      <div className="relative z-20 mx-auto flex min-h-[calc(100vh-10rem)] max-w-[1880px] items-center justify-center">
        <div className="relative w-full pb-10 pt-16">
          <HeroMainCard />
          <HeroSideCards />

          <div
            data-hero-reveal
            className="mx-auto mt-8 grid max-w-[1420px] gap-4 md:mt-10 md:grid-cols-[1fr_auto] md:items-end"
          >
            <p className="font-mono text-xs font-semibold uppercase text-white/82 md:text-sm">
              AI / 3D / Motion Design Studio
            </p>
            <span className="font-mono text-xs text-white/68 md:text-sm">YR26</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMainCard() {
  return (
    <>
    <div
      data-hero-reveal
      className="relative mx-auto aspect-[5/3] w-full max-w-[1420px] overflow-hidden rounded-lg border border-white/15 bg-[radial-gradient(circle_at_66%_30%,rgba(139,215,205,0.22),transparent_28%),radial-gradient(circle_at_34%_72%,rgba(201,162,127,0.16),transparent_34%),linear-gradient(135deg,#191c1d,#050505_66%,#11100e)] p-3 shadow-2xl shadow-black md:aspect-[16/9] md:px-5 md:pt-5 md:pb-[40px]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-35" />

      {/* Background video (when configured via CMS) */}
      {heroVideos.main ? (
        <video
          data-testid="hero-main-video"
          src={heroVideos.main}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : null}

      {/* Dark overlay for text readability when video is present */}
      {heroVideos.main ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      ) : null}

      <div className="relative z-10 flex items-center justify-between font-mono text-[9px] uppercase text-white/50 md:text-xs">
        <span>CT DESIGN SYSTEM</span>
        <span>{heroVideos.main ? "LIVE VIDEO" : "VIDEO SLOT / YR26"}</span>
      </div>

      {!heroVideos.main ? (
        <div className="absolute left-4 top-12 hidden rounded-full border border-white/12 bg-black/35 px-3 py-1.5 font-mono text-[10px] uppercase text-white/58 md:block md:left-5 md:top-14 md:px-4 md:py-2 md:text-xs">
          Upload video here
        </div>
      ) : null}

      <div className="absolute bottom-5 left-5 right-5 z-10 hidden md:block md:bottom-8 md:left-8 md:right-8">
        <p className="font-mono text-xs uppercase text-copper">
          Brand Visual / AI Design / Web Experience
        </p>
        <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-[1.05] text-white md:text-5xl">
          让品牌视觉拥有可被记住的数字现场
        </h1>
        <p className="mt-4 max-w-xl text-[13px] leading-6 text-white/62 md:text-base">
          {resume.positioning}
        </p>
      </div>
    </div>
    <div className="mt-4 block px-1 md:hidden" data-hero-reveal>
      <p className="font-mono text-[10px] uppercase text-copper">
        Brand Visual / AI Design / Web Experience
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-[1.05] text-white">
        让品牌视觉拥有被记住的数字现场
      </h1>
      <p className="mt-3 text-[13px] leading-6 text-white/62">
        {resume.positioning}
      </p>
    </div>
    </>
  );
}

function HeroSideCards() {
  return (
    <>
      {heroFloatingMediaCards.slice(0, 2).map((card) => (
        <FloatingImageCard
          key={card.tone}
          className={card.className}
          tone={card.tone}
          videoSrc={heroVideos[card.videoKey]}
          wide={card.wide}
        />
      ))}
      <HeroActions />
      <FloatingImageCard
        className={heroFloatingMediaCards[2].className}
        tone={heroFloatingMediaCards[2].tone}
        videoSrc={heroVideos[heroFloatingMediaCards[2].videoKey]}
        wide={heroFloatingMediaCards[2].wide}
      />

      <div
        data-float-card
        data-hero-reveal
        className="absolute right-[4%] top-[29%] hidden w-44 rounded-lg bg-white/[0.08] p-5 backdrop-blur xl:block 2xl:right-[5%]"
      >
        <Sparkles className="h-6 w-6 text-copper" aria-hidden="true" />
        <p className="mt-6 text-4xl font-semibold text-white">5年+</p>
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
      className="hidden"
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

export function FloatingImageCard({
  className,
  tone = "mono",
  videoSrc = "",
}: {
  className: string;
  tone?: "mono" | "warm" | "graphite";
  videoSrc?: string;
  wide?: boolean;
}) {
  return (
    <div
      data-float-card
      data-hero-reveal
      data-testid="hero-floating-media-card"
      className={`group absolute overflow-hidden rounded-lg ${toneClass(tone)} ${className}`}
    >
      {videoSrc ? (
        <video
          data-testid="hero-floating-media-video"
          src={videoSrc}
          className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : null}
    </div>
  );
}
