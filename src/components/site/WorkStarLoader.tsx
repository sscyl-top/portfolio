"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 作品详情页加载动画：旋转十字星 + 虚线圆环 + 百分比。
 * 在 Next.js 路由 loading.tsx 中使用，导航期间全屏覆盖。
 */
export function WorkStarLoader() {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState(true);
  const rafRef = useRef(0);
  const hideTimeoutRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    const tick = () => {
      const elapsed = performance.now() - start;
      const next = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(next);
      if (next < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        hideTimeoutRef.current = window.setTimeout(() => setHidden(true), 200);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (hidden) {
      const t = window.setTimeout(() => setActive(false), 500);
      return () => window.clearTimeout(t);
    }
  }, [hidden]);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-black transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-28 w-28">
          {/* 外层十字星：四角星旋转，中心实心→角尖渐淡 */}
          <svg
            className="absolute inset-0 h-full w-full animate-spin overflow-visible"
            style={{ animationDuration: "2.4s" }}
            viewBox="0 0 100 100"
          >
            <defs>
              <radialGradient
                id="workStarGrad"
                gradientUnits="userSpaceOnUse"
                cx="50"
                cy="50"
                r="132"
              >
                <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                <stop offset="18%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            <path
              d="M50 -82 L52 48 L182 50 L52 52 L50 182 L48 52 L-82 50 L48 48 Z"
              fill="url(#workStarGrad)"
            />
          </svg>
          {/* 内层虚线圆环反向旋转 */}
          <svg
            className="absolute inset-0 h-full w-full animate-spin"
            style={{ animationDuration: "1.6s", animationDirection: "reverse" }}
            viewBox="0 0 100 100"
            fill="none"
            stroke="rgba(139,215,205,0.55)"
            strokeWidth="1"
            strokeLinecap="round"
          >
            <circle cx="50" cy="50" r="28.6" strokeDasharray="3 7" />
          </svg>
          {/* 中心亮点 */}
          <div className="absolute inset-0 grid place-items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(139,215,205,0.9)]" />
          </div>
        </div>
        <p className="font-mono text-sm font-light tracking-[0.2em] text-white/60">
          {progress}%
        </p>
      </div>
    </div>
  );
}
