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
      <nav className="mx-auto grid h-14 max-w-[1420px] grid-cols-[1fr_auto_1fr] items-center px-3 md:h-24 md:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-4"
          aria-label={`${siteSettings.name} 首页`}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg md:h-12 md:w-12">
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
          <span className="hidden h-10 min-w-0 flex-col items-start justify-between sm:flex md:h-12">
            {siteSettings.nameMediaUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={siteSettings.nameMediaUrl}
                  alt={siteSettings.name}
                  className="block h-4 max-h-4 w-auto max-w-[120px] object-contain md:h-5 md:max-h-5 md:max-w-[150px]"
                  style={{ filter: "var(--png-filter)" }}
                />
                <span className="block truncate font-mono text-xs text-ink-3 md:text-sm">
                  {siteSettings.title}
                </span>
              </>
            ) : (
              <>
                <span className="block truncate text-base font-semibold tracking-[0.18em] text-ink">
                  {siteSettings.name}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-ink-3">
                  {siteSettings.title}
                </span>
              </>
            )}
          </span>
        </Link>

        <div className="justify-self-center">
          <div className="flex items-center gap-1">
            {siteSettings.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="relative px-3 py-2 text-sm text-ink-2 transition after:absolute after:inset-x-4 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-ink after:transition-transform hover:text-ink hover:after:scale-x-100 md:px-5 md:py-3 md:text-base"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 justify-self-end">
          <ThemeToggle />
          {siteSettings.avatarMediaUrl ? (
          <Link
            href={avatarHref}
            className="grid place-items-center overflow-hidden rounded-full border border-edge-2 bg-surface-2 transition hover:border-edge h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12"
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
            className="grid h-10 w-16 place-items-center place-self-end sm:h-12 sm:w-20 md:h-16 md:w-28"
            aria-label={user ? "进入后台" : "查看简历"}
          >
            <Image
              src="/brand/infinite-progress-logo.svg"
              alt="无限进步"
              width={120}
              height={30}
              className="h-auto w-[4rem] sm:w-24 md:w-36"
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
