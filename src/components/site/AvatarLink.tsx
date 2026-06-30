"use client";

import Image from "next/image";
import Link from "next/link";

import { useUserStatus } from "@/components/site/UserStatusSync";

type Props = {
  avatarMediaUrl?: string;
  /** 移动端样式（小圆头像） */
  variant: "mobile" | "desktop";
};

/**
 * 头像链接：根据登录状态切换 href 和 aria-label
 * 登录后切换为 "/admin"，未登录或水合前为 "/resume"
 */
export function AvatarLink({ avatarMediaUrl, variant }: Props) {
  const { href, label } = useUserStatus();

  if (variant === "mobile") {
    if (avatarMediaUrl) {
      return (
        <Link
          href={href}
          className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge sm:hidden"
          aria-label={label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarMediaUrl}
            alt=""
            fetchPriority="high"
            className="h-full w-full object-cover"
            style={{ filter: "var(--png-filter)" }}
          />
        </Link>
      );
    }
    return (
      <Link
        href={href}
        className="flex h-11 w-20 shrink-0 items-center justify-end sm:hidden"
        aria-label={label}
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

  // desktop
  if (avatarMediaUrl) {
    return (
      <Link
        href={href}
        className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge md:h-12 md:w-12"
        aria-label={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarMediaUrl}
          alt=""
          fetchPriority="high"
          className="h-full w-full object-cover"
          style={{ filter: "var(--png-filter)" }}
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="grid h-8 w-12 shrink-0 place-items-center justify-end md:h-16 md:w-28"
      aria-label={label}
    >
      <Image
        src="/brand/infinite-progress-logo.svg"
        alt="无限进步"
        width={120}
        height={30}
        className="h-auto w-[2.5rem] shrink-0 md:w-36"
        priority
        style={{ filter: "var(--png-filter)" }}
      />
    </Link>
  );
}
