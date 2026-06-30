import Image from "next/image";
import Link from "next/link";

import { siteSettings as staticSiteSettings } from "@/data/portfolio";
import type { PublicSiteSettings } from "@/lib/cms/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileNavRight } from "@/components/site/MobileNavRight";

const defaultSiteSettings: PublicSiteSettings = {
  ctaCardScale: 1,
  ctaCardOffsetX: 0,
  ctaCardOffsetY: 0,
  ctaFigureScale: 1,
  ctaFigureOffsetX: 0,
  ctaFigureOffsetY: 0,
  ctaFigureLightScale: 1,
  ctaFigureLightOffsetX: 0,
  ctaFigureLightOffsetY: 0,
  ctaTickerLogoMediaUrls: [],
  ctaTickerLogoScale: 1,
  ctaTickerLogoOffsetX: 0,
  ctaTickerLogoOffsetY: 0,
  ctaCenterLogoScale: 1,
  ctaCenterLogoOffsetX: 0,
  ctaCenterLogoOffsetY: 0,
  description: staticSiteSettings.description,
  name: staticSiteSettings.name,
  navigation: staticSiteSettings.navigation,
  nickname: staticSiteSettings.logo,
  seoDescription: staticSiteSettings.description,
  seoTitle: staticSiteSettings.name,
  socialLinks: staticSiteSettings.socialLinks,
  title: staticSiteSettings.title,
};

export async function SiteHeader({
  siteSettings = defaultSiteSettings,
}: {
  siteSettings?: PublicSiteSettings;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const avatarHref = user ? "/admin" : "/resume";

  return (
    <header className="fixed left-0 right-0 top-0 z-40 w-screen border-b border-edge-2 bg-[var(--glass-nav)] backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)]">
      <nav className="relative mx-auto h-12 max-w-[1420px] px-2 sm:h-14 sm:px-3 md:h-24 md:px-8">
        {/* 左侧 Logo */}
        <Link
          href="/"
          className="absolute left-2 top-1/2 flex h-full -translate-y-1/2 items-center gap-2 sm:left-3 md:left-0 md:gap-4"
          aria-label={`${siteSettings.name} 首页`}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg sm:h-8 sm:w-8 md:h-12 md:w-12">
            {siteSettings.logoMediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={siteSettings.logoMediaUrl}
                alt=""
                className="h-full w-full object-contain md:h-12 md:w-12"
              />
            ) : (
              <span
                aria-hidden="true"
                className="nav-logo-placeholder h-5 w-5 rounded-md sm:h-6 sm:w-6 md:h-7 md:w-7"
              />
            )}
          </span>
          <span className="relative hidden h-8 min-w-0 sm:flex md:h-12">
            {siteSettings.nameMediaUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={siteSettings.nameMediaUrl}
                  alt={siteSettings.name}
                  className="absolute left-0 top-0 block h-4 w-auto max-w-[100px] object-contain object-left-top sm:h-5 sm:max-w-[130px] md:h-6 md:max-w-[160px]"
                  style={{ filter: "var(--png-filter)" }}
                />
                <span className="absolute bottom-0 left-0 block truncate font-mono text-[10px] leading-none text-ink-3 sm:text-[11px] md:text-xs">
                  {siteSettings.title}
                </span>
              </>
            ) : (
              <>
                <span className="absolute left-0 top-0 block truncate text-sm font-semibold tracking-[0.15em] text-ink sm:text-base md:tracking-[0.18em]">
                  {siteSettings.name}
                </span>
                <span className="absolute bottom-0 left-0 block truncate font-mono text-xs text-ink-3">
                  {siteSettings.title}
                </span>
              </>
            )}
          </span>
        </Link>

        {/* 中间导航 - 始终绝对居中，不受左右内容宽度影响 */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center">
          {siteSettings.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className="relative whitespace-nowrap px-2 py-1.5 text-[13px] text-ink-2 transition after:absolute after:inset-x-2 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-ink after:transition-transform hover:text-ink hover:after:scale-x-100 sm:px-2 sm:py-2 sm:text-sm md:px-5 md:py-3 md:text-base"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* 右侧按钮 */}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-end sm:right-3 md:right-0 md:gap-5">
          <MobileNavRight
            avatarMediaUrl={siteSettings.avatarMediaUrl}
            avatarHref={avatarHref}
            userLoggedIn={!!user}
          />
          <div className="hidden items-center gap-2 sm:flex sm:gap-2 md:gap-5">
            <ThemeToggle className="shrink-0" />
            {siteSettings.avatarMediaUrl ? (
              <Link
                href={avatarHref}
                className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge md:h-12 md:w-12"
                aria-label={user ? "进入后台" : "查看简历"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={siteSettings.avatarMediaUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ filter: "var(--png-filter)" }}
                />
              </Link>
            ) : (
              <Link
                href={avatarHref}
                className="grid h-8 w-12 shrink-0 place-items-center justify-end md:h-16 md:w-28"
                aria-label={user ? "进入后台" : "查看简历"}
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
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
