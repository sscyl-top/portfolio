"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, Download, Sparkles } from "lucide-react";
import gsap from "gsap";

import { toneClass } from "@/lib/workTone";
import { resume as staticResume } from "@/data/portfolio";

// 使用 next/dynamic 懒加载 3D 粒子组件，将 three.js 从首屏 JS 包中拆分出去
// ssr: false 避免 SSR 阶段初始化 WebGL 上下文，确保首屏不被 3D 阻塞
const AmbientParticles = dynamic(
  () =>
    import("@/components/home/AmbientParticles").then(
      (mod) => mod.AmbientParticles,
    ),
  { ssr: false, loading: () => null },
);

export type HeroTextOverrides = {
  desktopTitle?: string;
  mobileTitle?: string;
  kicker?: string;
  experienceLabel?: string;
  tickerItems?: string[];
  mainCta?: string;
  secondaryCta?: string;
};

export type HeroData = {
  positioning?: string;
  downloadsPdf?: string;
  mainVideoUrl?: string;
  sideCard1VideoUrl?: string;
  sideCard2VideoUrl?: string;
  sideCard3VideoUrl?: string;
  textOverrides?: HeroTextOverrides;
};



const heroFloatingMediaCards = [
  {
    // mono: 窄屏小而远，宽屏逐步放大回缩
    className:
      "z-20 -left-24 top-[32%] hidden w-[160px] h-[124px] md:block lg:w-[200px] lg:h-[155px] lg:-left-20 xl:w-[280px] xl:h-[217px] 2xl:-left-28",
    tone: "mono" as const,
    videoKey: "side1" as const,
  },
  {
    // warm: 窄屏挂左外侧，xl 以上才回缩到边缘内侧
    className:
      "z-10 -left-10 top-[15%] hidden w-[140px] h-[106px] md:block lg:w-[180px] lg:h-[137px] lg:-left-6 xl:left-2 xl:w-[250px] xl:h-[190px] 2xl:left-4",
    tone: "warm" as const,
    videoKey: "side2" as const,
  },
  {
    // graphite: xl 起才显示（最宽的卡，窄屏不显示避免挤压）
    className:
      "-right-[calc(2rem+3vw)] top-[69%] hidden w-96 h-[200px] xl:block 2xl:-right-[calc(3rem+3vw)]",
    tone: "graphite" as const,
    videoKey: "side3" as const,
    wide: true,
  },
];

function MeteorShower() {
  const meteor1Ref = useRef<HTMLDivElement>(null);
  const meteor2Ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const ANIM_DURATION = 10000;
    const FADE_GUARD = 500;

    const playOne = (el: HTMLDivElement | null): Promise<void> => {
      return new Promise((resolve) => {
        if (!el) {
          resolve();
          return;
        }
        el.classList.remove("is-animating");
        void el.offsetWidth;
        el.classList.add("is-animating");
        const total = ANIM_DURATION + FADE_GUARD;
        setTimeout(() => {
          el.classList.remove("is-animating");
          resolve();
        }, total);
      });
    };

    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 3000;
      timeoutRef.current = setTimeout(triggerBatch, delay);
    };

    const triggerBatch = () => {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;

      const m1 = meteor1Ref.current;
      const m2 = meteor2Ref.current;

      const useM2 = Math.random() > 0.5;
      const m2Delay = useM2 ? 600 + Math.random() * 1000 : 0;

      const p1 = playOne(m1);

      let p2: Promise<void> = Promise.resolve();
      if (useM2 && m2) {
        p2 = new Promise((resolve) => {
          setTimeout(() => {
            playOne(m2).then(resolve);
          }, m2Delay);
        });
      }

      Promise.all([p1, p2]).then(() => {
        isPlayingRef.current = false;
        scheduleNext();
      });
    };

    timeoutRef.current = setTimeout(triggerBatch, 300);

    return () => {
      isPlayingRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        ref={meteor1Ref}
        className="meteor"
        style={{ top: "4%", right: "-80px" }}
      >
        <div className="meteor-y">
          <div className="meteor-visual" />
        </div>
      </div>
      <div
        ref={meteor2Ref}
        className="meteor meteor-secondary"
        style={{ top: "8%", right: "-50px" }}
      >
        <div className="meteor-y">
          <div className="meteor-visual" />
        </div>
      </div>
    </div>
  );
}

