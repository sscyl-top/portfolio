"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 全局页面加载动画。
 *
 * 触发时机：
 * 1. 首次打开网页 / 每次刷新 — SSR 即渲染全屏黑色 loader，hydrate 后跑 0→100% 动画再淡出
 * 2. SPA 导航到 首页(/) / 全部作品(/works) / 简历(/resume) 三个页面「第一次」切换时
 *
 * 不触发：
 * - SPA 导航到作品详情页（/works/[slug]）等非主页面
 * - 同一主页面第二次及以后的 SPA 访问
 */

const MAIN_PAGES = new Set(["/", "/works", "/resume"]);

// 当前 document 生命周期内已显示过 loader 的页面（刷新后重置）
const shownPages = new Set<string>();

function isMainPage(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/works") return true;
  if (pathname.startsWith("/resume")) return true;
  return false;
}

export function GlobalPageLoader() {
  const pathname = usePathname();
  // SSR + 首次 hydrate 时 active=true，渲染全屏黑色 loader 覆盖页面内容
  const [active, setActive] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const isFirstMount = useRef(true);
  const animationRef = useRef(0);
  const timeoutRef = useRef(0);
  const hideTimeoutRef = useRef(0);

  const startAnimation = () => {
    cancelAnimationFrame(animationRef.current);
    window.clearTimeout(timeoutRef.current);
    window.clearTimeout(hideTimeoutRef.current);
    setProgress(0);
    setHidden(false);
    setActive(true);

    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const next = Math.min(100, Math.round((elapsed / 1200) * 100));
      setProgress(next);
      if (next < 100) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        timeoutRef.current = window.setTimeout(() => setHidden(true), 120);
      }
    };
    animationRef.current = requestAnimationFrame(tick);
  };

  // 首次挂载：跑加载动画（覆盖首次进入 / 刷新的情况）
  useEffect(() => {
    shownPages.add(pathname);
    startAnimation();
    isFirstMount.current = false;
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(hideTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SPA 导航：三个主页面第一次切换时触发
  useEffect(() => {
    if (isFirstMount.current) return;
    if (!isMainPage(pathname)) return;
    if (shownPages.has(pathname)) return;
    shownPages.add(pathname);
    startAnimation();
  }, [pathname]);

  // 淡出后移除 DOM
  useEffect(() => {
    if (hidden && active) {
      hideTimeoutRef.current = window.setTimeout(() => setActive(false), 500);
    }
    return () => window.clearTimeout(hideTimeoutRef.current);
  }, [hidden, active]);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-black transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center font-sans text-white">
        <p className="text-3xl font-light leading-none tracking-[0.035em] md:text-5xl">
          hello@sscyl.top {progress}%
        </p>
      </div>
    </div>
  );
}
