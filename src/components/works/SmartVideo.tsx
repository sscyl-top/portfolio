"use client";

import { useEffect, useRef, useCallback } from "react";

type VideoEntry = {
  id: number;
  el: HTMLVideoElement;
  ratio: number;
  isUserControlled: boolean;
};

let nextId = 1;
const videoRegistry = new Map<number, VideoEntry>();
let activeVideoId: number | null = null;
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLVideoElement;
        const videoEl = el as HTMLVideoElement & { __smartVideoId?: number };
        const id = videoEl.__smartVideoId;
        if (id === undefined) continue;
        const reg = videoRegistry.get(id);
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
  const fullyVisible: VideoEntry[] = [];
  const halfHidden: VideoEntry[] = [];

  for (const entry of videoRegistry.values()) {
    if (entry.isUserControlled) continue;
    if (entry.ratio >= 0.95) {
      fullyVisible.push(entry);
    } else if (entry.ratio < 0.5) {
      halfHidden.push(entry);
    }
  }

  let shouldPlay: VideoEntry | null = null;
  if (fullyVisible.length > 0) {
    shouldPlay = fullyVisible[fullyVisible.length - 1];
  }

  for (const entry of halfHidden) {
    if (entry.id !== activeVideoId || !shouldPlay) {
      pauseVideo(entry);
    }
  }

  if (shouldPlay) {
    if (activeVideoId !== shouldPlay.id) {
      const prev = activeVideoId !== null ? videoRegistry.get(activeVideoId) : null;
      if (prev && !prev.isUserControlled) {
        pauseVideo(prev);
      }
      activeVideoId = shouldPlay.id;
      playVideo(shouldPlay);
    }
  } else {
    const active = activeVideoId !== null ? videoRegistry.get(activeVideoId) : null;
    if (active && !active.isUserControlled && active.ratio < 0.5) {
      pauseVideo(active);
      activeVideoId = null;
    }
  }
}

function playVideo(entry: VideoEntry) {
  const el = entry.el;
  if (el.paused) {
    el.muted = true;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  }
}

function pauseVideo(entry: VideoEntry) {
  const el = entry.el;
  if (!el.paused) {
    el.pause();
  }
  if (entry.id === activeVideoId) {
    activeVideoId = null;
  }
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
  const entryRef = useRef<VideoEntry | null>(null);

  const handleUserInteraction = useCallback(() => {
    const entry = entryRef.current;
    if (!entry) return;
    entry.isUserControlled = true;
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const id = nextId++;
    (el as HTMLVideoElement & { __smartVideoId?: number }).__smartVideoId = id;

    const entry: VideoEntry = {
      id,
      el,
      ratio: 0,
      isUserControlled: false,
    };
    entryRef.current = entry;
    videoRegistry.set(id, entry);

    el.addEventListener("pause", () => {
      if (!entry.isUserControlled) {
        if (el.seeking || el.ended) return;
        entry.isUserControlled = true;
      }
    });

    el.addEventListener("play", () => {
      if (entry.isUserControlled && activeVideoId !== id) {
        const prev = activeVideoId !== null ? videoRegistry.get(activeVideoId) : null;
        if (prev && !prev.isUserControlled) {
          pauseVideo(prev);
        }
        activeVideoId = id;
      }
    });

    el.addEventListener("volumechange", () => {
      if (!el.muted && el.volume > 0) {
        entry.isUserControlled = true;
      }
    });

    el.addEventListener("click", handleUserInteraction);

    getObserver().observe(el);

    scheduleUpdate();

    return () => {
      getObserver().unobserve(el);
      videoRegistry.delete(id);
      if (activeVideoId === id) {
        activeVideoId = null;
      }
      el.removeEventListener("click", handleUserInteraction);
      scheduleUpdate();
    };
  }, [handleUserInteraction]);

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
