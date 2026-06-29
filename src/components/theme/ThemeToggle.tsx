"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isHome = pathname === "/";
  if (isHome) return null;
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`group grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-white/25 hover:text-white [.light_&]:border-black/10 [.light_&]:bg-black/[0.04] [.light_&]:text-black/70 [.light_&]:hover:border-black/25 [.light_&]:hover:text-black shrink-0 ${className}`}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      title={isDark ? "切换到浅色模式" : "切换到深色模式"}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-5 w-5 transition-transform duration-700 ease-out group-hover:rotate-180"
        fill="none"
        aria-hidden="true"
      >
        {/* 外环装饰 */}
        <circle
          cx="24"
          cy="24"
          r="22.5"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        {/* 阳半（活跃）：currentColor 随主题反转 —— 深色模式显浅、浅色模式显深 */}
        <path
          d="M24,1.5 A22.5,22.5 0 0,1 24,46.5 A11.25,11.25 0 0,0 24,24 A11.25,11.25 0 0,1 24,1.5 Z"
          fill="currentColor"
        />
        {/* 阴半（幽影）：低不透明度，作为另一极的回响 */}
        <path
          d="M24,1.5 A22.5,22.5 0 0,0 24,46.5 A11.25,11.25 0 0,1 24,24 A11.25,11.25 0 0,0 24,1.5 Z"
          fill="currentColor"
          fillOpacity="0.13"
        />
        {/* 阳鱼眼：取页面背景色，与活跃半形成对比，呈现"对立之种" */}
        <circle cx="24" cy="12.75" r="3.5" className="fill-[var(--background)]" />
        {/* 阴鱼眼：实心 currentColor，在幽影半中如明亮星点 */}
        <circle cx="24" cy="35.25" r="3.5" fill="currentColor" />
      </svg>
    </button>
  );
}
