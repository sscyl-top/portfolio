"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Volume2, X } from "lucide-react";

type MusicCategory = {
  id: string;
  key: string;
  label: string;
  tracks: { id: string; title: string; url: string }[];
};

const TIP_MESSAGES = [
  "来点音乐放松一下？",
  "确定不来点音乐吗？",
  "来两首，就两首！",
  "听听动感节拍，恢复活力。",
];

const TIP_DISPLAY_MS = 3200;
const TIP_GAP_MS = 300;

const categoryEmoji: Record<string, string> = {
  relax: "🌿",
  energetic: "🔥",
  summer: "🌊",
  badass: "😎",
};

export function FloatingMusicBall() {
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string>("");
  const [tipText, setTipText] = useState(TIP_MESSAGES[0]);
  const [tipIndex, setTipIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const hoverZoneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentCategoryRef = useRef<string | null>(null);
  const categoriesRef = useRef<MusicCategory[]>([]);
  const tipShowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tipHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInteractedRef = useRef(false);
  const tipIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentCatKeyRef = useRef<string | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    currentCategoryRef.current = currentCategory;
  }, [currentCategory]);

  useEffect(() => {
    currentCatKeyRef.current = currentCategory;
  }, [currentCategory]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    fetch("/api/music")
      .then((res) => res.json())
      .then((data) => {
        const cats = (data.categories ?? []).filter(
          (c: MusicCategory) => c.tracks.length > 0,
        );
        setCategories(cats);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const stopTipCarousel = useCallback(() => {
    if (tipShowTimerRef.current) {
      clearTimeout(tipShowTimerRef.current);
      tipShowTimerRef.current = null;
    }
    if (tipHideTimerRef.current) {
      clearTimeout(tipHideTimerRef.current);
      tipHideTimerRef.current = null;
    }
    setShowTip(false);
  }, []);

  const showNextTip = useCallback(() => {
    if (
      hasInteractedRef.current ||
      isPlayingRef.current ||
      hoverActive
    ) {
      return;
    }

    const nextIdx = (tipIndexRef.current + 1) % TIP_MESSAGES.length;
    tipIndexRef.current = nextIdx;
    setTipIndex(nextIdx);
    setTipText(TIP_MESSAGES[nextIdx]);
    setShowTip(true);

    tipHideTimerRef.current = setTimeout(() => {
      setShowTip(false);
      tipShowTimerRef.current = setTimeout(() => {
        showNextTip();
      }, TIP_GAP_MS);
    }, TIP_DISPLAY_MS);
  }, [hoverActive]);

  useEffect(() => {
    if (!loaded || categories.length === 0) return;

    if (!isPlaying && !hoverActive) {
      tipIndexRef.current = 0;
      setTipIndex(0);
      setTipText(TIP_MESSAGES[0]);

      const startTimer = setTimeout(() => {
        if (isPlayingRef.current || hoverActive) return;
        setShowTip(true);
        tipHideTimerRef.current = setTimeout(() => {
          setShowTip(false);
          tipShowTimerRef.current = setTimeout(() => {
            showNextTip();
          }, TIP_GAP_MS);
        }, TIP_DISPLAY_MS);
      }, 800);

      return () => {
        clearTimeout(startTimer);
        stopTipCarousel();
      };
    } else {
      stopTipCarousel();
    }
  }, [loaded, categories.length, isPlaying, hoverActive, showNextTip, stopTipCarousel]);

  const checkHoverZone = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ballSize = 56;
    const zoneRadius = ballSize * 5;
    const ballCenterX = rect.left + rect.width / 2;
    const ballCenterY = rect.top + rect.height / 2;
    const dx = mousePos.current.x - ballCenterX;
    const dy = mousePos.current.y - ballCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > zoneRadius) {
      setHoverActive(false);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hoverCheckTimerRef.current) {
      clearInterval(hoverCheckTimerRef.current);
    }
    setHoverActive(true);
    stopTipCarousel();
  }, [stopTipCarousel]);

  useEffect(() => {
    if (hoverActive) {
      hoverCheckTimerRef.current = setInterval(checkHoverZone, 120);
      return () => {
        if (hoverCheckTimerRef.current) {
          clearInterval(hoverCheckTimerRef.current);
        }
      };
    }
  }, [hoverActive, checkHoverZone]);

  const playTrackFromCategory = useCallback((categoryKey: string, resumeFromSameCat = false) => {
    const cat = categoriesRef.current.find((c) => c.key === categoryKey);
    if (!cat || cat.tracks.length === 0) return;

    if (resumeFromSameCat && audioRef.current && currentCatKeyRef.current === categoryKey) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    const track = cat.tracks[Math.floor(Math.random() * cat.tracks.length)];

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.volume = 0.5;
      audioRef.current.addEventListener("ended", () => {
        const currentKey = currentCatKeyRef.current;
        if (currentKey) {
          const c = categoriesRef.current.find((cc) => cc.key === currentKey);
          if (c && c.tracks.length > 0) {
            const t = c.tracks[Math.floor(Math.random() * c.tracks.length)];
            if (audioRef.current) {
              audioRef.current.src = t.url;
              audioRef.current.play();
              setCurrentTrackTitle(t.title);
            }
          }
        }
      });
      audioRef.current.addEventListener("pause", () => {
        if (audioRef.current && !audioRef.current.ended) {
          setIsPaused(true);
        }
        setIsPlaying(false);
      });
      audioRef.current.addEventListener("play", () => {
        setIsPlaying(true);
        setIsPaused(false);
      });
    }

    audioRef.current.src = track.url;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentCategory(categoryKey);
      setCurrentTrackTitle(track.title);
    });
  }, []);

  const selectCategory = useCallback((category: MusicCategory) => {
    if (category.tracks.length === 0) return;

    hasInteractedRef.current = true;

    if (currentCatKeyRef.current === category.key && isPausedRef.current) {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      }
      setHoverActive(false);
      return;
    }

    if (currentCatKeyRef.current === category.key && isPlayingRef.current) {
      return;
    }

    setHoverActive(false);
    playTrackFromCategory(category.key);
  }, [playTrackFromCategory]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, [isPlaying, isPaused]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentCategory(null);
    setCurrentTrackTitle("");
    currentCatKeyRef.current = null;
  }, []);

  const dismissTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    hasInteractedRef.current = true;
    stopTipCarousel();
  };

  if (!loaded || categories.length === 0) return null;

  const sortedCats = [...categories];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8"
    >
      <div
        ref={hoverZoneRef}
        onMouseEnter={handleMouseEnter}
        className="relative flex items-center"
        style={{ alignItems: "flex-end" }}
      >
        {/* Tip bubble - 轮播提示，未播放且未hover时显示 */}
        {showTip && !hoverActive && !isPlaying && !isPaused ? (
          <div key={tipIndex} className="music-bubble music-bubble-tip is-visible">
            <p className="whitespace-nowrap text-sm text-white/90">{tipText}</p>
            <button
              onClick={dismissTip}
              className="ml-2 text-white/40 hover:text-white/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* Now playing bar - 播放中（包括暂停）显示 */}
        {(isPlaying || isPaused) && !hoverActive ? (
          <div className="music-bubble music-bubble-playing is-visible">
            <Volume2 className="h-4 w-4 shrink-0 text-cyan" style={{ opacity: isPlaying ? 1 : 0.4 }} />
            <p className="min-w-0 truncate text-sm text-white/90">
              {currentTrackTitle || "正在播放"}
              {isPaused && <span className="ml-1 text-white/40">(已暂停)</span>}
            </p>
            <div className="ml-1 flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 pl-0.5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopMusic();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Options panel - hover时显示 */}
        <div
          className={`music-options-panel ${hoverActive ? "is-visible" : ""}`}
          style={{ right: "72px", bottom: "0" }}
        >
          {sortedCats.map((cat) => {
            const isCurrentCat = currentCatKeyRef.current === cat.key;
            return (
              <button
                key={cat.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectCategory(cat);
                }}
                className={`music-option-item ${isCurrentCat ? "music-option-active" : ""}`}
              >
                <span className="text-lg">{categoryEmoji[cat.key] ?? "🎵"}</span>
                <span className="truncate text-sm">{cat.label}</span>
                {isCurrentCat && isPlaying && (
                  <span className="ml-1 flex items-center gap-0.5">
                    <span className="inline-block h-3 w-0.5 animate-pulse bg-cyan" style={{ animationDelay: "0s" }} />
                    <span className="inline-block h-3 w-0.5 animate-pulse bg-cyan" style={{ animationDelay: "0.15s" }} />
                    <span className="inline-block h-3 w-0.5 animate-pulse bg-cyan" style={{ animationDelay: "0.3s" }} />
                  </span>
                )}
              </button>
            );
          })}
          {(isPlaying || isPaused) ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopMusic();
              }}
              className="music-option-item music-option-stop"
            >
              <span className="text-lg">⏹</span>
              <span className="truncate text-sm">停止播放</span>
            </button>
          ) : null}
        </div>

        {/* Main ball */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying || isPaused) {
              togglePlayPause();
            }
          }}
          className="music-ball"
          aria-label="音乐播放器"
        >
          <div className="music-ball-inner">
            {isPlaying ? (
              <div className="music-wave">
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : isPaused ? (
              <Pause className="h-5 w-5 text-cyan" />
            ) : (
              <Music className="music-icon" />
            )}
          </div>
          <div className="music-ball-glow" />
        </button>
      </div>
    </div>
  );
}
