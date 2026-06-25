"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Volume2, X } from "lucide-react";

const DEFAULT_TIP_MESSAGES = [
  "来点音乐放松一下？",
  "确定不来点音乐吗？",
  "来两首，就两首！",
  "听听动感节拍，恢复活力。",
];

const DEFAULT_PLAYING_LABEL = "正在播放";

const TIP_SHOW_MS = 3200;
const TIP_HIDE_MS = 300;

type MusicCategory = {
  id: string;
  key: string;
  label: string;
  emoji: string;
  tracks: { id: string; title: string; url: string }[];
};

type MusicSettings = {
  hide_frontend: boolean;
  hide_backend: boolean;
  tip_messages: string[];
  playing_label: string;
};

export function FloatingMusicBall() {
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [settings, setSettings] = useState<MusicSettings>({
    hide_frontend: false,
    hide_backend: false,
    tip_messages: DEFAULT_TIP_MESSAGES,
    playing_label: DEFAULT_PLAYING_LABEL,
  });
  const [loaded, setLoaded] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string>("");
  const [tipIndex, setTipIndex] = useState(0);
  const [tipKey, setTipKey] = useState(0);
  const [tipOn, setTipOn] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentCatKeyRef = useRef<string | null>(null);
  const categoriesRef = useRef<MusicCategory[]>([]);
  const tipMessagesRef = useRef<string[]>(DEFAULT_TIP_MESSAGES);
  const playingLabelRef = useRef<string>(DEFAULT_PLAYING_LABEL);
  const tipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const hoverActiveRef = useRef(false);
  const tipIndexRef = useRef(0);
  const dismissedRef = useRef(false);

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
    hoverActiveRef.current = hoverActive;
  }, [hoverActive]);

  useEffect(() => {
    dismissedRef.current = dismissed;
  }, [dismissed]);

  useEffect(() => {
    tipMessagesRef.current = settings.tip_messages.length > 0 ? settings.tip_messages : DEFAULT_TIP_MESSAGES;
  }, [settings.tip_messages]);

  useEffect(() => {
    playingLabelRef.current = settings.playing_label || DEFAULT_PLAYING_LABEL;
  }, [settings.playing_label]);

  useEffect(() => {
    fetch("/api/music")
      .then((res) => res.json())
      .then((data) => {
        const cats = (data.categories ?? []).filter(
          (c: MusicCategory) => c.tracks.length > 0,
        );
        setCategories(cats);
        if (data.settings) {
          setSettings({
            hide_frontend: !!data.settings.hide_frontend,
            hide_backend: !!data.settings.hide_backend,
            tip_messages: Array.isArray(data.settings.tip_messages) && data.settings.tip_messages.length > 0
              ? data.settings.tip_messages
              : DEFAULT_TIP_MESSAGES,
            playing_label: data.settings.playing_label || DEFAULT_PLAYING_LABEL,
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // 根据路径判断是否在后台，决定是否隐藏
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAdmin = window.location.pathname.startsWith("/admin");
    if (isAdmin && settings.hide_backend) {
      setHidden(true);
    } else if (!isAdmin && settings.hide_frontend) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  }, [settings.hide_frontend, settings.hide_backend]);

  const clearTipTimer = useCallback(() => {
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
  }, []);

  const advanceTip = useCallback(() => {
    if (dismissedRef.current || isPlayingRef.current) return;

    const msgs = tipMessagesRef.current;
    const inHover = hoverActiveRef.current;
    const nextIdx = (tipIndexRef.current + 1) % msgs.length;
    tipIndexRef.current = nextIdx;
    setTipIndex(nextIdx);
    setTipKey((k) => k + 1);
    setTipOn(true);

    tipTimerRef.current = setTimeout(() => {
      if (dismissedRef.current || isPlayingRef.current) return;
      if (inHover && hoverActiveRef.current) {
        advanceTip();
      } else {
        setTipOn(false);
        tipTimerRef.current = setTimeout(advanceTip, TIP_HIDE_MS);
      }
    }, TIP_SHOW_MS);
  }, []);

  useEffect(() => {
    if (!loaded || categories.length === 0 || isPlaying) {
      clearTipTimer();
      setTipOn(false);
      return;
    }

    tipIndexRef.current = 0;
    setTipIndex(0);
    setTipKey(0);
    setDismissed(false);
    dismissedRef.current = false;

    tipTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current || dismissedRef.current) return;
      setTipOn(true);
      setTipKey((k) => k + 1);
      tipTimerRef.current = setTimeout(() => {
        if (isPlayingRef.current || dismissedRef.current) return;
        if (hoverActiveRef.current) {
          advanceTip();
        } else {
          setTipOn(false);
          tipTimerRef.current = setTimeout(advanceTip, TIP_HIDE_MS);
        }
      }, TIP_SHOW_MS);
    }, 800);

    return () => clearTipTimer();
  }, [loaded, categories.length, isPlaying, clearTipTimer, advanceTip]);

  useEffect(() => {
    if (!loaded || categories.length === 0 || isPlaying || dismissed) return;

    if (hoverActive) {
      if (!tipOn) {
        clearTipTimer();
        setTipOn(true);
        setTipKey((k) => k + 1);
        tipTimerRef.current = setTimeout(advanceTip, TIP_SHOW_MS);
      }
    }
  }, [hoverActive, loaded, categories.length, isPlaying, dismissed, tipOn, clearTipTimer, advanceTip]);

  const playTrackFromCategory = useCallback((categoryKey: string) => {
    const cat = categoriesRef.current.find((c) => c.key === categoryKey);
    if (!cat || cat.tracks.length === 0) return;

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
        if (audioRef.current && !audioRef.current.ended && !audioRef.current.seeking) {
          setIsPlaying(false);
        }
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
  }, []);

  const selectCategory = useCallback((category: MusicCategory) => {
    if (category.tracks.length === 0) return;

    // 点击正在播放的分类 = 停止音乐
    if (currentCatKeyRef.current === category.key && isPlayingRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentCategory(null);
      setCurrentTrackTitle("");
      currentCatKeyRef.current = null;
      return;
    }

    playTrackFromCategory(category.key);
  }, [playTrackFromCategory]);

  const dismissTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    dismissedRef.current = true;
    clearTipTimer();
    setTipOn(false);
  };

  const handleMouseEnter = useCallback(() => {
    setHoverActive(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverActive(false);
  }, []);

  // 隐藏或未加载完成或无音乐时不渲染
  if (hidden || !loaded || categories.length === 0) return null;

  const tipMessages = tipMessagesRef.current;
  const playingLabel = playingLabelRef.current;

  const showTipBubble = !isPlaying && tipOn && !dismissed;
  const showPlayingBar = isPlaying;

  const showAnyBubble = showTipBubble || showPlayingBar;
  const showColumn = showAnyBubble || hoverActive;

  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex items-end gap-3"
        style={{ padding: "40px 0 40px 40px", margin: "-40px 0 -40px -40px" }}
      >
        {/* 竖直列容器：所有弹窗在同一列，column-reverse使DOM先出现的靠近球(底部) */}
        {showColumn ? (
          <div className="music-bubble-column shrink-0">
            {/* Playing bar - 和风格选项同样的样式，在同一列 */}
            {showPlayingBar ? (
              <div className="music-option-item music-option-anim is-visible" style={{ animationDelay: "0.05s" }}>
                <Volume2 className="h-5 w-5 shrink-0 text-cyan" />
                <p className="min-w-0 truncate text-sm text-white/90">
                  {currentTrackTitle || playingLabel}
                </p>
              </div>
            ) : null}

            {/* Tip bubble - 和风格选项同样的样式，在同一列 */}
            {showTipBubble ? (
              <div key={tipKey} className="music-option-item music-option-anim is-visible" style={{ animationDelay: "0.05s" }}>
                <span className="whitespace-nowrap text-sm text-white/90">{tipMessages[tipIndex] ?? tipMessages[0]}</span>
                {!hoverActive && (
                  <button
                    onClick={dismissTip}
                    className="ml-2 text-white/40 hover:text-white/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : null}

            {/* 4 个音乐风格选项 - 与弹窗在同一列 */}
            {hoverActive
              ? categories.map((cat, idx) => {
                  const isCurrentCat = currentCatKeyRef.current === cat.key;
                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCategory(cat);
                      }}
                      className={`music-option-item music-option-anim ${isCurrentCat ? "music-option-active" : ""}`}
                      style={{ animationDelay: `${0.05 + idx * 0.07}s` }}
                    >
                      <span className="text-lg">{cat.emoji || "🎵"}</span>
                      <span className="truncate text-sm">{cat.label}</span>
                      {isCurrentCat && isPlaying && (
                        <span className="ml-1 flex items-center gap-0.5">
                          <span className="inline-block h-3 w-0.5 bg-cyan animate-pulse" style={{ animationDelay: "0s" }} />
                          <span className="inline-block h-3 w-0.5 bg-cyan animate-pulse" style={{ animationDelay: "0.15s" }} />
                          <span className="inline-block h-3 w-0.5 bg-cyan animate-pulse" style={{ animationDelay: "0.3s" }} />
                        </span>
                      )}
                    </button>
                  );
                })
              : null}
          </div>
        ) : null}

        {/* Main ball - 纯展示，无播放控制按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="music-ball shrink-0"
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
              <Music className="music-icon" />
            )}
          </div>
          <div className="music-ball-glow" />
        </button>
      </div>
    </div>
  );
}
