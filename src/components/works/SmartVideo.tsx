"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type MotionEntry = {
  id: number;
  el: HTMLElement;
  ratio: number;
  kind: "video" | "gif";
  videoEl?: HTMLVideoElement;
  isUserControlled: boolean;
  isSystemPaused: boolean;
  onPlayStateChange?: (playing: boolean) => void;
};

let nextId = 1;
const motionRegistry = new Map<number, MotionEntry>();
let activeMotionId: number | null = null;
let observer: IntersectionObserver | null = null;

function ensureObserver(): IntersectionObserver {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const id = (el as HTMLElement & { __motionId?: number }).__motionId;
        if (id === undefined) continue;
        const reg = motionRegistry.get(id);
        if (!reg) continue;
        reg.ratio = entry.intersectionRatio;
      }
      scheduleUpdate();
    },
    {
      threshold: [0, 0.45, 0.5, 0.55, 0.9, 0.95, 1],
      rootMargin: "0px",
    },
  );

  return observer;
}

let updateScheduled = false;
function scheduleUpdate() {
  if (updateScheduled) return;
  updateScheduled = true;
  requestAnimationFrame(() => {
    updateScheduled = false;
    updatePlayback();
  });
}

function updatePlayback() {
  const fullyVisible: MotionEntry[] = [];

  for (const entry of motionRegistry.values()) {
    if (entry.kind === "video" && !entry.isUserControlled && entry.ratio < 0.5) {
      systemPauseVideo(entry);
    }
    if (entry.kind === "video" && entry.isUserControlled) continue;
    if (entry.ratio >= 0.95) {
      fullyVisible.push(entry);
    }
  }

  let shouldActivate: MotionEntry | null = null;
  if (fullyVisible.length > 0) {
    shouldActivate = fullyVisible[fullyVisible.length - 1];
  }

  if (shouldActivate) {
    if (activeMotionId !== shouldActivate.id) {
      const prev = activeMotionId !== null ? motionRegistry.get(activeMotionId) : null;
      if (prev && prev.kind === "video" && !prev.isUserControlled) {
        systemPauseVideo(prev);
      }
      activeMotionId = shouldActivate.id;
      if (shouldActivate.kind === "video" && shouldActivate.videoEl) {
        systemPlayVideo(shouldActivate);
      }
    } else if (shouldActivate.kind === "video" && shouldActivate.videoEl) {
      if (shouldActivate.videoEl.paused && !shouldActivate.isUserControlled) {
        systemPlayVideo(shouldActivate);
      }
    }
  } else {
    const active = activeMotionId !== null ? motionRegistry.get(activeMotionId) : null;
    if (active && active.kind === "video" && !active.isUserControlled) {
      if (active.ratio < 0.5) {
        systemPauseVideo(active);
        activeMotionId = null;
      }
    }
  }
}

function systemPlayVideo(entry: MotionEntry) {
  const el = entry.videoEl;
  if (!el || !el.paused) return;
  el.muted = false;
  entry.isSystemPaused = false;
  const p = el.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      entry.isUserControlled = true;
    });
  }
}

function systemPauseVideo(entry: MotionEntry) {
  const el = entry.videoEl;
  if (!el || el.paused) {
    if (entry.id === activeMotionId) activeMotionId = null;
    return;
  }
  entry.isSystemPaused = true;
  el.pause();
  if (entry.id === activeMotionId) activeMotionId = null;
}

function registerMotion(
  el: HTMLElement,
  kind: "video" | "gif",
  videoEl?: HTMLVideoElement,
  onPlayStateChange?: (playing: boolean) => void,
): () => void {
  const id = nextId++;
  (el as HTMLElement & { __motionId?: number }).__motionId = id;

  const entry: MotionEntry = {
    id,
    el,
    ratio: 0,
    kind,
    videoEl,
    isUserControlled: false,
    isSystemPaused: false,
    onPlayStateChange,
  };
  motionRegistry.set(id, entry);

  const cleanupFns: (() => void)[] = [];

  if (kind === "video" && videoEl) {
    const onPause = () => {
      entry.onPlayStateChange?.(false);
      if (entry.isSystemPaused || entry.isUserControlled) return;
      if (videoEl.seeking || videoEl.ended) return;
      entry.isUserControlled = true;
    };
    const onPlay = () => {
      entry.onPlayStateChange?.(true);
      entry.isSystemPaused = false;
      if (entry.isUserControlled && activeMotionId !== id) {
        const prev = activeMotionId !== null ? motionRegistry.get(activeMotionId) : null;
        if (prev && prev.kind === "video" && !prev.isUserControlled) {
          systemPauseVideo(prev);
        }
        activeMotionId = id;
      }
    };
    const onVolume = () => {
      if (!videoEl.muted && videoEl.volume > 0) {
        entry.isUserControlled = true;
      }
    };
    const onNativeClick = () => {
      entry.isUserControlled = true;
    };
    const onEnded = () => {
      videoEl.currentTime = 0;
      const p = videoEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    };
    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("volumechange", onVolume);
    videoEl.addEventListener("click", onNativeClick);
    videoEl.addEventListener("ended", onEnded);
    cleanupFns.push(() => {
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("volumechange", onVolume);
      videoEl.removeEventListener("click", onNativeClick);
      videoEl.removeEventListener("ended", onEnded);
    });
  }

  ensureObserver().observe(el);
  scheduleUpdate();

  return () => {
    ensureObserver().unobserve(el);
    motionRegistry.delete(id);
    for (const fn of cleanupFns) fn();
    if (activeMotionId === id) activeMotionId = null;
    scheduleUpdate();
  };
}

type SmartVideoProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "ref" | "loop"> & {
  containerClassName?: string;
  showContainer?: boolean;
  controls?: boolean;
};

export function SmartVideo({
  containerClassName,
  showContainer = true,
  className,
  src,
  controls = true,
  ...rest
}: SmartVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const id = (el as HTMLVideoElement & { __motionId?: number }).__motionId;
    const entry = id !== undefined ? motionRegistry.get(id) : null;
    if (entry) entry.isUserControlled = true;
    if (el.paused) {
      el.muted = false;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    } else {
      el.pause();
    }
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    return registerMotion(el, "video", el, setIsPlaying);
  }, []);

  const showBigButton = !isPlaying;

  const videoElement = (
    <video
      ref={videoRef}
      src={src}
      loop
      playsInline
      preload="metadata"
      controls={controls}
      className={className}
      {...rest}
    />
  );

  if (showContainer) {
    return (
      <div className={`relative w-full overflow-hidden bg-panel ${containerClassName ?? ""}`}>
        {videoElement}
        {showBigButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              togglePlay();
            }}
            className="absolute inset-0 z-10 flex items-center justify-center"
            aria-label="播放"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-transform duration-200 hover:scale-110 hover:bg-black/60 md:h-24 md:w-24">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-1 h-10 w-10 text-white md:h-12 md:w-12"
              >
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
              </svg>
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {videoElement}
      {showBigButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            togglePlay();
          }}
          className="absolute inset-0 z-10 flex items-center justify-center"
          aria-label="播放"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-transform duration-200 hover:scale-110 hover:bg-black/60 md:h-24 md:w-24">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-10 w-10 text-white md:h-12 md:w-12">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

type SmartGifBoundaryProps = {
  children: React.ReactNode;
  className?: string;
};

export function SmartGifBoundary({ children, className }: SmartGifBoundaryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerMotion(el, "gif");
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
