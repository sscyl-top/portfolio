"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { memo, useEffect, useRef, useState } from "react";

import type { Work } from "@/data/portfolio";
import { WorkMediaFrame } from "./WorkMediaFrame";

type RepresentativeWorksProps = { works: Work[] };

type RepresentativeCardStyle = CSSProperties & {
  "--slot-x": string; "--slot-y": string; "--slot-r": string;
  "--slot-spread": string; "--card-lift": string; "--card-scale": number;
  "--tilt-x": string; "--tilt-y": string; "--intro-delay": string;
};

const fanSlots = [
  { x: -24, y: 92, r: -18, z: 1 }, { x: -17, y: 52, r: -11, z: 2 },
  { x: -8.5, y: 18, r: -5.5, z: 3 }, { x: 0, y: -18, r: 0, z: 7 },
  { x: 8.5, y: 18, r: 5.5, z: 3 }, { x: 17, y: 52, r: 11, z: 2 },
  { x: 24, y: 92, r: 18, z: 1 },
];

const CARD_COUNT = 7;

type RepresentativeCardProps = {
  work: Work;
  index: number;
  isActive: boolean;
  hasActive: boolean;
  onEnter: () => void;
  onMove: (e: React.PointerEvent<HTMLAnchorElement>) => void;
  onLeave: (e: React.PointerEvent<HTMLAnchorElement>) => void;
};

const RepresentativeCard = memo(function RepresentativeCard({
  work,
  index,
  isActive,
  hasActive,
  onEnter,
  onMove,
  onLeave,
}: RepresentativeCardProps) {
  const slot = fanSlots[index] ?? fanSlots[fanSlots.length - 1];
  const cardStyle: RepresentativeCardStyle = {
    zIndex: isActive ? 30 : slot.z,
    opacity: hasActive && !isActive ? 0.65 : 1,
    "--slot-x": `${slot.x}vw`,
    "--slot-y": `${slot.y}px`,
    "--slot-r": `${slot.r}deg`,
    "--slot-spread": `${hasActive && !isActive ? slot.x * 0.06 : 0}vw`,
    "--card-lift": `${isActive ? -32 : 0}px`,
    "--card-scale": isActive ? 1.06 : hasActive ? 0.95 : 1,
    "--tilt-x": "0deg",
    "--tilt-y": "0deg",
    "--intro-delay": `${index * 80}ms`,
  };

  return (
    <Link
      key={work.slug}
      href={`/works/${work.slug}?from=featured`}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="representative-work-card group absolute left-1/2 top-[46%] block w-[clamp(214px,18vw,278px)] origin-bottom overflow-hidden rounded-[34px] border border-edge bg-surface p-2 text-left shadow-[var(--shadow-card)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-edge hover:shadow-[var(--shadow-card-hover)] focus-visible:border-copper"
      style={cardStyle}
    >
      <article className="relative h-[clamp(370px,35vw,486px)] overflow-hidden rounded-[28px]">
        <WorkMediaFrame media={work.representativeCoverMedia || work.coverMedia} tone={work.coverTone} hover />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,var(--surface-3),transparent_20%),linear-gradient(to_bottom,transparent_42%,var(--overlay))]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{work.year}</span>
        </div>
        <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-edge bg-glass p-3 shadow-2xl backdrop-blur-lg transition duration-300 group-hover:bg-glass-strong">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-copper">{work.category}</p>
              <h2 className="mt-1.5 text-lg font-semibold leading-tight text-ink">{work.title}</h2>
            </div>
            <ArrowUpRight
              aria-hidden="true"
              className="mt-1 h-5 w-5 flex-none text-ink-3 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
            />
          </div>
          <p className="mt-2 line-clamp-1 text-xs leading-5 text-ink-2">{work.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {work.tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-edge-2 bg-surface px-2.5 py-1 font-mono text-[10px] text-ink-2"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.hasActive === nextProps.hasActive &&
    prevProps.work.slug === nextProps.work.slug
  );
});

