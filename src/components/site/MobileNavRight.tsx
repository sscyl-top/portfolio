"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface MobileNavRightProps {
  avatarMediaUrl?: string;
  avatarHref: string;
  userLoggedIn: boolean;
}

export function MobileNavRight({
  avatarMediaUrl,
  avatarHref,
  userLoggedIn,
}: MobileNavRightProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (isHome) {
    if (avatarMediaUrl) {
      return (
        <Link
          href={avatarHref}
          className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge sm:hidden"
          aria-label={userLoggedIn ? "进入后台" : "查看简历"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarMediaUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ filter: "var(--png-filter)" }}
          />
        </Link>
      );
    }
    return (
      <Link
        href={avatarHref}
        className="flex h-11 w-20 shrink-0 items-center justify-end sm:hidden"
        aria-label={userLoggedIn ? "进入后台" : "查看简历"}
      >
        <Image
          src="/brand/infinite-progress-logo.svg"
          alt="无限进步"
          width={120}
          height={30}
          className="h-auto w-[4.5rem] shrink-0"
          priority
          style={{ filter: "var(--png-filter)" }}
        />
      </Link>
    );
  }

  if (!mounted) return null;
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
