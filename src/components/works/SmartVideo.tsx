"use client";

import { useEffect, useRef } from "react";

type MotionEntry = {
  id: number;
  el: HTMLElement;
  ratio: number;
  kind: "video" | "gif";
  videoEl?: HTMLVideoElement;
  isUserControlled: boolean;
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
  const halfHiddenVideos: MotionEntry[] = [];

  for (const entry of motionRegistry.values()) {
    if (entry.kind === "video" && entry.isUserControlled) continue;
    if (entry.ratio >= 0.95) {
      fullyVisible.push(entry);
    } else if (entry.kind === "video" && entry.ratio < 0.5) {
      halfHiddenVideos.push(entry);
    }
  }

  let shouldActivate: MotionEntry | null = null;
  if (fullyVisible.length > 0) {
    shouldActivate = fullyVisible[fullyVisible.length - 1];
  }

  for (const entry of halfHiddenVideos) {
    if (activeMotionId === entry.id || !shouldActivate) {
      doPauseVideo(entry);
    }
  }

  if (shouldActivate && activeMotionId !== shouldActivate.id) {
    const prev = activeMotionId !== null ? motionRegistry.get(activeMotionId) : null;
    if (prev && prev.kind === "video" && !prev.isUserControlled) {
      doPauseVideo(prev);
    }
    activeMotionId = shouldActivate.id;
    if (shouldActivate.kind === "video" && shouldActivate.videoEl) {
      doPlayVideo(shouldActivate);
    }
  }

  if (!shouldActivate) {
    const active = activeMotionId !== null ? motionRegistry.get(activeMotionId) : null;
    if (active && active.kind === "video" && !active.isUserControlled && active.ratio < 0.5) {
      doPauseVideo(active);
      activeMotionId = null;
    }
  }
}

function doPlayVideo(entry: MotionEntry) {
  const el = entry.videoEl;
  if (!el || !el.paused) return;
  el.muted = true;
  const p = el.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {});
  }
}

function doPauseVideo(entry: MotionEntry) {
  const el = entry.videoEl;
  if (!el || el.paused) {
    if (entry.id === activeMotionId) activeMotionId = null;
    return;
  }
  el.pause();
  if (entry.id === activeMotionId) activeMotionId = null;
}

function registerMotion(el: HTMLElement, kind: "video" | "gif", videoEl?: HTMLVideoElement): () => void {
  const id = nextId++;
  (el as HTMLElement & { __motionId?: number }).__motionId = id;

  const entry: MotionEntry = {
    id,
    el,
    ratio: 0,
    kind,
    videoEl,
    isUserControlled: false,
  };
  motionRegistry.set(id, entry);

  const cleanupFns: (() => void)[] = [];

  if (kind === "video" && videoEl) {
    const onPause = () => {
      if (entry.isUserControlled) return;
      if (videoEl.seeking || videoEl.ended) return;
      entry.isUserControlled = true;
    };
    const onPlay = () => {
      if (!entry.isUserControlled) return;
      if (activeMotionId !== id) {
        const prev = activeMotionId !== null ? motionRegistry.get(activeMotionId) : null;
        if (prev && prev.kind === "video" && !prev.isUserControlled) {
          doPauseVideo(prev);
        }
        activeMotionId = id;
      }
    };
    const onVolume = () => {
      if (!videoEl.muted && videoEl.volume > 0) {
        entry.isUserControlled = true;
      }
    };
    const onClick = () => {
      entry.isUserControlled = true;
    };
    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("volumechange", onVolume);
    videoEl.addEventListener("click", onClick);
    cleanupFns.push(() => {
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("volumechange", onVolume);
      videoEl.removeEventListener("click", onClick);
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

type SmartVideoProps = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "ref"> & {
  containerClassName?: string;
  showContainer?: boolean;
};

export function SmartVideo({
  containerClassName,
  showContainer = true,
  className,
  src,
  ...rest
}: SmartVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    return registerMotion(el, "video", el);
  }, []);

  const videoElement = (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="metadata"
      className={className}
      {...rest}
    />
  );

  if (showContainer) {
    return (
      <div className={`relative w-full overflow-hidden bg-black ${containerClassName ?? ""}`}>
        {videoElement}
      </div>
    );
  }

  return videoElement;
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
