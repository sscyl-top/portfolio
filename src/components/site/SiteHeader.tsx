import Image from "next/image";
import Link from "next/link";

import { siteSettings as staticSiteSettings } from "@/data/portfolio";
import type { PublicSiteSettings } from "@/lib/cms/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const defaultSiteSettings: PublicSiteSettings = {
  ctaCardScale: 1,
  ctaCardOffsetX: 0,
  ctaCardOffsetY: 0,
  ctaFigureScale: 1,
  ctaFigureOffsetX: 0,
  ctaFigureOffsetY: 0,
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
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-edge-2 bg-[var(--glass-nav)] backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)]">
      <nav className="mx-auto grid h-14 max-w-[1420px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 md:h-24 md:grid-cols-[1fr_auto_1fr] md:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 md:gap-4"
          aria-label={`${siteSettings.name} 首页`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg sm:h-9 sm:w-9 md:h-12 md:w-12">
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
                className="nav-logo-placeholder h-6 w-6 rounded-md md:h-7 md:w-7"
              />
            )}
          </span>
          <span className="relative hidden h-8 min-w-0 sm:flex sm:h-9 md:h-12">
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

        <div className="justify-self-center md:justify-self-center">
          <div className="flex items-center gap-0 sm:gap-1">
            {siteSettings.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="relative px-2 py-2 text-xs text-ink-2 transition after:absolute after:inset-x-3 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-ink after:transition-transform hover:text-ink hover:after:scale-x-100 sm:px-3 sm:text-sm md:px-5 md:py-3 md:text-base"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3 md:gap-5">
          <ThemeToggle className="shrink-0" />
          {siteSettings.avatarMediaUrl ? (
          <Link
            href={avatarHref}
            className="hidden grid place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge h-8 w-8 shrink-0 sm:h-9 sm:w-9 md:h-12 md:w-12 sm:grid"
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
            className="hidden h-8 w-12 place-items-center justify-end shrink-0 sm:grid sm:h-9 sm:w-14 md:h-16 md:w-28"
            aria-label={user ? "进入后台" : "查看简历"}
          >
            <Image
              src="/brand/infinite-progress-logo.svg"
              alt="无限进步"
              width={120}
              height={30}
              className="h-auto w-[2.5rem] shrink-0 sm:w-[3rem] md:w-36"
              priority
              style={{ filter: "var(--png-filter)" }}
            />
          </Link>
        )}
        </div>
      </nav>
    </header>
  );
}