export function HeroShowcase({ data }: { data?: HeroData }) {
  const resume = useMemo(
    () => ({
      ...staticResume,
      ...(data ?? {}),
      downloads: {
        ...staticResume.downloads,
        pdf: data?.downloadsPdf ?? staticResume.downloads.pdf,
      },
    }),
    [data],
  );
  const heroVideos = useMemo(
    () => ({
      main: data?.mainVideoUrl ?? "",
      side1: data?.sideCard1VideoUrl ?? "",
      side2: data?.sideCard2VideoUrl ?? "",
      side3: data?.sideCard3VideoUrl ?? "",
    }),
    [data],
  );
  const heroTextOverrides = data?.textOverrides ?? {};
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
      <MeteorShower />
      <div className="grain" />
      <HeroTicker textOverrides={heroTextOverrides} resume={resume} />

      <div className="relative z-20 mx-auto flex min-h-[calc(100vh-10rem)] max-w-[1880px] items-center justify-center">
        <div className="relative w-full pb-10 pt-16">
          <HeroMainCard
            resume={resume}
            textOverrides={heroTextOverrides}
            videos={heroVideos}
          />
          <HeroSideCards
            resume={resume}
            textOverrides={heroTextOverrides}
            videos={heroVideos}
          />

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

function HeroMainCard({
  resume,
  textOverrides,
  videos,
}: {
  resume: typeof staticResume;
  textOverrides: HeroTextOverrides;
  videos: { main: string; side1: string; side2: string; side3: string };
}) {
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  // 自动播放视频（桌面和手机端都自动播放），使用 preload="metadata" 边播边加载省流量
  useEffect(() => {
    const video = mainVideoRef.current;
    if (!video || !videos.main) return;

    const tryPlay = () => {
      const promise = video.play();
      if (promise === undefined) return;
      promise.catch(() => {});
    };

    tryPlay();
    document.addEventListener("WeixinJSBridgeReady", tryPlay, { once: true });

    return () => {
      document.removeEventListener("WeixinJSBridgeReady", tryPlay);
    };
  }, [videos.main]);

  return (
    <>
    <div
      data-hero-reveal
      className="relative mx-auto aspect-[5/3] w-full max-w-[1420px] overflow-hidden rounded-lg border border-white/15 bg-[radial-gradient(circle_at_66%_30%,rgba(139,215,205,0.22),transparent_28%),radial-gradient(circle_at_34%_72%,rgba(201,162,127,0.16),transparent_34%),linear-gradient(135deg,#191c1d,#050505_66%,#11100e)] p-3 shadow-2xl shadow-black md:aspect-[16/9] md:px-5 md:pt-5 md:pb-[40px]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-35" />

      {/* Background video (when configured via CMS) */}
      {videos.main ? (
        <video
          ref={mainVideoRef}
          data-testid="hero-main-video"
          src={videos.main}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : null}

      {/* Dark overlay for text readability when video is present */}
      {videos.main ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      ) : null}

      <div className="relative z-10 flex items-center justify-between font-mono text-[9px] uppercase text-white/50 md:text-xs">
        <span>CT DESIGN SYSTEM</span>
        <span>{videos.main ? "LIVE VIDEO" : "VIDEO SLOT / YR26"}</span>
      </div>

      {!videos.main ? (
        <div className="absolute left-4 top-12 hidden rounded-full border border-white/12 bg-black/35 px-3 py-1.5 font-mono text-[10px] uppercase text-white/58 md:block md:left-5 md:top-14 md:px-4 md:py-2 md:text-xs">
          Upload video here
        </div>
      ) : null}

      <div className="absolute bottom-5 left-5 right-5 z-10 hidden md:block md:bottom-8 md:left-8 md:right-8">
        <p className="font-mono text-xs uppercase text-copper" data-text-key="hero.kicker">
          {textOverrides.kicker || "Brand Visual / AI Design / Web Experience"}
        </p>
        <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-[1.05] text-white md:text-5xl" data-text-key="hero.title.desktop">
          {textOverrides.desktopTitle || "让品牌视觉拥有可被记住的数字现场"}
        </h1>
        <p className="mt-4 max-w-xl text-[13px] leading-6 text-white/62 md:text-base">
          {resume.positioning}
        </p>
      </div>
    </div>
    <div className="mt-4 block px-1 md:hidden" data-hero-reveal>
      <p className="font-mono text-[10px] uppercase text-copper" data-text-key="hero.kicker">
        {textOverrides.kicker || "Brand Visual / AI Design / Web Experience"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-[1.05] text-white" data-text-key="hero.title.mobile">
        {textOverrides.mobileTitle || "让品牌视觉拥有被记住的数字现场"}
      </h1>
      <p className="mt-3 text-[13px] leading-6 text-white/62">
        {resume.positioning}
      </p>
    </div>
    </>
  );
}

function HeroSideCards({
  resume,
  textOverrides,
  videos,
}: {
  resume: typeof staticResume;
  textOverrides: HeroTextOverrides;
  videos: { main: string; side1: string; side2: string; side3: string };
}) {
  return (
    <>
      {heroFloatingMediaCards.slice(0, 2).map((card) => (
        <FloatingImageCard
          key={card.tone}
          className={card.className}
          tone={card.tone}
          videoSrc={videos[card.videoKey]}
          wide={card.wide}
        />
      ))}
      <HeroActions resume={resume} />
      <FloatingImageCard
        className={heroFloatingMediaCards[2].className}
        tone={heroFloatingMediaCards[2].tone}
        videoSrc={videos[heroFloatingMediaCards[2].videoKey]}
        wide={heroFloatingMediaCards[2].wide}
      />

      <div
        data-float-card
        data-hero-reveal
        className="absolute -right-[2.5%] top-[29%] hidden w-44 rounded-lg bg-white/[0.08] p-5 backdrop-blur xl:block 2xl:-right-[1.5%]"
      >
        <Sparkles className="h-6 w-6 text-copper" aria-hidden="true" />
        <p className="mt-6 text-4xl font-semibold text-white" data-text-key="hero.experience.years">5年+</p>
        <p className="mt-2 text-xs leading-5 text-white/50" data-text-key="hero.experience.label">
          {textOverrides.experienceLabel || "品牌视觉与商业设计实践"}
        </p>
      </div>
    </>
  );
}

function HeroActions({ resume }: { resume: typeof staticResume }) {
  return (
    <div
      data-hero-reveal
      className="hidden"
    >
      <Link
        href="/works"
        className="group flex items-center justify-between rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-medium text-black shadow-2xl shadow-black/40 transition hover:bg-copper"
        data-text-key="hero.cta.main"
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
        data-text-key="hero.cta.secondary"
      >
        下载简历
        <Download aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  );
}

function HeroTicker({
  textOverrides,
  resume,
}: {
  textOverrides: HeroTextOverrides;
  resume: typeof staticResume;
}) {
  const tickerItems =
    textOverrides.tickerItems && textOverrides.tickerItems.length > 0
      ? textOverrides.tickerItems
      : resume.highlights;

  return (
    <div className="absolute inset-x-0 top-16 z-10 overflow-hidden border-y border-white/10 bg-white/[0.025] py-3.5 md:top-24 md:py-4">
      <div className="ticker-track flex w-max items-center font-mono text-sm text-white/45 md:text-base">
        {[0, 1, 2, 3].map((group) => (
          <div key={group} className="ticker-group flex shrink-0 items-center gap-10 whitespace-nowrap px-5">
            {tickerItems.map((item, index) => (
              <span key={`${group}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const card = cardRef.current;
    if (!video || !card || !videoSrc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(card);

    return () => observer.disconnect();
  }, [videoSrc]);

  return (
    <div
      ref={cardRef}
      data-float-card
      data-hero-reveal
      data-testid="hero-floating-media-card"
      className={`group absolute overflow-hidden rounded-lg ${toneClass(tone)} ${className}`}
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          data-testid="hero-floating-media-video"
          src={videoSrc}
          className="absolute inset-0 h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : null}
    </div>
  );
}