export function RepresentativeWorks({ works }: RepresentativeWorksProps) {
  const displayWorks = works.slice(0, CARD_COUNT);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const frameRef = useRef<number | null>(null);

  // Mobile carousel
  const [centerIndex, setCenterIndex] = useState(3);
  const [isAnimating, setIsAnimating] = useState(false);
  const [wrapped, setWrapped] = useState<Set<number>>(new Set());
  const touchStartX = useRef(0);
  const accumulatedDrag = useRef(0);
  const hasDragged = useRef(false);

  useEffect(() => {
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, []);

  const computeRelPos = (realIndex: number, center: number) =>
    ((realIndex - center + CARD_COUNT + 3) % CARD_COUNT) - 3;

  const snapTo = (idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    accumulatedDrag.current = 0;

    const nextWrapped = new Set<number>();
    displayWorks.forEach((_, realIndex) => {
      const prevRel = computeRelPos(realIndex, centerIndex);
      const nextRel = computeRelPos(realIndex, idx);
      if (Math.abs(nextRel - prevRel) > 3) {
        nextWrapped.add(realIndex);
      }
    });
    setWrapped(nextWrapped);
    setCenterIndex(idx);
    setTimeout(() => setWrapped(new Set()), 50);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    accumulatedDrag.current = 0;
    hasDragged.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return;
    accumulatedDrag.current = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(accumulatedDrag.current) > 5) hasDragged.current = true;
  };

  const handleTouchEnd = () => {
    if (isAnimating) return;
    const dx = accumulatedDrag.current;
    if (Math.abs(dx) > 40) {
      const step = dx > 0 ? -1 : 1;
      snapTo(((centerIndex + step) % CARD_COUNT + CARD_COUNT) % CARD_COUNT);
    }
  };

  const [isMouseDown, setIsMouseDown] = useState(false);
  const mouseStartX = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    setIsMouseDown(true);
    mouseStartX.current = e.clientX;
    accumulatedDrag.current = 0;
    hasDragged.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || isAnimating) return;
    accumulatedDrag.current = e.clientX - mouseStartX.current;
    if (Math.abs(accumulatedDrag.current) > 5) hasDragged.current = true;
  };

  const handleMouseUp = () => {
    if (!isMouseDown || isAnimating) { setIsMouseDown(false); return; }
    setIsMouseDown(false);
    const dx = accumulatedDrag.current;
    if (Math.abs(dx) > 40) {
      const step = dx > 0 ? -1 : 1;
      snapTo(((centerIndex + step) % CARD_COUNT + CARD_COUNT) % CARD_COUNT);
    }
  };

  const visibleCards: { work: Work; realIndex: number; relPos: number }[] = displayWorks.map((work, realIndex) => {
    const rawPos = (realIndex - centerIndex + CARD_COUNT + 3) % CARD_COUNT;
    const relPos = rawPos - 3;
    return { work, realIndex, relPos };
  });

  return (
    <section id="section-featured" className="relative overflow-hidden px-5 pb-20 pt-28 md:px-8 md:pt-48">
      <div className="relative mx-auto max-w-7xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-copper" data-text-key="works.featuredKicker">Featured Works</p>
        <h1 className="mt-3 text-5xl font-semibold text-ink md:text-7xl" data-text-key="works.featuredTitle">代表作</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink-2 md:text-lg" data-text-key="works.featuredDescription">
          从品牌全案、视觉系统到 AIGC 提案能力，先用 7 个关键项目建立第一印象。
        </p>

        {/* DESKTOP: fan */}
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
          <div className="featured-glow pointer-events-none absolute left-1/2 top-[45%] h-[500px] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
          {displayWorks.map((work, index) => {
            const isActive = activeIndex === index;
            const hasActive = activeIndex !== null;
            return (
              <RepresentativeCard
                key={work.slug}
                work={work}
                index={index}
                isActive={isActive}
                hasActive={hasActive}
                onEnter={() => setActiveIndex(index)}
                onMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const target = event.currentTarget;
                  const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 5.5;
                  const ny = ((event.clientY - rect.top) / rect.height - 0.5) * -4.5;
                  if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
                  frameRef.current = requestAnimationFrame(() => {
                    target.style.setProperty("--tilt-x", `${ny}deg`);
                    target.style.setProperty("--tilt-y", `${nx}deg`);
                    frameRef.current = null;
                  });
                }}
                onLeave={(e) => {
                  e.currentTarget.style.setProperty("--tilt-x", "0deg");
                  e.currentTarget.style.setProperty("--tilt-y", "0deg");
                }}
              />
            );
          })}
        </div>

        {/* MOBILE: 扇形展开 */}
        <div
          className="relative mt-8 md:hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="relative mx-auto h-[420px] w-full max-w-[320px] overflow-visible">
            {visibleCards.map(({ work, realIndex, relPos }) => {
              const absPos = Math.abs(relPos);
              const isCenter = relPos === 0;
              const x = relPos * 85;
              const scale = isCenter ? 1 : 0.82 - absPos * 0.04;
              const y = absPos * 14;
              const rotate = relPos * 4;
              const opacity = isCenter ? 1 : 0.55 - absPos * 0.09;
              const zIdx = isCenter ? 20 : 10 - absPos;

              const style: CSSProperties = {
                position: "absolute",
                left: "50%",
                top: 0,
                width: "80%",
                transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${rotate}deg) scale(${scale})`,
                transition: wrapped.has(realIndex)
                  ? "opacity 0.35s ease"
                  : "transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease",
                zIndex: zIdx,
                opacity: opacity,
                pointerEvents: isCenter ? "auto" : "none",
              };

              return (
                <Link
                  key={`s-${realIndex}`}
                  href={`/works/${work.slug}?from=featured`}
                  onClick={(e) => {
                    if (hasDragged.current) { e.preventDefault(); return; }
                  }}
                  style={style}
                  className="group block overflow-hidden rounded-2xl border border-edge bg-surface p-1.5 shadow-[var(--shadow-card)] backdrop-blur-sm"
                >
                  <article className="relative aspect-[3/4.5] overflow-hidden rounded-xl">
                    <WorkMediaFrame media={work.representativeCoverMedia || work.coverMedia} tone={work.coverTone} hover={false} />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_36%,var(--overlay))]" />
                    {isCenter && (
                      <>
                        <div className="absolute inset-x-3 top-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                          <span>0{realIndex + 1}</span><span>{work.year}</span>
                        </div>
                        <div className="absolute inset-x-2 bottom-2 rounded-xl border border-edge-2 bg-glass-strong p-2.5 backdrop-blur-md">
                          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-copper">{work.category}</p>
                          <h2 className="mt-1 text-sm font-semibold leading-snug text-ink">{work.title}</h2>
                          <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-ink-2">{work.subtitle}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {work.tags.slice(0, 1).map((tag) => (
                              <span key={tag} className="rounded-full border border-edge-2 bg-surface-2 px-2 py-0.5 font-mono text-[9px] text-ink-3">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </article>
                </Link>
              );
            })}
          </div>

          {/* 指示器 */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {displayWorks.map((_, i) => (
              <span key={i}
                className={`h-1.5 rounded-full transition-all duration-250 ${
                  i === centerIndex ? "w-6 bg-copper" : "w-1.5 bg-edge-2"
                }`} />
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-ink-4" data-text-key="works.swipeHint">左右滑动</p>
        </div>
      </div>
    </section>
  );
}
