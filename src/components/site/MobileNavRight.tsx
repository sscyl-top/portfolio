"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { AvatarLink } from "@/components/site/AvatarLink";

interface MobileNavRightProps {
  avatarMediaUrl?: string;
  // 兼容旧调用方：保留 props 但忽略（实际状态由 AvatarLink 内部 useUserStatus 获取）
  avatarHref?: string;
  userLoggedIn?: boolean;
}

/**
 * 移动端右上角控件：首页时显示头像链接，其他页面显示主题切换按钮
 */
export function MobileNavRight({
  avatarMediaUrl,
}: // avatarHref / userLoggedIn 不再使用（来自旧实现）
MobileNavRightProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (isHome) {
    return <AvatarLink avatarMediaUrl={avatarMediaUrl} variant="mobile" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/5 bg-white/[0.02] text-white transition hover:border-white/15 hover:bg-white/[0.04] [.light_&]:border-black/5 [.light_&]:bg-black/[0.02] [.light_&]:text-black [.light_&]:hover:border-black/15 [.light_&]:hover:bg-black/[0.04] sm:hidden"
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      title={isDark ? "切换到浅色模式" : "切换到深色模式"}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-5 w-5 transition-transform duration-700 ease-out group-hover:rotate-180"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="22.5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
        <path d="M24,1.5 A22.5,22.5 0 0,1 24,46.5 A11.25,11.25 0 0,0 24,24 A11.25,11.25 0 0,1 24,1.5 Z" fill="currentColor" />
        <path d="M24,1.5 A22.5,22.5 0 0,0 24,46.5 A11.25,11.25 0 0,1 24,24 A11.25,11.25 0 0,0 24,1.5 Z" fill="currentColor" fillOpacity="0.13" />
        <circle cx="24" cy="12.75" r="3.5" className="fill-[var(--background)]" />
        <circle cx="24" cy="35.25" r="3.5" fill="currentColor" />
      </svg>
    </button>
  );
}
