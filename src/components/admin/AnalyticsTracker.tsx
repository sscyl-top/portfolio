"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|linkedinbot|twitterbot|googlebot/i;

function isBot(): boolean {
  if (typeof navigator === "undefined") return true;
  return BOT_PATTERN.test(navigator.userAgent);
}

function isPrerender(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.navigator.webdriver === true ||
    /headless|phantomjs|puppeteer|playwright/.test(
      navigator.userAgent.toLowerCase(),
    )
  );
}

function shouldTrack(pathname: string): boolean {
  return (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    pathname !== "/_next" &&
    !pathname.includes(".")
  );
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isBot()) return;
    if (isPrerender()) return;
    if (!pathname || !shouldTrack(pathname)) return;

    const track = () => {
      if (lastTrackedRef.current === pathname) return;
      lastTrackedRef.current = pathname;

      const payload = JSON.stringify({
        path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      });

      try {
        const sent =
          typeof navigator.sendBeacon === "function" &&
          navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));

        if (!sent) {
          fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {
            // 跟踪失败静默忽略，避免阻塞页面
          });
        }
      } catch {
        // 忽略发送异常
      }
    };

    // 页面可见时再发送，避免后台标签页产生噪声
    if (document.visibilityState === "hidden") {
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          track();
          document.removeEventListener("visibilitychange", handleVisibility);
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () =>
        document.removeEventListener("visibilitychange", handleVisibility);
    }

    track();
  }, [pathname]);

  return null;
}
