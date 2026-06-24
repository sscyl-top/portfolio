"use client";

import { useEffect, useRef, useState } from "react";
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
  const [showOptions, setShowOptions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string>("");
  const [tipText, setTipText] = useState(TIP_MESSAGES[0]);
  const [tipIndex, setTipIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentCategoryRef = useRef<string | null>(null);
  const categoriesRef = useRef<MusicCategory[]>([]);
  const tipShowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tipHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInteractedRef = useRef(false);
  const tipIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const showOptionsRef = useRef(false);

  useEffect(() => {
    currentCategoryRef.current = currentCategory;
  }, [currentCategory]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    showOptionsRef.current = showOptions;
  }, [showOptions]);

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

  const stopTipCarousel = () => {
    if (tipShowTimerRef.current) {
      clearTimeout(tipShowTimerRef.current);
      tipShowTimerRef.current = null;
    }
    if (tipHideTimerRef.current) {
      clearTimeout(tipHideTimerRef.current);
      tipHideTimerRef.current = null;
    }
    setShowTip(false);
  };

  const showNextTip = () => {
    if (hasInteractedRef.current || isPlayingRef.current || showOptionsRef.current) {
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
  };

  useEffect(() => {
    if (!loaded || categories.length === 0) return;

    hasInteractedRef.current = false;
    tipIndexRef.current = 0;
    setTipIndex(0);
    setTipText(TIP_MESSAGES[0]);

    const startTimer = setTimeout(() => {
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
  }, [loaded, categories.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showOptions]);

  const playRandomTrackFromCategory = (categoryKey: string) => {
    const cat = categoriesRef.current.find((c) => c.key === categoryKey);
    if (!cat || cat.tracks.length === 0) return;

    const track = cat.tracks[Math.floor(Math.random() * cat.tracks.length)];

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false;
      audioRef.current.volume = 0.5;
      audioRef.current.addEventListener("ended", () => {
        const currentKey = currentCategoryRef.current;
        if (currentKey) {
          playRandomTrackFromCategory(currentKey);
        }
      });
      audioRef.current.addEventListener("pause", () => {
        setIsPlaying(false);
      });
      audioRef.current.addEventListener("play", () => {
        setIsPlaying(true);
      });
    }

    audioRef.current.src = track.url;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      setCurrentCategory(categoryKey);
      setCurrentTrackTitle(track.title);
    });
  };

  const playCategory = (category: MusicCategory) => {
    if (category.tracks.length === 0) return;
    hasInteractedRef.current = true;
    stopTipCarousel();

    if (currentCategory === category.key && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setShowOptions(false);
      return;
    }

    setShowOptions(false);
    playRandomTrackFromCategory(category.key);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentCategory(null);
    setCurrentTrackTitle("");
    setShowOptions(false);
  };

  const handleBallClick = () => {
    hasInteractedRef.current = true;
    stopTipCarousel();

    if (isPlaying) {
      togglePlay();
    } else {
      setShowOptions(!showOptions);
    }
  };

  const dismissTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    hasInteractedRef.current = true;
    stopTipCarousel();
  };

  if (!loaded || categories.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 md:bottom-8 md:right-8"
      style={{ alignItems: "flex-end" }}
    >
      {/* Tip bubble */}
      {showTip && !showOptions && !isPlaying ? (
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

      {/* Now playing bar */}
      {isPlaying && currentCategory && !showOptions ? (
        <div className="music-bubble music-bubble-playing is-visible">
          <Volume2 className="h-4 w-4 shrink-0 animate-pulse text-cyan" />
          <p className="min-w-0 truncate text-sm text-white/90">
            {currentTrackTitle || "正在播放"}
          </p>
          <div className="ml-1 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
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

      {/* Options panel */}
      <div
        className={`music-options-panel ${showOptions ? "is-visible" : ""}`}
        style={{ right: "72px", bottom: "0" }}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={(e) => {
              e.stopPropagation();
              playCategory(cat);
            }}
            className="music-option-item"
          >
            <span className="text-lg">{categoryEmoji[cat.key] ?? "🎵"}</span>
            <span className="truncate text-sm">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main ball */}
      <button
        onClick={handleBallClick}
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
          ) : (
            <Music
              className={`music-icon ${showOptions ? "music-icon-paused" : ""}`}
            />
          )}
        </div>
        <div className="music-ball-glow" />
      </button>
    </div>
  );
}
