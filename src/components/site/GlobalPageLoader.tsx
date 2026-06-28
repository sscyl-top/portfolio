"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 全局页面加载动画。
 *
 * 触发时机：
 * 1. 首次打开网页 / 每次刷新（非作品详情页）— SSR 即渲染全屏黑色 loader，hydrate 后跑 0→100% 动画再淡出
 * 2. SPA 导航到 首页(/) / 全部作品(/works) / 简历(/resume) 时，仅当导航超过阈值（卡顿）才显示
 *
 * 不触发：
 * - 首次打开作品详情页（/works/[slug]）：由 WorkStarLoader 负责，避免两个加载动画叠加
 * - SPA 导航到作品详情页（/works/[slug]）等非主页面
 * - 快速完成的 SPA 导航（无卡顿）
 */

// 导航延迟阈值：超过这个时间还没完成导航，才显示 loader
const NAVIGATION_DELAY_MS = 300;

function isMainPage(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/works") return true;
  if (pathname.startsWith("/resume")) return true;
  return false;
}

// 作品详情页 /works/[slug]：首次打开时由 WorkStarLoader 负责加载动画
function isWorkDetailPage(pathname: string): boolean {
  if (pathname === "/works") return false;
  if (pathname.startsWith("/works/")) return true;
  return false;
}

export function GlobalPageLoader() {
  const pathname = usePathname();
  // SSR + 首次 hydrate 时：主页面显示全屏 loader；作品详情页由 WorkStarLoader 负责，不重复显示
  const [active, setActive] = useState(() => !isWorkDetailPage(pathname));
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const isFirstMount = useRef(true);
  const animationRef = useRef(0);
  const timeoutRef = useRef(0);
  const hideTimeoutRef = useRef(0);
  // 导航延迟定时器：用于延迟显示 loader（仅在卡顿时才出现）
  const navDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录是否正在等待导航
  const pendingNavRef = useRef<string | null>(null);

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
  // 作品详情页首次加载由 WorkStarLoader 负责，跳过全局 loader
  useEffect(() => {
    if (isWorkDetailPage(pathname)) {
      isFirstMount.current = false;
      return;
    }
    // 使用 requestAnimationFrame 延迟启动动画，避免在 effect 中直接调用 setState
    const frameId = requestAnimationFrame(() => {
      startAnimation();
    });
    isFirstMount.current = false;

    // 监听导航链接点击：仅对主页链接启动延迟定时器
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // 只对主页面链接触发延迟 loader
      if (!isMainPage(href)) return;
      // 如果是当前页面，不处理
      if (href === pathname) return;

      // 清除之前的延迟定时器
      if (navDelayRef.current) {
        clearTimeout(navDelayRef.current);
      }
      pendingNavRef.current = href;
      // 延迟显示 loader：只有导航超过阈值才显示
      navDelayRef.current = setTimeout(() => {
        if (pendingNavRef.current) {
          startAnimation();
        }
      }, NAVIGATION_DELAY_MS);
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      cancelAnimationFrame(animationRef.current);
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutRef.current);
      window.clearTimeout(hideTimeoutRef.current);
      if (navDelayRef.current) {
        clearTimeout(navDelayRef.current);
      }
      document.removeEventListener("click", handleClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pathname 变化：导航完成，清除延迟定时器
  useEffect(() => {
    if (isFirstMount.current) return;

    // 清除导航延迟定时器（如果 pathname 在阈值内变化，不显示 loader）
    if (navDelayRef.current) {
      clearTimeout(navDelayRef.current);
      navDelayRef.current = null;
    }
    pendingNavRef.current = null;
    // 如果 loader 已经在显示（说明导航超过了阈值），让它跑完动画再淡出
    // 如果 loader 没在显示，什么都不做
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
