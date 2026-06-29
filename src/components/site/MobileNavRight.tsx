"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

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

  if (isHome) {
    if (avatarMediaUrl) {
      return (
        <Link
          href={avatarHref}
          className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge sm:hidden"
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
        className="flex h-8 w-14 shrink-0 items-center justify-end sm:hidden"
        aria-label={userLoggedIn ? "进入后台" : "查看简历"}
      >
        <Image
          src="/brand/infinite-progress-logo.svg"
          alt="无限进步"
          width={120}
          height={30}
          className="h-auto w-[3.5rem] shrink-0"
          priority
          style={{ filter: "var(--png-filter)" }}
        />
      </Link>
    );
  }

  return <ThemeToggle className="sm:hidden shrink-0" />;
}
